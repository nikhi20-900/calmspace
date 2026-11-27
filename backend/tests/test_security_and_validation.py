"""
Security & Input Validation Regression Tests
Verifies server-issued anonymous Bearer credential authentication across all session-scoped routes,
session expiry/revocation/rotation, cross-session negative security isolation,
planner starter seeding persistence & DB migration, and strict schema bounds.
"""

import concurrent.futures
import os
import sqlite3
import tempfile
import threading
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.services.storage import CalmspaceStorage, storage

client = TestClient(app)


def _issue_session(test_client: TestClient = client) -> tuple[str, str, dict[str, str]]:
    res = test_client.post("/api/sessions")
    assert res.status_code == 201
    assert "no-store" in res.headers.get("cache-control", "").lower()
    data = res.json()
    session_id = data["session_id"]
    session_secret = data["session_secret"]
    headers = {"Authorization": f"Bearer {session_id}.{session_secret}"}
    return session_id, session_secret, headers


def test_session_issuance_stores_only_salted_hash_and_never_plaintext_secret():
    """POST /api/sessions issues high-entropy credentials and never persists plaintext secrets."""
    session_id, session_secret, headers = _issue_session()
    try:
        assert len(session_secret) >= 32
        conn = storage._get_connection()
        row = conn.execute(
            "SELECT session_id, secret_hash, secret_salt, revoked_at FROM session_credentials WHERE session_id = ?;",
            (session_id,),
        ).fetchone()
        assert row is not None
        assert row["revoked_at"] is None
        assert row["secret_hash"] != session_secret
        assert session_secret not in str(dict(row))
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_missing_malformed_and_spoofed_credentials_rejected_with_401_across_all_routes():
    """All session-scoped endpoints must enforce Bearer credentials and return uniform 401s."""
    valid_checkin = {
        "mood": 4,
        "stress": 2,
        "sleep_hours": 8.0,
        "reflection": "Feeling steady today.",
        "consent_ai_processing": False,
    }
    valid_task = {
        "title": "Read lecture chapter",
        "estimated_minutes": 25,
        "category": "Study",
    }
    valid_settings = {
        "nickname": "Student",
        "break_reminders_enabled": True,
        "reminder_interval_minutes": 45,
        "share_anonymous_analytics": False,
        "data_retention_days": 30,
    }

    real_id, real_secret, real_headers = _issue_session()
    other_id, other_secret, other_headers = _issue_session()

    try:
        bad_header_cases = [
            {},
            {
                "X-Session-ID": real_id
            },  # Self-asserted X-Session-ID without secret rejected
            {"X-Session-ID": f"forged-{uuid4().hex}"},
            {"Authorization": ""},
            {"Authorization": "Basic dXNlcjpwYXNz"},
            {"Authorization": "Bearer"},
            {"Authorization": f"Bearer {real_id}"},
            {"Authorization": "Bearer short12.validlengthsecret123456"},
            {"Authorization": "Bearer -badstart1.validlengthsecret123456"},
            {"Authorization": "Bearer bad..dots1.validlengthsecret123456"},
            {
                "Authorization": "Bearer anonymous-default-session.validlengthsecret123456"
            },
            {"Authorization": "Bearer default.validlengthsecret123456"},
            {"Authorization": f"Bearer {real_id}.short"},
            {
                "Authorization": f"Bearer {real_id}.wrong-secret-with-plenty-of-length-123456"
            },
            {
                "Authorization": f"Bearer {uuid4()}.wrong-secret-with-plenty-of-length-123456"
            },
            # Cross-session credential splice (Session A id + Session B secret)
            {"Authorization": f"Bearer {real_id}.{other_secret}"},
            # Mismatched X-Session-ID alongside valid Bearer credential
            {
                "Authorization": f"Bearer {real_id}.{real_secret}",
                "X-Session-ID": other_id,
            },
        ]

        expected_detail = {"detail": "Invalid or expired session credential."}
        for headers in bad_header_cases:
            responses = [
                client.post("/api/checkin", json=valid_checkin, headers=headers),
                client.get("/api/checkin/history", headers=headers),
                client.get("/api/insights", headers=headers),
                client.get("/api/planner/tasks", headers=headers),
                client.post("/api/planner/tasks", json=valid_task, headers=headers),
                client.patch("/api/planner/tasks/fake-id/toggle", headers=headers),
                client.patch(
                    "/api/planner/tasks/fake-id",
                    json={"title": "Updated task"},
                    headers=headers,
                ),
                client.delete("/api/planner/tasks/fake-id", headers=headers),
                client.get("/api/settings", headers=headers),
                client.put("/api/settings", json=valid_settings, headers=headers),
                client.delete("/api/settings/data", headers=headers),
                client.post("/api/sessions/rotate", headers=headers),
                client.post("/api/sessions/revoke", headers=headers),
            ]
            for res in responses:
                assert res.status_code == 401, (
                    f"Expected 401 for {headers}, got {res.status_code}"
                )
                assert res.json() == expected_detail
                assert res.headers.get("www-authenticate") == "Bearer"
    finally:
        client.delete("/api/settings/data", headers=real_headers)
        client.delete("/api/settings/data", headers=other_headers)


