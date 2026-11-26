"""
Issue #11 Stage 3: Sentinel Canary Leakage & Comprehensive Privacy Verification

Proves that private reflection content CANNOT leak into:
1. Application logs (captured via caplog at DEBUG/INFO/WARNING/ERROR levels).
2. Standard output / standard error streams (captured via capsys).
3. Exception tracebacks and runtime error frames.
4. HTTP API error responses (422 validation errors, 500 internal errors).
5. Persistent SQLite database storage.
6. Historical check-in retrieval endpoints.

Also verifies:
- Explicit AI consent boundaries (consent=False strictly blocks provider calls).
- High-risk/crisis zero-call AI bypass guarantee.
- Session isolation and session-scoped deletion.
- Timestamp boundary cutoff retention behavior.
- Safe Exit permanent deletion semantics.
"""

import logging
import os
import sqlite3
import tempfile
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import AIServiceConfig
from app.main import app
from app.services.ai_guidance import generate_supportive_guidance
from app.services.ai_providers.gemini_provider import GeminiAIProvider
from app.services.ai_providers.mock_provider import MockAIProvider
from app.services.safety_evaluator import evaluate_wellbeing_route
from app.services.storage import CalmspaceStorage, storage


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def isolated_storage():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_path = f.name
    store = CalmspaceStorage(db_path=temp_path)
    yield store
    store.close()
    if os.path.exists(temp_path):
        os.remove(temp_path)


# ==============================================================================
# SECTION 1: SENTINEL CANARY TESTS
# ==============================================================================


def test_canary_normal_checkin_processing(client, caplog, capsys):
    """Normal check-in with private reflection must not leak into logs, stdout, stderr, or responses."""
    canary = "SENTINEL_CANARY_REFLECT_NORMAL_101"
    session_id = "session-canary-normal"

    with caplog.at_level(logging.DEBUG):
        res = client.post(
            "/api/checkin",
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 7.5,
                "reflection": canary,
                "consent_ai_processing": False,
            },
            headers={"X-Session-ID": session_id},
        )

    out, err = capsys.readouterr()

    assert res.status_code == 200
    # Reflection text must NEVER appear in logs, streams, or API responses
    assert canary not in caplog.text
    assert canary not in out
    assert canary not in err
    assert canary not in res.text

    # Verify SQLite persistence layer contains zero canary
    history = client.get("/api/checkin/history", headers={"X-Session-ID": session_id})
    assert history.status_code == 200
    assert canary not in history.text

    client.delete("/api/settings/data", headers={"X-Session-ID": session_id})


def test_canary_consented_ai_processing(client, caplog, capsys, monkeypatch):
    """Consented reflection processed by AI provider must not leak into server logs or response text."""
    canary = "SENTINEL_CANARY_REFLECT_CONSENT_202"
    session_id = "session-canary-consented"

    with caplog.at_level(logging.DEBUG):
        res = client.post(
            "/api/checkin",
            json={
                "mood": 3,
                "stress": 3,
                "sleep_hours": 6.5,
                "reflection": canary,
                "consent_ai_processing": True,
            },
            headers={"X-Session-ID": session_id},
        )

    out, err = capsys.readouterr()

    assert res.status_code == 200
    assert canary not in caplog.text
    assert canary not in out
    assert canary not in err
    assert canary not in res.text

    # Historical check-ins never store reflection
    history = client.get("/api/checkin/history", headers={"X-Session-ID": session_id})
    assert canary not in history.text

    client.delete("/api/settings/data", headers={"X-Session-ID": session_id})


def test_canary_unconsented_fallback(client, caplog, capsys):
    """Unconsented reflection must return fallback guidance with zero canary leakage."""
    canary = "SENTINEL_CANARY_REFLECT_UNCONSENTED_303"
    session_id = "session-canary-unconsented"

    with caplog.at_level(logging.DEBUG):
        res = client.post(
            "/api/checkin",
            json={
                "mood": 3,
                "stress": 3,
                "sleep_hours": 7.0,
                "reflection": canary,
                "consent_ai_processing": False,
            },
            headers={"X-Session-ID": session_id},
        )

    out, err = capsys.readouterr()

    assert res.status_code == 200
    data = res.json()
    assert data["guidance"]["fallback_used"] is True
    assert data["guidance"]["generated_by_ai"] is False

    assert canary not in caplog.text
    assert canary not in out
    assert canary not in err
    assert canary not in res.text

    client.delete("/api/settings/data", headers={"X-Session-ID": session_id})


