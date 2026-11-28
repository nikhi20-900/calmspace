"""
Privacy-First Persistent Storage Engine (Issue #10)

Key Principles:
1. Student data is indexed solely by an anonymous session ID (UUID / token).
   No names, student roll numbers, or personal emails are collected or stored.
2. Reflection text is NEVER stored in database records (Structural Privacy Guarantee).
3. Session Isolation: Every read, update, and delete query is strictly session-scoped.
4. Full 2-step data wipe on request ("Delete all my data").
5. Persistent storage using SQLite / SQL engine, surviving application restarts.
"""

import atexit
import os
import sqlite3
import threading
import uuid
import weakref
from datetime import UTC, datetime, timedelta

from app.models.companion_schemas import CompanionPreferences, ReminderRecord
from app.models.schemas import CheckInRecord, StudyTask, UserSettings


class _ThreadConnectionHolder:
    """Closes a thread-local SQLite connection automatically if its thread exits."""

    def __init__(
        self,
        conn: sqlite3.Connection,
        registry: set[sqlite3.Connection],
        lock: threading.Lock,
    ):
        self.conn: sqlite3.Connection | None = conn
        self._registry = registry
        self._lock = lock

    def close(self) -> None:
        conn = self.conn
        self.conn = None
        if conn is not None:
            with self._lock:
                self._registry.discard(conn)
            try:
                conn.close()
            except sqlite3.Error:
                pass

    def __del__(self) -> None:
        self.close()


def _close_tracked_connections(
    registry: set[sqlite3.Connection], lock: threading.Lock
) -> None:
    with lock:
        conns = list(registry)
        registry.clear()
    for conn in conns:
        try:
            conn.close()
        except sqlite3.Error:
            pass


