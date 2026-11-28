"""API-level verification for Issue #47 authentication and Insights V2."""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.storage import storage

client = TestClient(app)


def _issue_session() -> tuple[str, dict[str, str]]:
    response = client.post("/api/sessions")
    assert response.status_code == 201
    assert "no-store" in response.headers.get("cache-control", "").lower()
    data = response.json()
    assert data["token_type"] == "Bearer"
    session_id = data["session_id"]
    headers = {
        "Authorization": f"Bearer {session_id}.{data['session_secret']}"
    }
    return session_id, headers


def _add_checkin(
    session_id: str,
    timestamp: datetime,
    *,
    mood: int,
    stress: int = 2,
    sleep_hours: float = 7.5,
) -> None:
    storage.add_checkin(
        session_id,
        mood=mood,
        stress=stress,
        sleep_hours=sleep_hours,
        route="LOW",
        timestamp=timestamp.isoformat(),
    )


def test_insights_v2_rejects_unissued_and_client_asserted_sessions():
    session_id, headers = _issue_session()

    try:
        assert client.get("/api/insights/v2").status_code == 401
        assert (
            client.get(
                "/api/insights/v2", headers={"X-Session-ID": session_id}
            ).status_code
            == 401
        )
        assert client.get("/api/insights/v2", headers=headers).status_code == 200
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_insights_v2_rotation_and_revocation_invalidate_old_credentials():
    session_id, headers = _issue_session()

    try:
        rotated = client.post("/api/sessions/rotate", headers=headers)
        assert rotated.status_code == 200
        rotated_data = rotated.json()
        rotated_headers = {
            "Authorization": (
                f"Bearer {session_id}.{rotated_data['session_secret']}"
            )
        }

        assert client.get("/api/insights/v2", headers=headers).status_code == 401
        assert client.get("/api/insights/v2", headers=rotated_headers).status_code == 200

        revoked = client.post("/api/sessions/revoke", headers=rotated_headers)
        assert revoked.status_code == 200
        assert client.get("/api/insights/v2", headers=rotated_headers).status_code == 401
    finally:
        storage.delete_all_data(session_id)


def test_insights_v2_rejects_expired_bearer_credentials():
    session_id, headers = _issue_session()

    try:
        connection = storage._get_connection()
        expired_at = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()
        with connection:
            connection.execute(
                "UPDATE session_credentials SET expires_at = ? WHERE session_id = ?",
                (expired_at, session_id),
            )

        assert client.get("/api/insights/v2", headers=headers).status_code == 401
    finally:
        storage.delete_all_data(session_id)


def test_insights_v2_is_session_scoped_and_never_exposes_reflections_or_calls_ai():
    session_a, headers_a = _issue_session()
    session_b, headers_b = _issue_session()
    reflection = "private reflection that must never appear in analytics"
    guidance = {
        "message": "A supportive response.",
        "suggestion_chips": [],
        "generated_by_ai": False,
        "fallback_used": True,
    }

    try:
        with patch(
            "app.routers.checkin.generate_supportive_guidance",
            return_value=guidance,
        ) as guidance_generator:
            checkin = client.post(
                "/api/checkin",
                headers=headers_a,
                json={
                    "mood": 4,
                    "stress": 2,
                    "sleep_hours": 8,
                    "reflection": reflection,
                    "consent_ai_processing": True,
                },
            )
            assert checkin.status_code == 200
            assert guidance_generator.call_count == 1
            assert reflection not in checkin.text

            insights_a = client.get("/api/insights/v2", headers=headers_a)
            insights_b = client.get("/api/insights/v2", headers=headers_b)
            assert insights_a.status_code == insights_b.status_code == 200
            assert insights_a.json()["check_in_count"] == 1
            assert insights_b.json()["check_in_count"] == 0
            assert reflection not in insights_a.text
            assert reflection not in insights_b.text
            assert guidance_generator.call_count == 1
    finally:
        storage.delete_all_data(session_a)
        storage.delete_all_data(session_b)


def test_insights_v2_api_filters_calendar_windows_and_uses_utc_fallback():
    session_id, headers = _issue_session()
    now = datetime.now(UTC).replace(hour=12, minute=0, second=0, microsecond=0)

    try:
        for days_ago, mood in ((2, 2), (10, 3), (20, 4)):
            _add_checkin(
                session_id,
                now - timedelta(days=days_ago),
                mood=mood,
            )

        counts = {}
        for days in (7, 14, 30):
            response = client.get(
                f"/api/insights/v2?days={days}&timezone=Asia%2FKolkata",
                headers=headers,
            )
            assert response.status_code == 200
            counts[days] = response.json()["check_in_count"]
            assert response.json()["timezone"] == "Asia/Kolkata"

        assert counts == {7: 1, 14: 2, 30: 3}

        fallback = client.get(
            "/api/insights/v2?days=30&timezone=Not%2FA_Real_Zone",
            headers=headers,
        )
        assert fallback.status_code == 200
        assert fallback.json()["timezone"] == "UTC"
        assert fallback.json()["check_in_count"] == 3
    finally:
        storage.delete_all_data(session_id)


def test_insights_v2_comparison_and_pattern_gates_require_enough_data():
    session_id, headers = _issue_session()
    now = datetime.now(UTC).replace(hour=12, minute=0, second=0, microsecond=0)

    try:
        for days_ago, mood in (
            (1, 4),
            (2, 4),
            (3, 2),
            (4, 2),
            (8, 2),
            (9, 2),
            (10, 2),
        ):
            _add_checkin(
                session_id,
                now - timedelta(days=days_ago),
                mood=mood,
            )

        response = client.get(
            "/api/insights/v2?days=7&timezone=UTC",
            headers=headers,
        )
        assert response.status_code == 200
        result = response.json()
        assert result["comparison"]["state"] == "ready"
        assert result["comparison"]["current_check_in_count"] == 4
        assert result["comparison"]["previous_check_in_count"] == 3
        assert result["pattern_highlights"]

        storage.delete_all_data(session_id)
        session_id, headers = _issue_session()
        for days_ago, mood in ((1, 4), (2, 4), (3, 4)):
            _add_checkin(
                session_id,
                now - timedelta(days=days_ago),
                mood=mood,
            )

        insufficient = client.get(
            "/api/insights/v2?days=7&timezone=UTC",
            headers=headers,
        )
        assert insufficient.status_code == 200
        assert insufficient.json()["comparison"]["state"] == "not_enough_data"
        assert insufficient.json()["pattern_highlights"] == []
    finally:
        storage.delete_all_data(session_id)