def test_session_expiry_revocation_and_rotation_lifecycle():
    """Verify sliding expiry, expired token rejection, explicit revocation, rotation, and purge on delete."""
    # 1. Rotation invalidates old secret while preserving data
    session_id, old_secret, old_headers = _issue_session()
    try:
        client.post(
            "/api/checkin",
            headers=old_headers,
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 7.5,
                "consent_ai_processing": False,
            },
        )
        rotate_res = client.post("/api/sessions/rotate", headers=old_headers)
        assert rotate_res.status_code == 200
        assert "no-store" in rotate_res.headers.get("cache-control", "").lower()
        rotated = rotate_res.json()
        assert rotated["session_id"] == session_id
        assert rotated["session_secret"] != old_secret
        new_headers = {
            "Authorization": f"Bearer {session_id}.{rotated['session_secret']}"
        }

        # Old credential immediately rejected
        assert (
            client.get("/api/checkin/history", headers=old_headers).status_code == 401
        )
        # New credential retains existing session data
        hist = client.get("/api/checkin/history", headers=new_headers)
        assert hist.status_code == 200
        assert len(hist.json()) == 1

        # 2. Explicit revocation immediately blocks subsequent API calls
        revoke_res = client.post("/api/sessions/revoke", headers=new_headers)
        assert revoke_res.status_code == 200
        assert revoke_res.json()["status"] == "revoked"
        assert (
            client.get("/api/checkin/history", headers=new_headers).status_code == 401
        )
        assert (
            client.post("/api/sessions/rotate", headers=new_headers).status_code == 401
        )
    finally:
        storage.delete_all_data(session_id)

    # 3. Expired session rejected via API and storage verification
    exp_id, _exp_secret, exp_headers = _issue_session()
    try:
        past_iso = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()
        conn = storage._get_connection()
        with conn:
            conn.execute(
                "UPDATE session_credentials SET expires_at = ? WHERE session_id = ?;",
                (past_iso, exp_id),
            )
        assert client.get("/api/settings", headers=exp_headers).status_code == 401
        assert storage.rotate_session_secret(exp_id) is None
    finally:
        storage.delete_all_data(exp_id)


