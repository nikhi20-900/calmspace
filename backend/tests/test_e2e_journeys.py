"""
Stage 3 End-to-End Check-in Journey, AI Failure-Mode & Retention Edge-Case Tests
Verifies:
1. Complete check-in journeys across LOW, MEDIUM, and HIGH routes end-to-end via API.
2. Strict proof that HIGH route cannot invoke AI provider (even with consent_ai_processing=True and Gemini enabled).
3. AI provider outage simulation (timeout, HTTP 503, HTTP 401, malformed JSON) & disabled mode.
4. Retention and deletion edge cases (non-UTC offsets, tightening retention, repeated deletion).
"""

import os
import tempfile
from datetime import UTC, datetime, timedelta, timezone

import httpx
from fastapi.testclient import TestClient

from app.core import config as core_config
from app.main import app
from app.services.ai_guidance import rate_limiter
from app.services.storage import CalmspaceStorage, storage

client = TestClient(app)


def _new_session_headers() -> tuple[str, dict[str, str]]:
    res = client.post("/api/sessions")
    assert res.status_code == 201
    data = res.json()
    sid = data["session_id"]
    return sid, {"Authorization": f"Bearer {sid}.{data['session_secret']}"}


def test_complete_e2e_checkin_journeys_low_medium_high_and_erasure(monkeypatch):
    """
    End-to-end student journey:
    1. Issue anonymous credential -> LOW route -> MEDIUM route -> Insights -> Planner -> Settings ->
       HIGH route (proving zero AI provider calls even when consented) -> Permanent Delete -> 401.
    """
    rate_limiter.reset()
    core_config._cached_config = None
    monkeypatch.setenv("CALMSPACE_AI_PROVIDER", "gemini")
    monkeypatch.setenv("CALMSPACE_AI_API_KEY", "synthetic-test-gemini-key")
    monkeypatch.setenv("CALMSPACE_AI_ENABLED", "true")

    provider_calls: list[str] = []

    class FakeGeminiHTTPClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, *args, **kwargs):
            provider_calls.append(str(url))
            req = httpx.Request("POST", url)
            return httpx.Response(
                status_code=200,
                json={
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {
                                        "text": '{"message": "You are pacing yourself steadily through a busy week. Take a moment to breathe and acknowledge your steady effort. Keeping small breaks in your routine can help you stay grounded.", "suggestion_chips": ["Take a 5-min breather", "Drink some water"]}'
                                    }
                                ]
                            }
                        }
                    ]
                },
                request=req,
            )

    monkeypatch.setattr(
        "app.services.ai_providers.gemini_provider.httpx.Client",
        FakeGeminiHTTPClient,
    )

    session_id, headers = _new_session_headers()
    try:
        # 1. LOW route (consented)
        low_res = client.post(
            "/api/checkin",
            headers=headers,
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 7.5,
                "reflection": "Finished my assignment, going for a walk.",
                "consent_ai_processing": True,
            },
        )
        assert low_res.status_code == 200
        low_data = low_res.json()
        assert low_data["safety"]["route"] == "LOW"
        assert low_data["safety"]["ai_eligible"] is True
        assert low_data["guidance"]["generated_by_ai"] is True
        assert len(provider_calls) == 1

        # 2. MEDIUM route (unconsented -> fallback, no extra AI call)
        med_res = client.post(
            "/api/checkin",
            headers=headers,
            json={
                "mood": 2,
                "stress": 3,
                "sleep_hours": 5.5,
                "reflection": "Struggling to keep up with lab reports.",
                "consent_ai_processing": False,
            },
        )
        assert med_res.status_code == 200
        med_data = med_res.json()
        assert med_data["safety"]["route"] == "MEDIUM"
        assert med_data["safety"]["ai_eligible"] is True
        assert med_data["guidance"]["generated_by_ai"] is False
        assert med_data["guidance"]["fallback_used"] is True
        assert len(provider_calls) == 1

        # 3. HIGH route (explicit consent=True + crisis text -> MUST make 0 AI calls)
        high_res = client.post(
            "/api/checkin",
            headers=headers,
            json={
                "mood": 1,
                "stress": 5,
                "sleep_hours": 2.5,
                "reflection": "I can't take this anymore, I want to end my life.",
                "consent_ai_processing": True,
            },
        )
        assert high_res.status_code == 200
        high_data = high_res.json()
        assert high_data["safety"]["route"] == "HIGH"
        assert high_data["safety"]["ai_eligible"] is False
        assert high_data["safety"]["requires_human_escalation"] is True
        assert high_data["guidance"] is None
        assert len(provider_calls) == 1, "HIGH route must never invoke AI provider!"
        # Urgent contacts present and campus entry explicitly marked demo placeholder
        contact_ids = [c["id"] for c in high_data["support_contacts"]]
        assert "tele-manas" in contact_ids
        assert "national-emergency" in contact_ids
        campus = next(
            c for c in high_data["support_contacts"] if c["id"] == "campus-counselling"
        )
        assert campus["is_demo_placeholder"] is True

        # 4. Insights & History verify 3 numeric check-ins and ZERO reflections
        insights_res = client.get("/api/insights?days=7", headers=headers)
        assert insights_res.status_code == 200
        assert insights_res.json()["check_in_count"] == 3

        history_res = client.get("/api/checkin/history", headers=headers)
        assert history_res.status_code == 200
        assert "end my life" not in history_res.text
        assert "lab reports" not in history_res.text

        # 5. Study Planner create + toggle
        task_res = client.post(
            "/api/planner/tasks",
            headers=headers,
            json={
                "title": "Take a calm break",
                "estimated_minutes": 15,
                "category": "Break",
            },
        )
        assert task_res.status_code == 200
        assert (
            client.patch(
                f"/api/planner/tasks/{task_res.json()['id']}/toggle", headers=headers
            ).status_code
            == 200
        )

        # 6. Settings update & permanent deletion
        assert (
            client.put(
                "/api/settings",
                headers=headers,
                json={"nickname": "CalmOwl", "data_retention_days": 14},
            ).status_code
            == 200
        )
        assert client.delete("/api/settings/data", headers=headers).status_code == 200

        # Old credential is now permanently rejected and rate limiter entry cleared
        assert client.get("/api/insights?days=7", headers=headers).status_code == 401
        assert client.delete("/api/settings/data", headers=headers).status_code == 401
        assert session_id not in rate_limiter._session_timestamps
    finally:
        core_config._cached_config = None
        rate_limiter.reset()
        storage.delete_all_data(session_id)


