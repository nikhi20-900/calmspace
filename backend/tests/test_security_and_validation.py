"""
Security & Input Validation Regression Tests
Verifies strict X-Session-ID validation, planner starter seeding persistence,
and strict schema bounds on task titles and reminder intervals.
"""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_missing_and_malformed_session_headers_rejected():
    """All session-scoped endpoints must require a valid X-Session-ID header."""
    valid_checkin = {
        "mood": 4,
        "stress": 2,
        "sleep_hours": 8.0,
        "reflection": "Feeling steady today.",
        "consent_ai_processing": False,
    }
    bad_header_cases = [
        {},
        {"X-Session-ID": ""},
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
        assert client.get("/api/settings", headers=headers).status_code == 422
        assert client.delete("/api/settings/data", headers=headers).status_code == 422


def test_planner_rejects_whitespace_titles_and_does_not_reseed_after_deletion():
    """Whitespace titles return 422, and deleting all starter tasks keeps the list empty."""
    session_id = f"test-planner-{uuid4().hex}"
    headers = {"X-Session-ID": session_id}

    # Whitespace-only title is rejected on create
    bad_create = client.post(
        "/api/planner/tasks",
        headers=headers,
        json={"title": "    ", "estimated_minutes": 25, "category": "Study"},
    )
    assert bad_create.status_code == 422

    # First list_tasks call seeds the starter tasks once
    initial = client.get("/api/planner/tasks", headers=headers)
    assert initial.status_code == 200
    tasks = initial.json()
    assert len(tasks) > 0

    # Delete all seeded tasks
    for task in tasks:
        del_res = client.delete(f"/api/planner/tasks/{task['id']}", headers=headers)
        assert del_res.status_code == 200

    # Subsequent fetch must stay empty rather than resurrecting deleted defaults
    after_delete = client.get("/api/planner/tasks", headers=headers)
    assert after_delete.status_code == 200
    assert after_delete.json() == []


def test_planner_patch_rejects_whitespace_title():
    session_id = f"test-planner-patch-{uuid4().hex}"
    headers = {"X-Session-ID": session_id}

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


def test_settings_rejects_out_of_range_reminder_interval():
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