def test_storage_session_sliding_expiry_and_orphan_cleanup():
    """Verify sliding inactivity expiry, hard cutoff rejection, and atomic orphan cleanup."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = f.name

    try:
        store = CalmspaceStorage(db_path=temp_db)
        t0 = datetime(2026, 11, 1, 12, 0, 0, tzinfo=UTC)
        sess_active = store.create_session(ttl_days=14, now=t0)
        sess_idle = store.create_session(ttl_days=14, now=t0)
        sess_revoked = store.create_session(ttl_days=14, now=t0)

        store.add_checkin(sess_idle.session_id, 3, 3, 6.0, "MEDIUM")
        store.add_task(sess_idle.session_id, "Orphan task", 20, "Study")
        store.add_checkin(sess_revoked.session_id, 4, 2, 7.0, "LOW")

        # Active session used on day 10 slides its expiry forward to day 24
        t_day10 = t0 + timedelta(days=10)
        assert (
            store.verify_session_credential(
                sess_active.session_id,
                sess_active.session_secret,
                now=t_day10,
                ttl_days=14,
            )
            is True
        )
        assert store.revoke_session(sess_revoked.session_id, now=t_day10) is True

        # On day 15: idle session expired, revoked session rejected, active session still valid!
        t_day15 = t0 + timedelta(days=15)
        assert (
            store.verify_session_credential(
                sess_active.session_id,
                sess_active.session_secret,
                now=t_day15,
                ttl_days=14,
            )
            is True
        )
        assert (
            store.verify_session_credential(
                sess_idle.session_id,
                sess_idle.session_secret,
                now=t_day15,
                ttl_days=14,
            )
            is False
        )
        assert (
            store.verify_session_credential(
                sess_revoked.session_id,
                sess_revoked.session_secret,
                now=t_day15,
                ttl_days=14,
            )
            is False
        )

        purged = store.cleanup_expired_sessions(now=t_day15, purge_orphaned_data=True)
        assert purged == 2
        assert store.get_checkins(sess_idle.session_id) == []
        assert store.get_tasks(sess_idle.session_id) == []
        assert store.get_checkins(sess_revoked.session_id) == []
        store.close()
    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)


def test_cross_session_isolation_across_checkins_insights_planner_and_settings():
    """Verify two independent authenticated sessions remain isolated across all endpoints."""
    session_a, _, headers_a = _issue_session()
    session_b, _, headers_b = _issue_session()

    try:
        # Session A submits a check-in, creates a task, and updates settings
        checkin_res = client.post(
            "/api/checkin",
            headers=headers_a,
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 7.5,
                "reflection": "Productive day",
                "consent_ai_processing": False,
            },
        )
        assert checkin_res.status_code == 200

        task_res = client.post(
            "/api/planner/tasks",
            headers=headers_a,
            json={
                "title": "Session A private task",
                "estimated_minutes": 30,
                "category": "Study",
            },
        )
        assert task_res.status_code == 200
        task_a_id = task_res.json()["id"]

        settings_res = client.put(
            "/api/settings",
            headers=headers_a,
            json={
                "nickname": "SessionAUser",
                "break_reminders_enabled": False,
                "reminder_interval_minutes": 60,
                "share_anonymous_analytics": True,
                "data_retention_days": 14,
            },
        )
        assert settings_res.status_code == 200

        # Session B sees zero check-ins, zero insights, defaults in settings, and cannot touch A's task
        assert client.get("/api/checkin/history", headers=headers_b).json() == []
        assert (
            client.get("/api/insights", headers=headers_b).json()["check_in_count"] == 0
        )
        b_settings = client.get("/api/settings", headers=headers_b).json()
        assert b_settings["nickname"] == "Student"
        assert b_settings["data_retention_days"] == 30

        b_tasks = client.get("/api/planner/tasks", headers=headers_b).json()
        assert all(t["id"] != task_a_id for t in b_tasks)
        assert (
            client.patch(
                f"/api/planner/tasks/{task_a_id}/toggle", headers=headers_b
            ).status_code
            == 404
        )
        assert (
            client.patch(
                f"/api/planner/tasks/{task_a_id}",
                headers=headers_b,
                json={"title": "Tampered"},
            ).status_code
            == 404
        )
        assert (
            client.delete(
                f"/api/planner/tasks/{task_a_id}", headers=headers_b
            ).status_code
            == 404
        )

        # Deleting Session B purges and revokes Session B without touching Session A
        assert client.delete("/api/settings/data", headers=headers_b).status_code == 200
        assert client.get("/api/settings", headers=headers_b).status_code == 401
        assert len(client.get("/api/checkin/history", headers=headers_a).json()) == 1
        assert (
            client.get("/api/settings", headers=headers_a).json()["nickname"]
            == "SessionAUser"
        )
        assert any(
            t["id"] == task_a_id
            for t in client.get("/api/planner/tasks", headers=headers_a).json()
        )
    finally:
        storage.delete_all_data(session_a)
        storage.delete_all_data(session_b)


def test_planner_rejects_whitespace_titles_and_does_not_reseed_after_deletion():
    """Whitespace titles return 422, and deleting all starter tasks keeps the list empty."""
    session_id, _, headers = _issue_session()

    try:
        # Whitespace-only title is rejected on create
        bad_create = client.post(
            "/api/planner/tasks",
            headers=headers,
            json={"title": "    ", "estimated_minutes": 25, "category": "Study"},
        )
        assert bad_create.status_code == 422

        # First list_tasks call seeds the starter tasks once in storage.get_tasks() order
        initial = client.get("/api/planner/tasks", headers=headers)
        assert initial.status_code == 200
        tasks = initial.json()
        assert len(tasks) == 2

        second = client.get("/api/planner/tasks", headers=headers)
        assert second.status_code == 200
        assert second.json() == tasks

        # Delete all seeded tasks
        for task in tasks:
            del_res = client.delete(f"/api/planner/tasks/{task['id']}", headers=headers)
            assert del_res.status_code == 200

        # Subsequent fetch must stay empty rather than resurrecting deleted defaults
        after_delete = client.get("/api/planner/tasks", headers=headers)
        assert after_delete.status_code == 200
        assert after_delete.json() == []

        # Full data deletion purges everything and invalidates the old credential
        purge = client.delete("/api/settings/data", headers=headers)
        assert purge.status_code == 200
        assert client.get("/api/planner/tasks", headers=headers).status_code == 401
        assert storage.has_planner_seeded(session_id) is False
    finally:
        storage.delete_all_data(session_id)


def test_planner_creating_then_deleting_task_does_not_seed_starters():
    """Creating a task before ever calling list_tasks marks planner_seeded so deleting it stays empty."""
    session_id, _, headers = _issue_session()

    try:
        created = client.post(
            "/api/planner/tasks",
            headers=headers,
            json={
                "title": "Finish statistics worksheet",
                "estimated_minutes": 30,
                "category": "Assignment",
            },
        )
        assert created.status_code == 200
        task_id = created.json()["id"]

        deleted = client.delete(f"/api/planner/tasks/{task_id}", headers=headers)
        assert deleted.status_code == 200

        after_delete = client.get("/api/planner/tasks", headers=headers)
        assert after_delete.status_code == 200
        assert after_delete.json() == []
    finally:
        storage.delete_all_data(session_id)


def test_legacy_sqlite_user_settings_migration_adds_planner_seeded():
    """Existing SQLite DBs missing data_retention_days/planner_seeded migrate cleanly."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = f.name

    try:
        conn = sqlite3.connect(temp_db)
        with conn:
            conn.execute(
                """
                CREATE TABLE user_settings (
                    session_id TEXT PRIMARY KEY,
                    nickname TEXT NOT NULL DEFAULT 'Student',
                    break_reminders_enabled INTEGER NOT NULL DEFAULT 1,
                    reminder_interval_minutes INTEGER NOT NULL DEFAULT 45,
                    share_anonymous_analytics INTEGER NOT NULL DEFAULT 0
                );
                """
            )
            conn.execute(
                "INSERT INTO user_settings (session_id, nickname) VALUES (?, ?);",
                ("legacy-session-001", "LegacyStudent"),
            )
        conn.close()

        migrated = CalmspaceStorage(db_path=temp_db)
        try:
            db_conn = migrated._get_connection()
            cols = [
                row[1]
                for row in db_conn.execute(
                    "PRAGMA table_info(user_settings);"
                ).fetchall()
            ]
            assert "data_retention_days" in cols
            assert "planner_seeded" in cols
            assert (
                migrated.get_settings("legacy-session-001").nickname == "LegacyStudent"
            )
            assert migrated.has_planner_seeded("legacy-session-001") is False

            migrated.mark_planner_seeded("legacy-session-001")
            assert migrated.has_planner_seeded("legacy-session-001") is True
            assert (
                migrated.get_settings("legacy-session-001").nickname == "LegacyStudent"
            )
        finally:
            migrated.close()
    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)