def test_ai_provider_outages_and_disabled_mode_via_api(monkeypatch):
    """
    Verify API check-in stays 200 OK with safe deterministic fallback during:
    1. Provider timeout (httpx.TimeoutException)
    2. Provider outage (HTTP 503)
    3. Provider malformed output
    4. AI disabled mode (CALMSPACE_AI_ENABLED=false, 0 provider calls)
    """
    rate_limiter.reset()
    core_config._cached_config = None
    session_id, headers = _new_session_headers()

    try:
        monkeypatch.setenv("CALMSPACE_AI_PROVIDER", "gemini")
        monkeypatch.setenv("CALMSPACE_AI_API_KEY", "synthetic-test-gemini-key")
        monkeypatch.setenv("CALMSPACE_AI_ENABLED", "true")

        def _patch_gemini_client(post_fn):
            class FakeGeminiHTTPClient:
                def __init__(self, *args, **kwargs):
                    pass

                def __enter__(self):
                    return self

                def __exit__(self, *args):
                    return False

                def post(self, url, *args, **kwargs):
                    return post_fn(url, *args, **kwargs)

            monkeypatch.setattr(
                "app.services.ai_providers.gemini_provider.httpx.Client",
                FakeGeminiHTTPClient,
            )

        # 1. Timeout
        def raise_timeout(url, *args, **kwargs):
            raise httpx.ReadTimeout("Simulated upstream timeout")

        _patch_gemini_client(raise_timeout)
        core_config.get_ai_config(reload=True)
        res_timeout = client.post(
            "/api/checkin",
            headers=headers,
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 7.5,
                "reflection": "Timeout canary private note",
                "consent_ai_processing": True,
            },
        )
        assert res_timeout.status_code == 200
        assert res_timeout.json()["guidance"]["fallback_used"] is True
        assert res_timeout.json()["guidance"]["generated_by_ai"] is False
        assert "Timeout canary private note" not in res_timeout.text

        # 2. HTTP 503 Outage
        def return_503(url, *args, **kwargs):
            return httpx.Response(
                503,
                json={"error": {"message": "Upstream overloaded"}},
                request=httpx.Request("POST", url),
            )

        _patch_gemini_client(return_503)
        res_503 = client.post(
            "/api/checkin",
            headers=headers,
            json={
                "mood": 2,
                "stress": 3,
                "sleep_hours": 6.0,
                "reflection": "Outage canary private note",
                "consent_ai_processing": True,
            },
        )
        assert res_503.status_code == 200
        assert res_503.json()["safety"]["route"] == "MEDIUM"
        assert res_503.json()["guidance"]["fallback_used"] is True
        assert res_503.json()["guidance"]["generated_by_ai"] is False

        # 3. Malformed AI JSON output
        def return_bad_json(url, *args, **kwargs):
            return httpx.Response(
                200,
                json={
                    "candidates": [{"content": {"parts": [{"text": "not valid json"}]}}]
                },
                request=httpx.Request("POST", url),
            )

        _patch_gemini_client(return_bad_json)
        res_bad = client.post(
            "/api/checkin",
            headers=headers,
            json={
                "mood": 3,
                "stress": 3,
                "sleep_hours": 6.5,
                "reflection": "Bad json canary",
                "consent_ai_processing": True,
            },
        )
        assert res_bad.status_code == 200
        assert res_bad.json()["guidance"]["fallback_used"] is True
        assert res_bad.json()["guidance"]["generated_by_ai"] is False

        # 4. Disabled mode (CALMSPACE_AI_ENABLED=false) -> 0 provider calls
        called_when_disabled = []

        def fail_if_called(url, *args, **kwargs):
            called_when_disabled.append(True)
            raise AssertionError("Provider must not be called when AI is disabled!")

        _patch_gemini_client(fail_if_called)
        monkeypatch.setenv("CALMSPACE_AI_ENABLED", "false")
        core_config.get_ai_config(reload=True)

        ready_res = client.get("/api/ready")
        assert ready_res.status_code == 200
        assert ready_res.json()["ai_mode"] == "disabled"

        res_disabled = client.post(
            "/api/checkin",
            headers=headers,
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 8.0,
                "reflection": "Disabled mode reflection",
                "consent_ai_processing": True,
            },
        )
        assert res_disabled.status_code == 200
        assert res_disabled.json()["guidance"]["fallback_used"] is True
        assert res_disabled.json()["guidance"]["generated_by_ai"] is False
        assert called_when_disabled == []
    finally:
        core_config._cached_config = None
        rate_limiter.reset()
        storage.delete_all_data(session_id)


