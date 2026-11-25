"""
Issue #11 Stage 2: Automated Backend Retention & Pruning Tests

Comprehensive verification covering:
1. Default 30-day retention.
2. 14-day retention window.
3. 30-day retention window.
4. 60-day retention window.
5. 90-day retention window.
6. Expired records are deleted permanently from the database.
7. Records within the retention window remain completely intact.
8. Cross-session isolation: Another session's records remain untouched.
9. Missing / unconfigured / invalid retention settings fall back safely to 30 days.
10. Repeated cleanup is safe (idempotent).
11. Concurrent or interrupted cleanup does not corrupt data (ACID integrity check).
12. Settings updates affect subsequent pruning (both in storage and across HTTP APIs).
"""

import concurrent.futures
import os
import sqlite3
import tempfile
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import UserSettings
from app.services.storage import CalmspaceStorage


@pytest.fixture
def temp_storage():
    """Provides a fresh isolated database file in a temp directory."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_path = f.name

    storage = CalmspaceStorage(db_path=temp_path)
    yield storage
    storage.close()
    if os.path.exists(temp_path):
        os.remove(temp_path)


# ------------------------------------------------------------------------------
# Test 1: Default 30-Day Retention
# ------------------------------------------------------------------------------
def test_retention_default_30_days(temp_storage):
    """Sessions without custom settings must prune records older than 30 days by default."""
    session_id = "session-default-retention"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    # Insert records at various relative offsets
    temp_storage.add_checkin(
        session_id, 4, 2, 7.5, "LOW", (ref_time - timedelta(days=10)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 3, 3, 6.0, "MEDIUM", (ref_time - timedelta(days=29)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 2, 4, 5.0, "MEDIUM", (ref_time - timedelta(days=31)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 1, 5, 4.0, "HIGH", (ref_time - timedelta(days=50)).isoformat()
    )

    # Verify 4 records before cleanup
    assert len(temp_storage.get_checkins(session_id)) == 4

    # Run cleanup with reference time
    pruned_count = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned_count == 2

    # Assert exactly records within 30 days remain (10d, 29d)
    remaining = temp_storage.get_checkins(session_id)
    assert len(remaining) == 2
    assert remaining[0].mood == 3  # 29 days ago
    assert remaining[1].mood == 4  # 10 days ago


# ------------------------------------------------------------------------------
# Test 2: 14-Day Retention Window
# ------------------------------------------------------------------------------
def test_retention_14_days(temp_storage):
    """Configuring 14-day retention prunes records older than 14 days."""
    session_id = "session-14d-retention"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    temp_storage.update_settings(session_id, UserSettings(data_retention_days=14))

    # Insert records
    temp_storage.add_checkin(
        session_id, 5, 1, 8.0, "LOW", (ref_time - timedelta(days=5)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 4, 2, 7.0, "LOW", (ref_time - timedelta(days=13)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 3, 3, 6.0, "MEDIUM", (ref_time - timedelta(days=15)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 2, 4, 5.0, "MEDIUM", (ref_time - timedelta(days=25)).isoformat()
    )

    pruned = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned == 2

    remaining = temp_storage.get_checkins(session_id)
    assert len(remaining) == 2
    assert remaining[0].mood == 4  # 13d
    assert remaining[1].mood == 5  # 5d


# ------------------------------------------------------------------------------
# Test 3: Explicit 30-Day Retention Window
# ------------------------------------------------------------------------------
def test_retention_30_days_explicit(temp_storage):
    """Explicitly saved 30-day retention behaves identically to default."""
    session_id = "session-30d-explicit"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    temp_storage.update_settings(session_id, UserSettings(data_retention_days=30))

    temp_storage.add_checkin(
        session_id, 4, 2, 7.5, "LOW", (ref_time - timedelta(days=25)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 2, 4, 5.0, "MEDIUM", (ref_time - timedelta(days=35)).isoformat()
    )

    pruned = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned == 1

    remaining = temp_storage.get_checkins(session_id)
    assert len(remaining) == 1
    assert remaining[0].mood == 4


# ------------------------------------------------------------------------------
# Test 4: 60-Day Retention Window
# ------------------------------------------------------------------------------
def test_retention_60_days(temp_storage):
    """Configuring 60-day retention keeps records up to 60 days."""
    session_id = "session-60d-retention"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    temp_storage.update_settings(session_id, UserSettings(data_retention_days=60))

    temp_storage.add_checkin(
        session_id, 4, 2, 7.5, "LOW", (ref_time - timedelta(days=20)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 3, 3, 6.5, "MEDIUM", (ref_time - timedelta(days=58)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 2, 4, 5.0, "MEDIUM", (ref_time - timedelta(days=62)).isoformat()
    )

    pruned = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned == 1

    remaining = temp_storage.get_checkins(session_id)
    assert len(remaining) == 2
    assert remaining[0].mood == 3  # 58d
    assert remaining[1].mood == 4  # 20d


# ------------------------------------------------------------------------------
# Test 5: 90-Day Retention Window
# ------------------------------------------------------------------------------
def test_retention_90_days(temp_storage):
    """Configuring 90-day retention keeps records up to 90 days."""
    session_id = "session-90d-retention"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    temp_storage.update_settings(session_id, UserSettings(data_retention_days=90))

    temp_storage.add_checkin(
        session_id, 5, 1, 8.0, "LOW", (ref_time - timedelta(days=45)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 4, 2, 7.0, "LOW", (ref_time - timedelta(days=88)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 1, 5, 4.0, "HIGH", (ref_time - timedelta(days=92)).isoformat()
    )

    pruned = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned == 1

    remaining = temp_storage.get_checkins(session_id)
    assert len(remaining) == 2
    assert remaining[0].mood == 4  # 88d
    assert remaining[1].mood == 5  # 45d


# ------------------------------------------------------------------------------
# Test 6 & 7: Expired Records Are Permanently Deleted & Valid Records Remain
# ------------------------------------------------------------------------------
def test_expired_records_permanently_deleted_and_valid_preserved(temp_storage):
    """Direct database inspection verifying hard deletion of expired rows and integrity of retained rows."""
    session_id = "session-sql-verification"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    old_rec = temp_storage.add_checkin(
        session_id,
        mood=2,
        stress=4,
        sleep_hours=5.5,
        route="MEDIUM",
        timestamp=(ref_time - timedelta(days=35)).isoformat(),
    )
    valid_rec = temp_storage.add_checkin(
        session_id,
        mood=4,
        stress=2,
        sleep_hours=8.0,
        route="LOW",
        timestamp=(ref_time - timedelta(days=10)).isoformat(),
    )

    # Prune
    temp_storage.cleanup_expired_records(session_id, now=ref_time)

    # Direct SQLite query to check records physically on disk
    conn = sqlite3.connect(temp_storage.db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, mood, stress, sleep_hours, route FROM checkins WHERE session_id = ?;",
        (session_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    assert len(rows) == 1
    assert rows[0][0] == valid_rec.id
    assert rows[0][1] == 4
    assert rows[0][2] == 2
    assert rows[0][3] == 8.0
    assert rows[0][4] == "LOW"

    # Verify old record is completely gone
    assert old_rec.id not in [r[0] for r in rows]


# ------------------------------------------------------------------------------
# Test 8: Cross-Session Isolation
# ------------------------------------------------------------------------------
def test_cross_session_isolation_during_pruning(temp_storage):
    """Session A's cleanup must NEVER delete or alter Session B's records."""
    session_a = "session-alice-14d"
    session_b = "session-bob-90d"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    # Alice selects 14 days
    temp_storage.update_settings(
        session_a, UserSettings(nickname="Alice", data_retention_days=14)
    )
    # Bob selects 90 days
    temp_storage.update_settings(
        session_b, UserSettings(nickname="Bob", data_retention_days=90)
    )

    # Both have check-ins created 20 days ago
    temp_storage.add_checkin(
        session_a, 3, 3, 6.0, "MEDIUM", (ref_time - timedelta(days=20)).isoformat()
    )
    b_checkin = temp_storage.add_checkin(
        session_b, 4, 2, 7.5, "LOW", (ref_time - timedelta(days=20)).isoformat()
    )

    # Both have planner tasks
    a_task = temp_storage.add_task(session_a, "Alice study task", 25, "Study")
    b_task = temp_storage.add_task(session_b, "Bob reading task", 40, "Reading")

    # Run cleanup ONLY on Session A
    pruned_a = temp_storage.cleanup_expired_records(session_a, now=ref_time)
    assert pruned_a == 1

    # Verify Alice's 20-day-old checkin is pruned, but her task and settings remain
    assert len(temp_storage.get_checkins(session_a)) == 0
    assert len(temp_storage.get_tasks(session_a)) == 1
    assert temp_storage.get_tasks(session_a)[0].id == a_task.id
    assert temp_storage.get_settings(session_a).nickname == "Alice"

    # Verify Bob's data is 100% UNTOUCHED
    bob_checkins = temp_storage.get_checkins(session_b)
    assert len(bob_checkins) == 1
    assert bob_checkins[0].id == b_checkin.id
    assert bob_checkins[0].mood == 4

    bob_tasks = temp_storage.get_tasks(session_b)
    assert len(bob_tasks) == 1
    assert bob_tasks[0].id == b_task.id

    assert temp_storage.get_settings(session_b).nickname == "Bob"
    assert temp_storage.get_settings(session_b).data_retention_days == 90


# ------------------------------------------------------------------------------
# Test 9: Missing / Invalid Retention Configuration Fallback
# ------------------------------------------------------------------------------
def test_missing_or_invalid_retention_configuration_fallback(temp_storage):
    """Unsupported or missing values safely fall back to 30 days without exceptions."""
    session_id = "session-fallback-retention"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    # Force an invalid value in SQLite directly to test raw database fallback
    conn = temp_storage._get_connection()
    with conn:
        conn.execute(
            """
            INSERT INTO user_settings (session_id, nickname, data_retention_days)
            VALUES (?, 'Hacker', 999);
            """,
            (session_id,),
        )

    # Add records at 25 days and 35 days
    temp_storage.add_checkin(
        session_id, 4, 2, 7.0, "LOW", (ref_time - timedelta(days=25)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 2, 4, 5.0, "MEDIUM", (ref_time - timedelta(days=35)).isoformat()
    )

    # Prune must safely use 30 days fallback
    pruned = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned == 1

    remaining = temp_storage.get_checkins(session_id)
    assert len(remaining) == 1
    assert remaining[0].mood == 4


# ------------------------------------------------------------------------------
# Test 10: Repeated Cleanup Is Idempotent
# ------------------------------------------------------------------------------
def test_repeated_cleanup_idempotency(temp_storage):
    """Running cleanup repeatedly causes zero side-effects and is completely idempotent."""
    session_id = "session-idempotent-pruning"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    temp_storage.add_checkin(
        session_id, 3, 3, 6.0, "MEDIUM", (ref_time - timedelta(days=40)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 4, 2, 7.5, "LOW", (ref_time - timedelta(days=10)).isoformat()
    )

    # First execution
    first_run = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert first_run == 1
    assert len(temp_storage.get_checkins(session_id)) == 1

    # Second, third, fourth runs immediately
    second_run = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    third_run = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    fourth_run = temp_storage.cleanup_expired_records(session_id, now=ref_time)

    assert second_run == 0
    assert third_run == 0
    assert fourth_run == 0

    remaining = temp_storage.get_checkins(session_id)
    assert len(remaining) == 1
    assert remaining[0].mood == 4


# ------------------------------------------------------------------------------
# Test 11: Concurrent Cleanup Does Not Corrupt Data
# ------------------------------------------------------------------------------
def test_concurrent_cleanup_thread_safety(temp_storage):
    """Concurrent worker threads performing writes and cleanups maintain database integrity."""
    session_id = "session-concurrent-safety"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    def worker(worker_id: int):
        # Insert a valid and an expired check-in
        temp_storage.add_checkin(
            session_id,
            mood=4,
            stress=2,
            sleep_hours=7.0,
            route="LOW",
            timestamp=(ref_time - timedelta(days=5)).isoformat(),
        )
        temp_storage.add_checkin(
            session_id,
            mood=2,
            stress=4,
            sleep_hours=5.0,
            route="MEDIUM",
            timestamp=(ref_time - timedelta(days=45 + worker_id)).isoformat(),
        )
        # Execute cleanup
        temp_storage.cleanup_expired_records(session_id, now=ref_time)

    # Run 10 concurrent threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(worker, i) for i in range(10)]
        for f in concurrent.futures.as_completed(futures):
            f.result()  # Will raise if any thread encountered an exception

    # Verify SQLite database passes integrity check
    conn = temp_storage._get_connection()
    integrity = conn.execute("PRAGMA integrity_check;").fetchone()[0]
    assert integrity == "ok"

    # All remaining records must be within 30 days
    remaining = temp_storage.get_checkins(session_id)
    assert len(remaining) == 10  # exactly 10 valid records (1 per worker)
    for c in remaining:
        assert c.mood == 4


# ------------------------------------------------------------------------------
# Test 12: Settings Updates Affect Subsequent Pruning
# ------------------------------------------------------------------------------
def test_settings_updates_affect_subsequent_pruning(temp_storage):
    """Changing retention from 90 to 14 days immediately alters the pruning boundary."""
    session_id = "session-dynamic-window"
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)

    # Start with 90 days retention
    temp_storage.update_settings(session_id, UserSettings(data_retention_days=90))

    # Add records at 20 days and 50 days ago
    temp_storage.add_checkin(
        session_id, 4, 2, 7.5, "LOW", (ref_time - timedelta(days=20)).isoformat()
    )
    temp_storage.add_checkin(
        session_id, 3, 3, 6.0, "MEDIUM", (ref_time - timedelta(days=50)).isoformat()
    )

    # Pruning at 90 days leaves both records intact
    pruned_90d = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned_90d == 0
    assert len(temp_storage.get_checkins(session_id)) == 2

    # User tightens retention to 14 days
    temp_storage.update_settings(session_id, UserSettings(data_retention_days=14))

    # Subsequent cleanup prunes both records (20d and 50d are both > 14d)
    pruned_14d = temp_storage.cleanup_expired_records(session_id, now=ref_time)
    assert pruned_14d == 2
    assert len(temp_storage.get_checkins(session_id)) == 0


# ------------------------------------------------------------------------------
# End-to-End API Integration Tests (FastAPI Request Boundary Verification)
# ------------------------------------------------------------------------------
def test_api_request_boundary_automated_pruning():
    """Verify that automated pruning runs during live API requests over TestClient."""
    client = TestClient(app)
    session_id = "test-session-api-boundary"
    headers = {"X-Session-ID": session_id}

    # Clean existing data for this session
    client.delete("/api/settings/data", headers=headers)

    # 1. Configure 14-day retention via PUT /api/settings
    settings_res = client.put(
        "/api/settings",
        json={"data_retention_days": 14, "nickname": "ApiTester"},
        headers=headers,
    )
    assert settings_res.status_code == 200
    assert settings_res.json()["data_retention_days"] == 14

    # 2. Inject a 25-day-old checkin and a 5-day-old checkin into storage directly
    from app.services.storage import storage as global_storage

    now = datetime.now(UTC)
    global_storage.add_checkin(
        session_id,
        2,
        4,
        5.0,
        "MEDIUM",
        timestamp=(now - timedelta(days=25)).isoformat(),
    )
    global_storage.add_checkin(
        session_id, 4, 2, 7.5, "LOW", timestamp=(now - timedelta(days=5)).isoformat()
    )

    # 3. GET /api/checkin/history must automatically trigger cleanup
    hist_res = client.get("/api/checkin/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()

    # The 25-day-old entry was automatically pruned on request!
    assert len(history) == 1
    assert history[0]["mood"] == 4

    # 4. GET /api/insights also triggers pruning and computes metrics solely on retained data
    insights_res = client.get("/api/insights?days=14", headers=headers)
    assert insights_res.status_code == 200
    insights = insights_res.json()
    assert insights["check_in_count"] == 1
    assert insights["average_mood"] == 4.0

    # 5. Clean up after test
    client.delete("/api/settings/data", headers=headers)