def test_planner_patch_rejects_whitespace_title():
    session_id, _, headers = _issue_session()

    try:
        created = client.post(
            "/api/planner/tasks",
            headers=headers,
            json={
                "title": "Review biology notes",
                "estimated_minutes": 25,
                "category": "Study",
            },
        )
        assert created.status_code == 200
        task_id = created.json()["id"]

        bad_patch = client.patch(
            f"/api/planner/tasks/{task_id}",
            headers=headers,
            json={"title": "   "},
        )
        assert bad_patch.status_code == 422
    finally:
        storage.delete_all_data(session_id)


def test_settings_rejects_out_of_range_reminder_interval_and_blank_nickname():
    session_id, _, headers = _issue_session()

    try:
        for invalid_interval in (-50, 0, 4, 241):
            res = client.put(
                "/api/settings",
                headers=headers,
                json={
                    "nickname": "Student",
                    "break_reminders_enabled": True,
                    "reminder_interval_minutes": invalid_interval,
                    "share_anonymous_analytics": False,
                    "data_retention_days": 30,
                },
            )
            assert res.status_code == 422, (
                f"Expected 422 for interval={invalid_interval}"
            )

        for invalid_nickname in ("", "   ", "\t\n"):
            res = client.put(
                "/api/settings",
                headers=headers,
                json={
                    "nickname": invalid_nickname,
                    "break_reminders_enabled": True,
                    "reminder_interval_minutes": 45,
                    "share_anonymous_analytics": False,
                    "data_retention_days": 30,
                },
            )
            assert res.status_code == 422, (
                f"Expected 422 for nickname={invalid_nickname!r}"
            )
    finally:
        storage.delete_all_data(session_id)