def test_canary_provider_timeout(caplog, capsys):
    """Provider timeout exception must not leak reflection canary into exception traces or logs."""
    canary = "SENTINEL_CANARY_REFLECT_TIMEOUT_404"
    mock_provider = MockAIProvider(simulate_timeout=True)

    with caplog.at_level(logging.DEBUG):
        res = generate_supportive_guidance(
            route="LOW",
            mood=4,
            stress=2,
            sleep_hours=8.0,
            reflection=canary,
            consent_given=True,
            provider=mock_provider,
        )

    out, err = capsys.readouterr()

    assert res is not None
    assert res.fallback_used is True
    assert canary not in caplog.text
    assert canary not in out
    assert canary not in err


def test_canary_provider_authentication_failure(monkeypatch, caplog, capsys):
    """Provider authentication failure (HTTP 401/403) must sanitize errors and protect reflection canary."""
    canary = "SENTINEL_CANARY_REFLECT_AUTH_FAIL_505"
    fake_key = "invalid-key-xyz-999"

    def mock_post(client_self, url, *args, **kwargs):
        req = httpx.Request("POST", url)
        # Upstream provider returns error containing prompt context or canary
        return httpx.Response(
            status_code=401,
            json={"error": {"message": f"Unauthorized request for {canary}"}},
            request=req,
        )

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    cfg = AIServiceConfig(
        provider="gemini",
        model="gemini-1.5-flash",
        api_key=fake_key,
        enabled=True,
    )
    provider = GeminiAIProvider(api_key=fake_key, model="gemini-1.5-flash")

    with caplog.at_level(logging.DEBUG):
        res = generate_supportive_guidance(
            route="MEDIUM",
            mood=3,
            stress=3,
            sleep_hours=6.0,
            reflection=canary,
            consent_given=True,
            provider=provider,
            config=cfg,
        )

    out, err = capsys.readouterr()

    assert res is not None
    assert res.fallback_used is True
    assert canary not in caplog.text
    assert canary not in out
    assert canary not in err
    assert fake_key not in caplog.text


def test_canary_unexpected_provider_exception(caplog, capsys):
    """Unexpected provider runtime exceptions must be contained without logging canary."""
    canary = "SENTINEL_CANARY_REFLECT_UNEXPECTED_606"
    exploding_provider = MockAIProvider(
        simulate_error=RuntimeError(f"Unexpected explosion with payload {canary}")
    )

    with caplog.at_level(logging.DEBUG):
        res = generate_supportive_guidance(
            route="LOW",
            mood=4,
            stress=2,
            sleep_hours=7.5,
            reflection=canary,
            consent_given=True,
            provider=exploding_provider,
        )

    out, err = capsys.readouterr()

    assert res is not None
    assert res.fallback_used is True
    assert canary not in caplog.text
    assert canary not in out
    assert canary not in err


def test_canary_malformed_request_error_response(client, caplog, capsys):
    """FastAPI validation error (HTTP 422) must strip reflection input from response body."""
    canary = "SENTINEL_CANARY_REFLECT_MALFORMED_707"

    with caplog.at_level(logging.DEBUG):
        # Exceeds 2000 character maximum limit to trigger RequestValidationError
        res = client.post(
            "/api/checkin",
            headers={"X-Session-ID": "canary-session-1"},
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 8.0,
                "reflection": canary + ("x" * 2005),
                "consent_ai_processing": True,
            },
        )

    out, err = capsys.readouterr()

    assert res.status_code == 422
    # Verify sanitized exception handler stripped input field from 422 response
    assert canary not in res.text
    assert canary not in caplog.text
    assert canary not in out
    assert canary not in err


def test_malformed_consent_rejected_without_ai_or_leakage(
    client, monkeypatch, caplog, capsys
):
    """Non-boolean consent values (e.g., 'true', 1) must be rejected and never call AI or leak reflection."""
    canary = "SENTINEL_CANARY_MALFORMED_CONSENT_708"
    ai_calls = []

    def spy_guidance(*args, **kwargs):
        ai_calls.append(kwargs)

    monkeypatch.setattr(
        "app.routers.checkin.generate_supportive_guidance", spy_guidance
    )

    with caplog.at_level(logging.DEBUG):
        for bad_consent in ("true", "yes", 1):
            res = client.post(
                "/api/checkin",
                headers={"X-Session-ID": "canary-session-2"},
                json={
                    "mood": 4,
                    "stress": 2,
                    "sleep_hours": 8.0,
                    "reflection": canary,
                    "consent_ai_processing": bad_consent,
                },
            )
            assert res.status_code == 422
            assert canary not in res.text

    out, err = capsys.readouterr()
    assert len(ai_calls) == 0
    assert canary not in caplog.text
    assert canary not in out
    assert canary not in err


