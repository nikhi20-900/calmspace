"""
Security & Input Validation Regression Tests
Verifies strict X-Session-ID validation across all session-scoped routes,
cross-session isolation, planner starter seeding persistence & DB migration,
and strict schema bounds on task titles, nicknames, and reminder intervals.
"""

import os
import sqlite3
import tempfile
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.services.storage import CalmspaceStorage

client = TestClient(app)


def test_missing_and_malformed_session_headers_rejected_across_all_routes():
    """All session-scoped endpoints and HTTP methods must require a valid X-Session-ID header."""
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
    bad_header_cases = [
        {},
        {"X-Session-ID": ""},
        {"X-Session-ID": "."},
        {"X-Session-ID": ".."},
        {"X-Session-ID": "a"},
        {"X-Session-ID": "short12"},
        {"X-Session-ID": "-badstart1"},
        {"X-Session-ID": "badend123-"},
        {"X-Session-ID": "bad..dots1"},
        {"X-Session-ID": "anonymous-default-session"},
        {"X-Session-ID": "ANONYMOUS-DEFAULT-SESSION"},
        {"X-Session-ID": "default"},
        {"X-Session-ID": "undefined"},
        {"X-Session-ID": "null"},
        {"X-Session-ID": "bad session with spaces"},
        {"X-Session-ID": "../etc/passwd"},
        {"X-Session-ID": "a" * 129},
    ]

    for headers in bad_header_cases:
        assert (
            client.post("/api/checkin", json=valid_checkin, headers=headers).status_code
            == 422
        )
        assert client.get("/api/checkin/history", headers=headers).status_code == 422
        assert client.get("/api/insights", headers=headers).status_code == 422
        assert client.get("/api/planner/tasks", headers=headers).status_code == 422
        assert (
            client.post(
                "/api/planner/tasks", json=valid_task, headers=headers
            ).status_code
            == 422
        )
        assert (
            client.patch(
                "/api/planner/tasks/fake-id/toggle", headers=headers
            ).status_code
            == 422
        )
        assert (
            client.patch(
                "/api/planner/tasks/fake-id",
                json={"title": "Updated task"},
                headers=headers,
            ).status_code
            == 422
        )
        assert (
            client.delete("/api/planner/tasks/fake-id", headers=headers).status_code
            == 422
        )
        assert client.get("/api/settings", headers=headers).status_code == 422
        assert (
            client.put(
                "/api/settings", json=valid_settings, headers=headers
            ).status_code
            == 422
        )
        assert client.delete("/api/settings/data", headers=headers).status_code == 422


def test_cross_session_isolation_across_checkins_insights_planner_and_settings():
    """Verify two independent sessions remain completely isolated across all endpoints."""
    session_a = f"session-iso-a-{uuid4().hex}"
    session_b = f"session-iso-b-{uuid4().hex}"
    headers_a = {"X-Session-ID": session_a}
    headers_b = {"X-Session-ID": session_b}

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

        # Deleting Session B does not touch Session A's data
        assert client.delete("/api/settings/data", headers=headers_b).status_code == 200
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
        client.delete("/api/settings/data", headers=headers_a)
        client.delete("/api/settings/data", headers=headers_b)


def test_planner_rejects_whitespace_titles_and_does_not_reseed_after_deletion():
    """Whitespace titles return 422, and deleting all starter tasks keeps the list empty."""
    session_id = f"test-planner-{uuid4().hex}"
    headers = {"X-Session-ID": session_id}

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

        # Full data deletion resets user_settings (including planner_seeded) cleanly
        purge = client.delete("/api/settings/data", headers=headers)
        assert purge.status_code == 200

        reseeded = client.get("/api/planner/tasks", headers=headers)
        assert reseeded.status_code == 200
        assert len(reseeded.json()) == 2
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_planner_creating_then_deleting_task_does_not_seed_starters():
    """Creating a task before ever calling list_tasks marks planner_seeded so deleting it stays empty."""
    session_id = f"test-planner-create-del-{uuid4().hex}"
    headers = {"X-Session-ID": session_id}

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
        client.delete("/api/settings/data", headers=headers)


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
    session_id = f"test-planner-patch-{uuid4().hex}"
    headers = {"X-Session-ID": session_id}

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
        client.delete("/api/settings/data", headers=headers)


def test_settings_rejects_out_of_range_reminder_interval_and_blank_nickname():
    session_id = f"test-settings-{uuid4().hex}"
    headers = {"X-Session-ID": session_id}

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
        assert res.status_code == 422, f"Expected 422 for interval={invalid_interval}"

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
        assert res.status_code == 422, f"Expected 422 for nickname={invalid_nickname!r}"