def test_concurrent_requests_cannot_bypass_revocation():
    """Once revoke_session completes, concurrent verify/rotate calls must never succeed."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = f.name

    try:
        store = CalmspaceStorage(db_path=temp_db)
        sess = store.create_session()
        revoked_event = threading.Event()
        post_revoke_successes: list[bool] = []

        def verifier():
            for _ in range(25):
                was_revoked = revoked_event.is_set()
                ok = store.verify_session_credential(
                    sess.session_id, sess.session_secret
                )
                if was_revoked and ok:
                    post_revoke_successes.append(True)

        def revoker():
            store.revoke_session(sess.session_id)
            revoked_event.set()

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            futures = [pool.submit(verifier) for _ in range(5)]
            futures.append(pool.submit(revoker))
            for fut in concurrent.futures.as_completed(futures):
                fut.result()

        assert post_revoke_successes == []
        assert (
            store.verify_session_credential(sess.session_id, sess.session_secret)
            is False
        )
        assert store.rotate_session_secret(sess.session_id) is None
        store.close()
    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)


def test_production_requires_strong_session_pepper(monkeypatch):
    """Production mode fails closed if CALMSPACE_SESSION_PEPPER is missing, weak, or placeholder."""
    import pytest

    monkeypatch.setenv("CALMSPACE_ENV", "production")
    for bad_pepper in ("", "short", "changeme", "placeholder"):
        monkeypatch.setenv("CALMSPACE_SESSION_PEPPER", bad_pepper)
        assert storage.is_session_pepper_valid() is False
        with pytest.raises(RuntimeError):
            storage.create_session()

        ready = client.get("/api/ready")
        assert ready.status_code == 503
        assert ready.json() == {
            "status": "unavailable",
            "database": "connected",
            "auth": "misconfigured",
        }

    monkeypatch.setenv(
        "CALMSPACE_SESSION_PEPPER", "strong-production-pepper-32-chars-ok"
    )
    assert storage.is_session_pepper_valid() is True
    created = storage.create_session()
    try:
        assert (
            storage.verify_session_credential(
                created.session_id, created.session_secret
            )
            is True
        )
    finally:
        storage.delete_all_data(created.session_id)


def test_concurrent_verification_cannot_bypass_rotation():
    """Once rotate_session_secret commits, concurrent verify_session_credential with old secret fails."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = f.name

    try:
        store = CalmspaceStorage(db_path=temp_db)
        sess = store.create_session()
        store.add_checkin(sess.session_id, 4, 2, 7.5, "LOW")

        rotated_event = threading.Event()
        post_rotate_old_secret_accepted: list[bool] = []
        rotated_result: list[str] = []

        def verifier():
            for _ in range(30):
                was_rotated = rotated_event.is_set()
                ok = store.verify_session_credential(
                    sess.session_id, sess.session_secret
                )
                if was_rotated and ok:
                    post_rotate_old_secret_accepted.append(True)

        def rotator():
            res = store.rotate_session_secret(
                sess.session_id, current_secret=sess.session_secret
            )
            if res is not None:
                rotated_result.append(res.session_secret)
            rotated_event.set()

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            futures = [pool.submit(verifier) for _ in range(5)]
            futures.append(pool.submit(rotator))
            for fut in concurrent.futures.as_completed(futures):
                fut.result()

        assert post_rotate_old_secret_accepted == []
        assert len(rotated_result) == 1
        assert (
            store.verify_session_credential(sess.session_id, sess.session_secret)
            is False
        )
        assert (
            store.verify_session_credential(sess.session_id, rotated_result[0]) is True
        )
        assert len(store.get_checkins(sess.session_id)) == 1
        store.close()
    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)


