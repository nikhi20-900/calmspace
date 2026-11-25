"""
Tests for Issue #10: Persistent anonymous sessions and privacy-conscious data storage
Validates:
1. Session isolation (Session A cannot read, toggle, or delete Session B data).
2. Structural privacy: Reflection text is never stored in the database.
3. Persistence across simulated backend restarts.
4. 2-Step data deletion.
"""

import os
import sqlite3
import tempfile

import pytest

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


def test_session_isolation(temp_storage):
    """Session A's records must be completely invisible to Session B."""
    session_a = "session-alice-1111"
    session_b = "session-bob-2222"

    # Alice adds a check-in and task
    temp_storage.add_checkin(session_a, mood=4, stress=2, sleep_hours=8.0, route="LOW")
    alice_task = temp_storage.add_task(session_a, "Math homework", 30, "Study")

    # Bob queries check-ins and tasks
    bob_checkins = temp_storage.get_checkins(session_b)
    bob_tasks = temp_storage.get_tasks(session_b)

    assert len(bob_checkins) == 0
    assert len(bob_tasks) == 0

    # Bob cannot toggle or delete Alice's task
    toggle_result = temp_storage.toggle_task(session_b, alice_task.id)
    assert toggle_result is None

    delete_result = temp_storage.delete_task(session_b, alice_task.id)
    assert delete_result is False

    # Alice's task remains untouched
    alice_tasks = temp_storage.get_tasks(session_a)
    assert len(alice_tasks) == 1
    assert alice_tasks[0].completed is False


def test_zero_reflection_storage_guarantee(temp_storage):
    """Inspect SQLite schema directly to prove no reflection column exists."""
    conn = sqlite3.connect(temp_storage.db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(checkins);")
    columns = [row[1] for row in cursor.fetchall()]
    conn.close()

    assert "reflection" not in columns
    assert "text" not in columns
    assert set(columns) == {
        "id",
        "session_id",
        "timestamp",
        "mood",
        "stress",
        "sleep_hours",
        "route",
    }


def test_persistence_across_restart(temp_storage):
    """Simulate application restart: data must persist across new storage instances."""
    session_id = "student-persistent-xyz"
    db_file = temp_storage.db_path

    # Insert data
    temp_storage.add_checkin(
        session_id, mood=3, stress=3, sleep_hours=6.5, route="MEDIUM"
    )
    temp_storage.add_task(session_id, "Biology reading", 45, "Reading")
    temp_storage.update_settings(
        session_id, UserSettings(nickname="CampusOwl", break_reminders_enabled=True)
    )

    # Close first connection
    temp_storage.close()

    # Re-initialize new storage instance on the exact same database file
    restarted_storage = CalmspaceStorage(db_path=db_file)

    try:
        checkins = restarted_storage.get_checkins(session_id)
        tasks = restarted_storage.get_tasks(session_id)
        settings = restarted_storage.get_settings(session_id)

        assert len(checkins) == 1
        assert checkins[0].mood == 3
        assert checkins[0].route == "MEDIUM"

        assert len(tasks) == 1
        assert tasks[0].title == "Biology reading"

        assert settings.nickname == "CampusOwl"
        assert settings.break_reminders_enabled is True
    finally:
        restarted_storage.close()


def test_delete_all_data_permanently_purges(temp_storage):
    """2-Step data erasure must permanently remove all records for that session."""
    session_a = "student-to-erase"
    session_b = "student-to-keep"

    temp_storage.add_checkin(session_a, 2, 4, 5.0, "MEDIUM")
    temp_storage.add_task(session_a, "Erase me", 15, "Break")
    temp_storage.update_settings(session_a, UserSettings(nickname="TempUser"))

    temp_storage.add_checkin(session_b, 5, 1, 8.5, "LOW")
    temp_storage.add_task(session_b, "Keep me", 20, "Study")

    # Erase session A
    assert temp_storage.delete_all_data(session_a) is True

    # Verify session A is completely empty
    assert len(temp_storage.get_checkins(session_a)) == 0
    assert len(temp_storage.get_tasks(session_a)) == 0
    # Settings reset to default
    assert temp_storage.get_settings(session_a).nickname == "Student"

    # Verify session B is completely intact
    assert len(temp_storage.get_checkins(session_b)) == 1
    assert len(temp_storage.get_tasks(session_b)) == 1
    assert temp_storage.get_tasks(session_b)[0].title == "Keep me"


def test_task_update_persistence_and_session_isolation(temp_storage):
    """Task update must strictly isolate sessions and persist across simulated restart."""
    session_alice = "student-alice-edit"
    session_bob = "student-bob-intruder"

    # Alice creates a task
    alice_task = temp_storage.add_task(
        session_id=session_alice,
        title="Original Math Practice",
        estimated_minutes=25,
        category="Study",
    )
    original_id = alice_task.id
    original_created_at = alice_task.created_at

    # Bob tries to update Alice's task -> must return None and remain unchanged
    bob_attempt = temp_storage.update_task(
        session_id=session_bob,
        task_id=original_id,
        title="Hacked Task",
        estimated_minutes=100,
        category="Revision",
    )
    assert bob_attempt is None

    # Verify Alice's task was untouched
    alice_tasks = temp_storage.get_tasks(session_alice)
    assert alice_tasks[0].title == "Original Math Practice"
    assert alice_tasks[0].estimated_minutes == 25

    # Alice updates her task
    updated = temp_storage.update_task(
        session_id=session_alice,
        task_id=original_id,
        title="Refined Calculus Review",
        estimated_minutes=40,
        category="Revision",
    )
    assert updated is not None
    assert updated.id == original_id
    assert updated.title == "Refined Calculus Review"
    assert updated.estimated_minutes == 40
    assert updated.category == "Revision"
    assert updated.completed is False
    assert updated.created_at == original_created_at

    # Simulate restart and verify updated task persists
    db_file = temp_storage.db_path
    temp_storage.close()

    restarted = CalmspaceStorage(db_path=db_file)
    try:
        tasks = restarted.get_tasks(session_alice)
        assert len(tasks) == 1
        assert tasks[0].id == original_id
        assert tasks[0].title == "Refined Calculus Review"
        assert tasks[0].estimated_minutes == 40
        assert tasks[0].category == "Revision"
    finally:
        restarted.close()
