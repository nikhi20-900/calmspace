"""
Privacy-First Storage Engine
Key Principles:
1. Student data is indexed solely by an anonymous session ID (UUID). No names, student IDs or emails required.
2. Reflection text is NEVER persisted in check-in records.
3. Provides full data wipe on request ("Delete all my data").
"""

import uuid
from datetime import UTC, datetime

from app.models.schemas import CheckInRecord, StudyTask, UserSettings


class CalmspaceStorage:
    def __init__(self):
        # Maps session_id -> List[CheckInRecord]
        self._checkins: dict[str, list[CheckInRecord]] = {}
        # Maps session_id -> List[StudyTask]
        self._tasks: dict[str, list[StudyTask]] = {}
        # Maps session_id -> UserSettings
        self._settings: dict[str, UserSettings] = {}

    def get_settings(self, session_id: str) -> UserSettings:
        if session_id not in self._settings:
            self._settings[session_id] = UserSettings()
        return self._settings[session_id]

    def update_settings(
        self, session_id: str, new_settings: UserSettings
    ) -> UserSettings:
        self._settings[session_id] = new_settings
        return self._settings[session_id]

    def add_checkin(
        self, session_id: str, mood: int, stress: int, sleep_hours: float, route: str
    ) -> CheckInRecord:
        record = CheckInRecord(
            id=str(uuid.uuid4()),
            session_id=session_id,
            timestamp=datetime.now(UTC).isoformat(),
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route=route,
        )
        if session_id not in self._checkins:
            self._checkins[session_id] = []
        self._checkins[session_id].append(record)
        return record

    def get_checkins(self, session_id: str) -> list[CheckInRecord]:
        return self._checkins.get(session_id, [])

    def get_tasks(self, session_id: str) -> list[StudyTask]:
        return self._tasks.get(session_id, [])

    def add_task(
        self, session_id: str, title: str, estimated_minutes: int, category: str
    ) -> StudyTask:
        task = StudyTask(
            id=str(uuid.uuid4()),
            title=title,
            estimated_minutes=estimated_minutes,
            category=category,
            completed=False,
            created_at=datetime.now(UTC).isoformat(),
        )
        if session_id not in self._tasks:
            self._tasks[session_id] = []
        self._tasks[session_id].insert(0, task)
        return task

    def toggle_task(self, session_id: str, task_id: str) -> StudyTask | None:
        tasks = self._tasks.get(session_id, [])
        for t in tasks:
            if t.id == task_id:
                t.completed = not t.completed
                return t
        return None

    def delete_task(self, session_id: str, task_id: str) -> bool:
        tasks = self._tasks.get(session_id, [])
        initial_len = len(tasks)
        self._tasks[session_id] = [t for t in tasks if t.id != task_id]
        return len(self._tasks[session_id]) < initial_len

    def delete_all_data(self, session_id: str) -> bool:
        """Completely purges all data associated with the anonymous session"""
        self._checkins.pop(session_id, None)
        self._tasks.pop(session_id, None)
        self._settings.pop(session_id, None)
        return True


# Singleton instance
storage = CalmspaceStorage()