def test_simultaneous_rotations_cannot_overwrite_each_other():
    """Simultaneous storage and HTTP rotations with the same old secret allow at most one winner."""
    # 1. Direct storage optimistic concurrency under thread contention
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = f.name

    try:
        store = CalmspaceStorage(db_path=temp_db)
        sess = store.create_session()
        store.add_checkin(sess.session_id, 4, 2, 8.0, "LOW")
        barrier = threading.Barrier(6)

        def attempt_storage_rotate():
            barrier.wait()
            return store.rotate_session_secret(
                sess.session_id, current_secret=sess.session_secret
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            results = list(
                pool.map(lambda _: attempt_storage_rotate(), range(6))
            )

        winners = [r for r in results if r is not None]
        assert len(winners) == 1
        winning_secret = winners[0].session_secret
        assert (
            store.verify_session_credential(sess.session_id, sess.session_secret)
            is False
        )
        assert store.verify_session_credential(sess.session_id, winning_secret) is True
        assert len(store.get_checkins(sess.session_id)) == 1
        store.close()
    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)

    # 2. Simultaneous HTTP POST /api/sessions/rotate calls via TestClient
    session_id, old_secret, old_headers = _issue_session()
    try:
        client.post(
            "/api/checkin",
            headers=old_headers,
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 7.5,
                "consent_ai_processing": False,
            },
        )
        http_barrier = threading.Barrier(4)

        def attempt_http_rotate():
            local_client = TestClient(app)
            http_barrier.wait()
            return local_client.post("/api/sessions/rotate", headers=old_headers)

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            responses = list(pool.map(lambda _: attempt_http_rotate(), range(4)))

        successes = [r for r in responses if r.status_code == 200]
        failures = [r for r in responses if r.status_code == 401]
        assert len(successes) == 1
        assert len(failures) == 3

        new_secret = successes[0].json()["session_secret"]
        assert new_secret != old_secret
        assert client.get("/api/checkin/history", headers=old_headers).status_code == 401
        new_headers = {"Authorization": f"Bearer {session_id}.{new_secret}"}
        hist = client.get("/api/checkin/history", headers=new_headers)
        assert hist.status_code == 200
        assert len(hist.json()) == 1
    finally:
        storage.delete_all_data(session_id)