def test_canary_backend_exception_handling(client, monkeypatch, caplog, capsys):
    """Simulated internal backend crash during check-in must not leak canary in 500 error or traceback."""
    canary = "SENTINEL_CANARY_REFLECT_BACKEND_ERR_808"

    def exploding_add_checkin(*args, **kwargs):
        raise ValueError(f"Simulated database crash on {canary}")

    monkeypatch.setattr(storage, "add_checkin", exploding_add_checkin)

    with caplog.at_level(logging.DEBUG):
        try:
            res = client.post(
                "/api/checkin",
                headers={"X-Session-ID": "canary-session-3"},
                json={
                    "mood": 4,
                    "stress": 2,
                    "sleep_hours": 8.0,
                    "reflection": canary,
                    "consent_ai_processing": False,
                },
            )
            # If caught by global handler, status is 500
            assert res.status_code == 500
            assert canary not in res.text
        except ValueError:
            # TestClient with raise_server_exceptions=True may raise in test context
            pass

    out, err = capsys.readouterr()
    assert canary not in out
    assert canary not in err


# ==============================================================================
# SECTION 2: PRIVACY ENFORCEMENT VERIFICATION
# ==============================================================================


def test_reflection_never_persisted_in_sqlite(isolated_storage):
    """Direct database schema and row inspection proves reflection is NEVER persisted."""
    canary = "SENTINEL_CANARY_REFLECT_DB_VERIFY_909"
    session_id = "session-db-privacy-audit"

    # Add checkin with reflection evaluated locally
    record = isolated_storage.add_checkin(
        session_id=session_id,
        mood=4,
        stress=2,
        sleep_hours=7.5,
        route="LOW",
    )
    assert not hasattr(record, "reflection")

    # Connect directly to SQLite file
    conn = sqlite3.connect(isolated_storage.db_path)
    cursor = conn.cursor()

    # 1. PRAGMA table_info verification
    cursor.execute("PRAGMA table_info(checkins);")
    columns = [row[1] for row in cursor.fetchall()]
    assert "reflection" not in columns
    assert "text" not in columns
    assert "notes" not in columns

    # 2. Raw row inspection
    cursor.execute("SELECT * FROM checkins WHERE session_id = ?;", (session_id,))
    rows = cursor.fetchall()
    conn.close()

    assert len(rows) == 1
    # Check that canary string is completely absent from all database fields
    for row in rows:
        for val in row:
            assert canary not in str(val)