class CalmspaceStorage:
    def __init__(self, db_path: str | None = None):
        if db_path is None:
            raw_url = os.getenv("DATABASE_URL", "sqlite:///./calmspace.db")
            if raw_url.startswith("sqlite:///"):
                db_path = raw_url.replace("sqlite:///", "")
            else:
                db_path = raw_url
        self.db_path = db_path
        self._local = threading.local()
        self._connections: set[sqlite3.Connection] = set()
        self._conn_lock = threading.Lock()
        self._finalizer = weakref.finalize(
            self, _close_tracked_connections, self._connections, self._conn_lock
        )
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        holder: _ThreadConnectionHolder | None = getattr(self._local, "holder", None)
        if holder is None or holder.conn is None:
            conn = sqlite3.connect(
                self.db_path,
                timeout=30.0,
                check_same_thread=False,
            )
            conn.row_factory = sqlite3.Row
            # Enable WAL mode for high concurrency and resilience if not in-memory
            if self.db_path != ":memory:":
                try:
                    conn.execute("PRAGMA journal_mode = WAL;")
                    conn.execute("PRAGMA synchronous = NORMAL;")
                except sqlite3.DatabaseError:
                    pass
            with self._conn_lock:
                self._connections.add(conn)
            holder = _ThreadConnectionHolder(conn, self._connections, self._conn_lock)
            self._local.holder = holder
        return holder.conn

    def _init_db(self):
        """Create tables and indexes if they do not exist."""
        conn = self._get_connection()
        with conn:
            # Check-ins table (NOTICE: NO reflection column! Reflections are NEVER persisted)
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS checkins (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    mood INTEGER NOT NULL,
                    stress INTEGER NOT NULL,
                    sleep_hours REAL NOT NULL,
                    route TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_checkins_session_time
                ON checkins(session_id, timestamp);
                """
            )

            # Study tasks table
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    estimated_minutes INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_tasks_session
                ON tasks(session_id, created_at DESC);
                """
            )

            # User settings table
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_settings (
                    session_id TEXT PRIMARY KEY,
                    nickname TEXT NOT NULL DEFAULT 'Student',
                    break_reminders_enabled INTEGER NOT NULL DEFAULT 1,
                    reminder_interval_minutes INTEGER NOT NULL DEFAULT 45,
                    share_anonymous_analytics INTEGER NOT NULL DEFAULT 0,
                    data_retention_days INTEGER NOT NULL DEFAULT 30,
                    planner_seeded INTEGER NOT NULL DEFAULT 0
                );
                """
            )

            # Defensive migrations for older local SQLite schemas
            cursor = conn.execute("PRAGMA table_info(user_settings);")
            columns = [row[1] for row in cursor.fetchall()]
            if columns and "data_retention_days" not in columns:
                conn.execute(
                    "ALTER TABLE user_settings ADD COLUMN data_retention_days INTEGER NOT NULL DEFAULT 30;"
                )
            if columns and "planner_seeded" not in columns:
                conn.execute(
                    "ALTER TABLE user_settings ADD COLUMN planner_seeded INTEGER NOT NULL DEFAULT 0;"
                )

            # Reminders table (session-scoped, created only after explicit user confirmation)
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS reminders (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    delay_minutes INTEGER NOT NULL,
                    remind_at TEXT NOT NULL,
                    active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reminders_session
                ON reminders(session_id, created_at DESC);
                """
            )

            # Companion preferences table (opt-in study goals & pacing preferences)
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS companion_preferences (
                    session_id TEXT PRIMARY KEY,
                    study_goal TEXT,
                    preferred_study_block_minutes INTEGER NOT NULL DEFAULT 25,
                    preferred_break_minutes INTEGER NOT NULL DEFAULT 5,
                    preferred_tone TEXT NOT NULL DEFAULT 'warm',
                    updated_at TEXT NOT NULL
                );
                """
            )

    def has_planner_seeded(self, session_id: str) -> bool:
        """Return True if starter planner tasks were already seeded for this session."""
        conn = self._get_connection()
        row = conn.execute(
            "SELECT planner_seeded FROM user_settings WHERE session_id = ?;",
            (session_id,),
        ).fetchone()
        return bool(row and row["planner_seeded"])

    def mark_planner_seeded(self, session_id: str) -> None:
        """Persist that initial starter planner tasks were provided for this session."""
        conn = self._get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO user_settings (session_id, planner_seeded)
                VALUES (?, 1)
                ON CONFLICT(session_id) DO UPDATE SET planner_seeded = 1;
                """,
                (session_id,),
            )

    def check_health(self) -> bool:
        """Verify database connectivity without reading or exposing any user data."""
        conn = self._get_connection()
        conn.execute("SELECT 1;").fetchone()
        return True

    # --------------------------------------------------------------------------
    # Settings Management (Session-Scoped)
    # --------------------------------------------------------------------------
    def get_settings(self, session_id: str) -> UserSettings:
        conn = self._get_connection()
        row = conn.execute(
            """
            SELECT nickname, break_reminders_enabled, reminder_interval_minutes,
                   share_anonymous_analytics, data_retention_days
            FROM user_settings
            WHERE session_id = ?;
            """,
            (session_id,),
        ).fetchone()

        if not row:
            # Return defaults without persisting until user saves or customizes
            return UserSettings()

        return UserSettings(
            nickname=row["nickname"],
            break_reminders_enabled=bool(row["break_reminders_enabled"]),
            reminder_interval_minutes=row["reminder_interval_minutes"],
            share_anonymous_analytics=bool(row["share_anonymous_analytics"]),
            data_retention_days=row["data_retention_days"],
        )

    def update_settings(
        self, session_id: str, new_settings: UserSettings
    ) -> UserSettings:
        conn = self._get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO user_settings (
                    session_id, nickname, break_reminders_enabled,
                    reminder_interval_minutes, share_anonymous_analytics, data_retention_days
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    nickname=excluded.nickname,
                    break_reminders_enabled=excluded.break_reminders_enabled,
                    reminder_interval_minutes=excluded.reminder_interval_minutes,
                    share_anonymous_analytics=excluded.share_anonymous_analytics,
                    data_retention_days=excluded.data_retention_days;
                """,
                (
                    session_id,
                    new_settings.nickname,
                    1 if new_settings.break_reminders_enabled else 0,
                    new_settings.reminder_interval_minutes,
                    1 if new_settings.share_anonymous_analytics else 0,
                    new_settings.data_retention_days,
                ),
            )
        return new_settings

    # --------------------------------------------------------------------------
    # Check-In Records (Session-Scoped, No Reflection Persisted)
    # --------------------------------------------------------------------------
    def add_checkin(
        self,
        session_id: str,
        mood: int,
        stress: int,
        sleep_hours: float,
        route: str,
        timestamp: str | None = None,
    ) -> CheckInRecord:
        record_id = str(uuid.uuid4())
        if timestamp is None:
            timestamp = datetime.now(UTC).isoformat()

        conn = self._get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO checkins (id, session_id, timestamp, mood, stress, sleep_hours, route)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (record_id, session_id, timestamp, mood, stress, sleep_hours, route),
            )

        return CheckInRecord(
            id=record_id,
            session_id=session_id,
            timestamp=timestamp,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route=route,
        )

    def get_checkins(self, session_id: str) -> list[CheckInRecord]:
        conn = self._get_connection()
        rows = conn.execute(
            """
            SELECT id, session_id, timestamp, mood, stress, sleep_hours, route
            FROM checkins
            WHERE session_id = ?
            ORDER BY timestamp ASC;
            """,
            (session_id,),
        ).fetchall()

        return [
            CheckInRecord(
                id=r["id"],
                session_id=r["session_id"],
                timestamp=r["timestamp"],
                mood=r["mood"],
                stress=r["stress"],
                sleep_hours=r["sleep_hours"],
                route=r["route"],
            )
            for r in rows
        ]

    # --------------------------------------------------------------------------
    # Retention Management & Automated Pruning (Issue #11 Stage 2)
    # --------------------------------------------------------------------------
    def cleanup_expired_records(
        self, session_id: str, now: datetime | None = None
    ) -> int:
        """
        Deletes check-in records older than the session's configured data_retention_days.

        Enforces:
        1. Reads session's configured retention period from user_settings (or default 30d).
        2. Supports exactly 14, 30, 60, and 90 days. Falls back to 30 days for any other value.
        3. Scoped strictly via `WHERE session_id = ?` to prevent cross-session deletion.
        4. Calculates cutoff using consistent UTC timestamps.
        5. Atomic transaction execution with safe handling for empty / missing tables.
        6. Preserves essential configuration (user_settings) and active study planner tasks.

        Returns:
            int: The number of pruned check-in records.
        """
        if not session_id:
            return 0

        # Read configured retention days for this session
        settings = self.get_settings(session_id)
        retention_days = settings.data_retention_days
        allowed_retention = {14, 30, 60, 90}
        if retention_days not in allowed_retention:
            retention_days = 30

        # Calculate expiry using consistent UTC datetime
        if now is None:
            now_dt = datetime.now(UTC)
        elif now.tzinfo is None:
            now_dt = now.replace(tzinfo=UTC)
        else:
            now_dt = now.astimezone(UTC)

        cutoff = now_dt - timedelta(days=retention_days)
        cutoff_iso = cutoff.isoformat()

        conn = self._get_connection()
        with conn:
            cursor = conn.execute(
                """
                DELETE FROM checkins
                WHERE session_id = ?
                  AND strftime('%Y-%m-%d %H:%M:%f', timestamp) < strftime('%Y-%m-%d %H:%M:%f', ?);
                """,
                (session_id, cutoff_iso),
            )
            return cursor.rowcount

    # --------------------------------------------------------------------------
    # Study Tasks (Session-Scoped)
    # --------------------------------------------------------------------------
    def get_tasks(self, session_id: str) -> list[StudyTask]:
        conn = self._get_connection()
        rows = conn.execute(
            """
            SELECT id, title, estimated_minutes, category, completed, created_at
            FROM tasks
            WHERE session_id = ?
            ORDER BY created_at DESC;
            """,
            (session_id,),
        ).fetchall()

        return [
            StudyTask(
                id=r["id"],
                title=r["title"],
                estimated_minutes=r["estimated_minutes"],
                category=r["category"],
                completed=bool(r["completed"]),
                created_at=r["created_at"],
            )
            for r in rows
        ]

    def add_task(
        self, session_id: str, title: str, estimated_minutes: int, category: str
    ) -> StudyTask:
        task_id = str(uuid.uuid4())
        created_at = datetime.now(UTC).isoformat()

        conn = self._get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO tasks (id, session_id, title, estimated_minutes, category, completed, created_at)
                VALUES (?, ?, ?, ?, ?, 0, ?);
                """,
                (task_id, session_id, title, estimated_minutes, category, created_at),
            )

        return StudyTask(
            id=task_id,
            title=title,
            estimated_minutes=estimated_minutes,
            category=category,
            completed=False,
            created_at=created_at,
        )

    def toggle_task(self, session_id: str, task_id: str) -> StudyTask | None:
        conn = self._get_connection()
        with conn:
            # Atomic session-scoped toggle
            cursor = conn.execute(
                """
                UPDATE tasks
                SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END
                WHERE id = ? AND session_id = ?;
                """,
                (task_id, session_id),
            )
            if cursor.rowcount == 0:
                return None

        # Fetch and return updated task
        row = conn.execute(
            """
            SELECT id, title, estimated_minutes, category, completed, created_at
            FROM tasks
            WHERE id = ? AND session_id = ?;
            """,
            (task_id, session_id),
        ).fetchone()

        if not row:
            return None

        return StudyTask(
            id=row["id"],
            title=row["title"],
            estimated_minutes=row["estimated_minutes"],
            category=row["category"],
            completed=bool(row["completed"]),
            created_at=row["created_at"],
        )

    def update_task(
        self,
        session_id: str,
        task_id: str,
        title: str | None = None,
        estimated_minutes: int | None = None,
        category: str | None = None,
    ) -> StudyTask | None:
        conn = self._get_connection()
        fields = []
        values = []
        if title is not None:
            fields.append("title = ?")
            values.append(title)
        if estimated_minutes is not None:
            fields.append("estimated_minutes = ?")
            values.append(estimated_minutes)
        if category is not None:
            fields.append("category = ?")
            values.append(category)

        if fields:
            values.extend([task_id, session_id])
            with conn:
                cursor = conn.execute(
                    f"""
                    UPDATE tasks
                    SET {", ".join(fields)}
                    WHERE id = ? AND session_id = ?;
                    """,
                    tuple(values),
                )
                if cursor.rowcount == 0:
                    return None

        row = conn.execute(
            """
            SELECT id, title, estimated_minutes, category, completed, created_at
            FROM tasks
            WHERE id = ? AND session_id = ?;
            """,
            (task_id, session_id),
        ).fetchone()

        if not row:
            return None

        return StudyTask(
            id=row["id"],
            title=row["title"],
            estimated_minutes=row["estimated_minutes"],
            category=row["category"],
            completed=bool(row["completed"]),
            created_at=row["created_at"],
        )

    def delete_task(self, session_id: str, task_id: str) -> bool:
        conn = self._get_connection()
        with conn:
            cursor = conn.execute(
                """
                DELETE FROM tasks
                WHERE id = ? AND session_id = ?;
                """,
                (task_id, session_id),
            )
            return cursor.rowcount > 0

    # --------------------------------------------------------------------------
    # Companion Reminders & Opt-In Preferences (Session-Scoped)
    # --------------------------------------------------------------------------
    def add_reminder(
        self,
        session_id: str,
        title: str,
        category: str,
        delay_minutes: int,
    ) -> ReminderRecord:
        reminder_id = str(uuid.uuid4())
        now = datetime.now(UTC)
        created_at = now.isoformat()
        remind_at = (now + timedelta(minutes=delay_minutes)).isoformat()

        conn = self._get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO reminders (
                    id, session_id, title, category, delay_minutes, remind_at, active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 1, ?);
                """,
                (
                    reminder_id,
                    session_id,
                    title,
                    category,
                    delay_minutes,
                    remind_at,
                    created_at,
                ),
            )

        return ReminderRecord(
            id=reminder_id,
            session_id=session_id,
            title=title,
            category=category,  # type: ignore[arg-type]
            delay_minutes=delay_minutes,
            remind_at=remind_at,
            active=True,
            created_at=created_at,
        )

    def get_reminders(
        self, session_id: str, active_only: bool = True
    ) -> list[ReminderRecord]:
        conn = self._get_connection()
        query = """
            SELECT id, session_id, title, category, delay_minutes, remind_at, active, created_at
            FROM reminders
            WHERE session_id = ?
        """
        if active_only:
            query += " AND active = 1"
        query += " ORDER BY created_at DESC;"

        rows = conn.execute(query, (session_id,)).fetchall()
        return [
            ReminderRecord(
                id=r["id"],
                session_id=r["session_id"],
                title=r["title"],
                category=r["category"],
                delay_minutes=r["delay_minutes"],
                remind_at=r["remind_at"],
                active=bool(r["active"]),
                created_at=r["created_at"],
            )
            for r in rows
        ]

    def delete_reminder(self, session_id: str, reminder_id: str) -> bool:
        conn = self._get_connection()
        with conn:
            cursor = conn.execute(
                "DELETE FROM reminders WHERE id = ? AND session_id = ?;",
                (reminder_id, session_id),
            )
            return cursor.rowcount > 0

    def complete_reminder(self, session_id: str, reminder_id: str) -> bool:
        """Marks an active session-scoped reminder as completed/dismissed."""
        conn = self._get_connection()
        with conn:
            cursor = conn.execute(
                "UPDATE reminders SET active = 0 WHERE id = ? AND session_id = ?;",
                (reminder_id, session_id),
            )
            return cursor.rowcount > 0

    def snooze_reminder(
        self, session_id: str, reminder_id: str, minutes: int = 10
    ) -> ReminderRecord | None:
        """Reschedules an active session-scoped reminder forward from now."""
        now = datetime.now(UTC)
        new_remind_at = (now + timedelta(minutes=minutes)).isoformat()
        conn = self._get_connection()
        with conn:
            cursor = conn.execute(
                """
                UPDATE reminders
                SET delay_minutes = ?, remind_at = ?, active = 1
                WHERE id = ? AND session_id = ?;
                """,
                (minutes, new_remind_at, reminder_id, session_id),
            )
            if cursor.rowcount == 0:
                return None

        row = conn.execute(
            """
            SELECT id, session_id, title, category, delay_minutes, remind_at, active, created_at
            FROM reminders
            WHERE id = ? AND session_id = ?;
            """,
            (reminder_id, session_id),
        ).fetchone()
        if not row:
            return None
        return ReminderRecord(
            id=row["id"],
            session_id=row["session_id"],
            title=row["title"],
            category=row["category"],
            delay_minutes=row["delay_minutes"],
            remind_at=row["remind_at"],
            active=bool(row["active"]),
            created_at=row["created_at"],
        )

    def get_companion_preferences(self, session_id: str) -> CompanionPreferences:
        conn = self._get_connection()
        row = conn.execute(
            """
            SELECT study_goal, preferred_study_block_minutes, preferred_break_minutes, preferred_tone
            FROM companion_preferences
            WHERE session_id = ?;
            """,
            (session_id,),
        ).fetchone()
        if not row:
            return CompanionPreferences()
        return CompanionPreferences(
            study_goal=row["study_goal"],
            preferred_study_block_minutes=row["preferred_study_block_minutes"],
            preferred_break_minutes=row["preferred_break_minutes"],
            preferred_tone=row["preferred_tone"],
        )

    def update_companion_preferences(
        self, session_id: str, prefs: CompanionPreferences
    ) -> CompanionPreferences:
        updated_at = datetime.now(UTC).isoformat()
        conn = self._get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO companion_preferences (
                    session_id, study_goal, preferred_study_block_minutes,
                    preferred_break_minutes, preferred_tone, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    study_goal=excluded.study_goal,
                    preferred_study_block_minutes=excluded.preferred_study_block_minutes,
                    preferred_break_minutes=excluded.preferred_break_minutes,
                    preferred_tone=excluded.preferred_tone,
                    updated_at=excluded.updated_at;
                """,
                (
                    session_id,
                    prefs.study_goal,
                    prefs.preferred_study_block_minutes,
                    prefs.preferred_break_minutes,
                    prefs.preferred_tone,
                    updated_at,
                ),
            )
        return prefs

    # --------------------------------------------------------------------------
    # Privacy Data Erasure (2-Step Data Deletion)
    # --------------------------------------------------------------------------
    def delete_all_data(self, session_id: str) -> bool:
        """
        Permanently purges all records associated with this session token across
        all tables: check-in records, study tasks, reminders, companion preferences, and user settings.
        """
        conn = self._get_connection()
        with conn:
            conn.execute("DELETE FROM checkins WHERE session_id = ?;", (session_id,))
            conn.execute("DELETE FROM tasks WHERE session_id = ?;", (session_id,))
            conn.execute("DELETE FROM reminders WHERE session_id = ?;", (session_id,))
            conn.execute(
                "DELETE FROM companion_preferences WHERE session_id = ?;",
                (session_id,),
            )
            conn.execute(
                "DELETE FROM user_settings WHERE session_id = ?;", (session_id,)
            )
        return True

    def close(self):
        """Close all tracked SQLite connections across threads."""
        if hasattr(self._local, "holder") and self._local.holder is not None:
            self._local.holder.close()
            self._local.holder = None
        _close_tracked_connections(self._connections, self._conn_lock)


# Global singleton instance
storage = CalmspaceStorage()
atexit.register(storage.close)