def test_session_secret_and_pepper_never_leak_to_logs_streams_or_responses(
    monkeypatch, caplog, capsys
):
    """session_secret and CALMSPACE_SESSION_PEPPER must never leak into logs, stdout/stderr, analytics, or errors."""
    import logging

    test_pepper = "synthetic-test-pepper-secret-canary-998877"
    monkeypatch.setenv("CALMSPACE_ENV", "production")
    monkeypatch.setenv("CALMSPACE_SESSION_PEPPER", test_pepper)

    session_id = ""
    with caplog.at_level(logging.DEBUG):
        # 1. Issuance & Rotation
        sess_res = client.post("/api/sessions")
        assert sess_res.status_code == 201
        sess_data = sess_res.json()
        session_id = sess_data["session_id"]
        initial_secret = sess_data["session_secret"]
        headers_1 = {"Authorization": f"Bearer {session_id}.{initial_secret}"}

        try:
            rot_res = client.post("/api/sessions/rotate", headers=headers_1)
            assert rot_res.status_code == 200
            rotated_secret = rot_res.json()["session_secret"]
            headers_2 = {"Authorization": f"Bearer {session_id}.{rotated_secret}"}

            # 2. Check-in + Insights (200)
            ok_res = client.post(
                "/api/checkin",
                headers=headers_2,
                json={
                    "mood": 4,
                    "stress": 2,
                    "sleep_hours": 7.5,
                    "consent_ai_processing": False,
                },
            )
            assert ok_res.status_code == 200
            insights_res = client.get("/api/insights?days=7", headers=headers_2)
            assert insights_res.status_code == 200
            ready_ok = client.get("/api/ready")
            assert ready_ok.status_code == 200

            # 3. 401 (stale rotated secret & forged secret)
            err_401_old = client.get("/api/checkin/history", headers=headers_1)
            assert err_401_old.status_code == 401
            err_401_forged = client.get(
                "/api/checkin/history",
                headers={"Authorization": f"Bearer {session_id}.{rotated_secret}x"},
            )
            assert err_401_forged.status_code == 401

            # 4. 422 (validation error)
            err_422 = client.post(
                "/api/checkin",
                headers=headers_2,
                json={"mood": 99, "stress": 2, "sleep_hours": 7.5},
            )
            assert err_422.status_code == 422

            # 5. 503 (DB error handler & /api/ready misconfigured pepper)
            def broken_get_checkins(_sid: str):
                raise sqlite3.OperationalError(
                    f"db failure near {test_pepper} and {rotated_secret}"
                )

            with monkeypatch.context() as m:
                m.setattr(storage, "get_checkins", broken_get_checkins)
                no_raise_client = TestClient(app, raise_server_exceptions=False)
                err_503_db = no_raise_client.get("/api/checkin/history", headers=headers_2)
                assert err_503_db.status_code == 503

            with monkeypatch.context() as m:
                m.setenv("CALMSPACE_SESSION_PEPPER", "short")
                err_503_ready = client.get("/api/ready")
                assert err_503_ready.status_code == 503

            # 6. 500 (unexpected non-sqlite error handler)
            def exploding_add(*_args, **_kwargs):
                raise RuntimeError(f"unexpected crash {rotated_secret} {test_pepper}")

            with monkeypatch.context() as m:
                m.setattr(storage, "add_checkin", exploding_add)
                no_raise_client = TestClient(app, raise_server_exceptions=False)
                err_500 = no_raise_client.post(
                    "/api/checkin",
                    headers=headers_2,
                    json={"mood": 4, "stress": 2, "sleep_hours": 7.5},
                )
                assert err_500.status_code == 500

            non_issuance_responses = [
                ok_res,
                insights_res,
                ready_ok,
                err_401_old,
                err_401_forged,
                err_422,
                err_503_db,
                err_503_ready,
                err_500,
            ]
            for resp in non_issuance_responses:
                assert initial_secret not in resp.text
                assert rotated_secret not in resp.text
                assert test_pepper not in resp.text

            for issuance_resp in (sess_res, rot_res):
                assert test_pepper not in issuance_resp.text
        finally:
            storage.delete_all_data(session_id)

    out, err = capsys.readouterr()
    for secret_val in (initial_secret, rotated_secret, test_pepper):
        assert secret_val not in caplog.text
        assert secret_val not in out
        assert secret_val not in err