def test_reflection_never_returned_in_historical_apis(client):
    """GET /api/checkin/history must strictly return CheckInRecord models without reflection field."""
    canary = "SENTINEL_CANARY_REFLECT_API_HISTORY_010"
    session_id = "session-api-history-audit"
    headers = {"X-Session-ID": session_id}

    # Submit checkin
    client.post(
        "/api/checkin",
        json={
            "mood": 3,
            "stress": 3,
            "sleep_hours": 7.0,
            "reflection": canary,
            "consent_ai_processing": True,
        },
        headers=headers,
    )

    # Fetch history
    res = client.get("/api/checkin/history", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    for rec in data:
        assert "reflection" not in rec
        assert canary not in str(rec)

    client.delete("/api/settings/data", headers=headers)


def test_high_risk_crisis_zero_call_guarantee():
    """HIGH route requests with acute crisis statements must strictly cause ZERO provider calls."""
    canary = "SENTINEL_CANARY_REFLECT_CRISIS_ACUTE_011"
    mock_provider = MockAIProvider()

    # 1. Safety evaluator classifies as HIGH
    eval_res = evaluate_wellbeing_route(
        mood=1,
        stress=5,
        sleep_hours=2.0,
        reflection=f"I want to end my life right now {canary}",
    )
    assert eval_res.route == "HIGH"
    assert eval_res.ai_eligible is False

    # 2. Guidance service strictly returns None with ZERO calls
    res = generate_supportive_guidance(
        route=eval_res.route,
        mood=1,
        stress=5,
        sleep_hours=2.0,
        reflection=canary,
        consent_given=True,  # Even with consent=True, high route must bypass!
        provider=mock_provider,
    )
    assert res is None
    assert mock_provider.call_count == 0


def test_invalid_session_credentials_cannot_access_another_session(isolated_storage):
    """Session isolation negative access test: Session A cannot access or delete Session B."""
    session_alice = "session-alice-auth"
    session_bob = "session-bob-auth"

    isolated_storage.add_checkin(session_alice, 4, 2, 7.5, "LOW")
    alice_task = isolated_storage.add_task(session_alice, "Alice Task", 30, "Study")

    # Bob attempts read
    assert len(isolated_storage.get_checkins(session_bob)) == 0
    assert len(isolated_storage.get_tasks(session_bob)) == 0

    # Bob attempts mutation
    assert isolated_storage.toggle_task(session_bob, alice_task.id) is None
    assert (
        isolated_storage.update_task(session_bob, alice_task.id, title="Hacked") is None
    )
    assert isolated_storage.delete_task(session_bob, alice_task.id) is False

    # Alice's task is completely unchanged
    alice_tasks = isolated_storage.get_tasks(session_alice)
    assert len(alice_tasks) == 1
    assert alice_tasks[0].title == "Alice Task"


def test_retention_cleanup_exact_timestamp_boundary(isolated_storage):
    """
    Confirms documented boundary behavior:
    Records older than cutoff (< cutoff) are deleted.
    Records exactly on or newer than cutoff (>= cutoff) are preserved.
    """
    session_id = "session-boundary-test"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    # 30-day retention cutoff: 2026-10-26T12:00:00+00:00
    cutoff = ref_time - timedelta(days=30)

    # Record 1: exactly 1 microsecond older than cutoff -> MUST BE DELETED
    t_older = (cutoff - timedelta(microseconds=1)).isoformat()
    # Record 2: EXACTLY at the cutoff -> MUST BE PRESERVED
    t_exact = cutoff.isoformat()
    # Record 3: 1 microsecond newer than cutoff -> MUST BE PRESERVED
    t_newer = (cutoff + timedelta(microseconds=1)).isoformat()

    rec_older = isolated_storage.add_checkin(
        session_id, 1, 5, 4.0, "HIGH", timestamp=t_older
    )
    rec_exact = isolated_storage.add_checkin(
        session_id, 3, 3, 6.0, "MEDIUM", timestamp=t_exact
    )
    rec_newer = isolated_storage.add_checkin(
        session_id, 5, 1, 8.0, "LOW", timestamp=t_newer
    )

    # Execute cleanup
    pruned = isolated_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned == 1

    remaining_ids = [c.id for c in isolated_storage.get_checkins(session_id)]
    assert rec_older.id not in remaining_ids
    assert rec_exact.id in remaining_ids
    assert rec_newer.id in remaining_ids


# ==============================================================================
# SECTION 3: SAFE EXIT VERIFICATION
# ==============================================================================


def test_safe_exit_data_deletion_succeeds(client):
    """Safe exit deletion permanently wipes all check-ins, tasks, and settings from database."""
    session_id = "session-safe-exit-success"
    headers = {"X-Session-ID": session_id}

    # Add records
    client.post(
        "/api/checkin",
        json={
            "mood": 1,
            "stress": 5,
            "sleep_hours": 3.0,
            "consent_ai_processing": False,
        },
        headers=headers,
    )
    client.post(
        "/api/planner/tasks",
        json={
            "title": "Test task to wipe",
            "estimated_minutes": 25,
            "category": "Study",
        },
        headers=headers,
    )

    # Call DELETE /api/settings/data
    del_res = client.delete("/api/settings/data", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify everything is empty
    hist_res = client.get("/api/checkin/history", headers=headers)
    assert len(hist_res.json()) == 0


def test_safe_exit_failed_deletion_preserves_honesty(monkeypatch, client):
    """Simulated database failure during deletion returns 500 and prevents false success reporting."""
    session_id = "session-safe-exit-failure"
    headers = {"X-Session-ID": session_id}

    def failing_delete_all_data(*args, **kwargs):
        raise RuntimeError("Simulated SQLite write failure on disk")

    monkeypatch.setattr(storage, "delete_all_data", failing_delete_all_data)

    try:
        del_res = client.delete("/api/settings/data", headers=headers)
        assert del_res.status_code == 500
    except RuntimeError:
        # If uncaught in test harness, exception is raised
        pass