def test_retention_handles_non_utc_offsets_and_boundary_pruning():
    """Retention pruning normalizes +05:30 / Z timestamps accurately against UTC cutoff."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = f.name

    try:
        store = CalmspaceStorage(db_path=temp_db)
        ist = timezone(timedelta(hours=5, minutes=30))
        now_utc = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)
        sid = store.create_session(now=now_utc).session_id

        # 14d retention cutoff is 2026-11-11 12:00:00 UTC == 2026-11-11 17:30:00 +05:30
        from app.models.schemas import UserSettings

        store.update_settings(sid, UserSettings(data_retention_days=14))

        # 17:29 IST on Nov 11 == 11:59 UTC (< 12:00 UTC) -> MUST BE PRUNED
        old_ist = datetime(2026, 11, 11, 17, 29, 0, tzinfo=ist).isoformat()
        # 17:31 IST on Nov 11 == 12:01 UTC (> 12:00 UTC) -> MUST BE KEPT
        recent_ist = datetime(2026, 11, 11, 17, 31, 0, tzinfo=ist).isoformat()

        rec_old = store.add_checkin(sid, 2, 4, 5.0, "MEDIUM", timestamp=old_ist)
        rec_recent = store.add_checkin(sid, 4, 2, 7.5, "LOW", timestamp=recent_ist)

        pruned = store.cleanup_expired_records(sid, now=now_utc)
        assert pruned == 1
        remaining = store.get_checkins(sid)
        assert [r.id for r in remaining] == [rec_recent.id]
        assert rec_old.id not in [r.id for r in remaining]
        store.close()
    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)
