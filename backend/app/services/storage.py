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
import hashlib
import hmac
import os
import secrets
import sqlite3
import threading
import uuid
import weakref
from datetime import UTC, datetime, timedelta

from app.models.schemas import (
    CheckInRecord,
    SessionCreateResponse,
    StudyTask,
    UserSettings,
)

_WEAK_PEPPERS = frozenset(
    {
        "changeme",
        "placeholder",
        "secret",
        "default",
        "pepper",
        "your-session-pepper",
        "calmspace-session-pepper",
    }
)


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

            # Anonymous session credentials table (stores salted hashes ONLY, never plaintext secrets)
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS session_credentials (
                    session_id TEXT PRIMARY KEY,
                    secret_hash TEXT NOT NULL,
                    secret_salt TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    revoked_at TEXT DEFAULT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_session_credentials_expires
                ON session_credentials(expires_at);
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
    # Anonymous Session Credentials (Issuance, Verification, Rotation, Revocation)
    # --------------------------------------------------------------------------
    @staticmethod
    def _normalize_utc(now: datetime | None = None) -> datetime:
        if now is None:
            return datetime.now(UTC)
        if now.tzinfo is None:
            return now.replace(tzinfo=UTC)
        return now.astimezone(UTC)

    @staticmethod
    def _parse_iso_utc(raw: str | None) -> datetime | None:
        if not raw:
            return None
        try:
            dt = datetime.fromisoformat(raw)
        except ValueError:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)

    @staticmethod
    def _resolve_session_ttl_days(ttl_days: int | None = None) -> int:
        if ttl_days is None:
            raw = os.getenv("CALMSPACE_SESSION_TTL_DAYS", "90").strip()
            try:
                ttl_days = int(raw)
            except ValueError:
                ttl_days = 90
        return max(1, min(ttl_days, 365))

    @staticmethod
    def is_session_pepper_valid() -> bool:
        """
        In production (`CALMSPACE_ENV=production`), require a non-placeholder
        `CALMSPACE_SESSION_PEPPER` of at least 16 characters.
        """
        env_mode = os.getenv("CALMSPACE_ENV", "development").strip().lower()
        if env_mode != "production":
            return True
        pepper = os.getenv("CALMSPACE_SESSION_PEPPER", "").strip()
        return len(pepper) >= 16 and pepper.lower() not in _WEAK_PEPPERS

    @classmethod
    def _get_session_pepper(cls) -> str:
        pepper = os.getenv("CALMSPACE_SESSION_PEPPER", "").strip()
        env_mode = os.getenv("CALMSPACE_ENV", "development").strip().lower()
        if env_mode == "production" and (
            len(pepper) < 16 or pepper.lower() in _WEAK_PEPPERS
        ):
            raise RuntimeError(
                "CALMSPACE_SESSION_PEPPER must be configured with at least 16 non-placeholder characters in production."
            )
        return pepper

    @classmethod
    def _hash_session_secret(cls, salt_hex: str, session_secret: str) -> str:
        payload = bytes.fromhex(salt_hex) + session_secret.encode("utf-8")
        pepper = cls._get_session_pepper()
        if pepper:
            return hmac.new(pepper.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        return hashlib.sha256(payload).hexdigest()

    def create_session(
        self, ttl_days: int | None = None, now: datetime | None = None
    ) -> SessionCreateResponse:
        """
        Issue a brand-new anonymous session ID (128-bit UUIDv4) and 256-bit CSPRNG secret.
        Only the salted SHA-256/HMAC hash is stored; plaintext secret is returned once.
        """
        now_dt = self._normalize_utc(now)
        resolved_ttl = self._resolve_session_ttl_days(ttl_days)
        session_id = str(uuid.uuid4())
        session_secret = secrets.token_urlsafe(32)
        secret_salt = secrets.token_bytes(16).hex()
        secret_hash = self._hash_session_secret(secret_salt, session_secret)

        now_iso = now_dt.isoformat()
        expires_iso = (now_dt + timedelta(days=resolved_ttl)).isoformat()

        conn = self._get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO session_credentials (
                    session_id, secret_hash, secret_salt,
                    created_at, last_seen_at, expires_at, revoked_at
                ) VALUES (?, ?, ?, ?, ?, ?, NULL);
                """,
                (
                    session_id,
                    secret_hash,
                    secret_salt,
                    now_iso,
                    now_iso,
                    expires_iso,
                ),
            )

        return SessionCreateResponse(
            session_id=session_id,
            session_secret=session_secret,
            expires_at=expires_iso,
        )

    def verify_session_credential(
        self,
        session_id: str,
        session_secret: str,
        now: datetime | None = None,
        touch_last_seen: bool = True,
        ttl_days: int | None = None,
    ) -> bool:
        """
        Verify a session credential in constant time, enforcing expiry and revocation.
        """
        if not session_id or not session_secret:
            return False

        conn = self._get_connection()
        row = conn.execute(
            """
            SELECT secret_hash, secret_salt, expires_at, revoked_at
            FROM session_credentials
            WHERE session_id = ?;
            """,
            (session_id,),
        ).fetchone()

        if not row:
            return False

        if row["revoked_at"] is not None:
            return False

        now_dt = self._normalize_utc(now)
        expires_dt = self._parse_iso_utc(row["expires_at"])
        if expires_dt is None or expires_dt <= now_dt:
            return False

        try:
            computed_hash = self._hash_session_secret(
                row["secret_salt"], session_secret
            )
        except ValueError:
            return False

        if not hmac.compare_digest(computed_hash, row["secret_hash"]):
            return False

        if touch_last_seen:
            resolved_ttl = self._resolve_session_ttl_days(ttl_days)
            new_expires_iso = (now_dt + timedelta(days=resolved_ttl)).isoformat()
            with conn:
                cursor = conn.execute(
                    """
                    UPDATE session_credentials
                    SET last_seen_at = ?, expires_at = ?
                    WHERE session_id = ? AND secret_hash = ? AND revoked_at IS NULL;
                    """,
                    (
                        now_dt.isoformat(),
                        new_expires_iso,
                        session_id,
                        row["secret_hash"],
                    ),
                )
                if cursor.rowcount == 0:
                    return False
        else:
            still_valid = conn.execute(
                """
                SELECT 1
                FROM session_credentials
                WHERE session_id = ? AND secret_hash = ? AND revoked_at IS NULL;
                """,
                (session_id, row["secret_hash"]),
            ).fetchone()
            if not still_valid:
                return False

        return True

    def revoke_session(self, session_id: str, now: datetime | None = None) -> bool:
        """Mark a session credential as revoked so all future calls fail with 401."""
        if not session_id:
            return False
        now_iso = self._normalize_utc(now).isoformat()
        conn = self._get_connection()
        with conn:
            cursor = conn.execute(
                """
                UPDATE session_credentials
                SET revoked_at = ?
                WHERE session_id = ? AND revoked_at IS NULL;
                """,
                (now_iso, session_id),
            )
            return cursor.rowcount > 0

    def rotate_session_secret(
        self,
        session_id: str,
        ttl_days: int | None = None,
        now: datetime | None = None,
        current_secret: str | None = None,
        expected_secret_hash: str | None = None,
    ) -> SessionCreateResponse | None:
        """
        Atomically issue a fresh 256-bit secret for an active non-revoked, non-expired session
        using optimistic concurrency against the prior secret hash, invalidating the prior
        secret immediately while preserving session data.
        """
        if not session_id:
            return None

        now_dt = self._normalize_utc(now)
        conn = self._get_connection()
        row = conn.execute(
            """
            SELECT secret_hash, secret_salt, expires_at, revoked_at
            FROM session_credentials
            WHERE session_id = ?;
            """,
            (session_id,),
        ).fetchone()

        if not row or row["revoked_at"] is not None:
            return None

        expires_dt = self._parse_iso_utc(row["expires_at"])
        if expires_dt is None or expires_dt <= now_dt:
            return None

        prior_hash = row["secret_hash"]
        if current_secret is not None:
            try:
                computed = self._hash_session_secret(row["secret_salt"], current_secret)
            except ValueError:
                return None
            if not hmac.compare_digest(computed, prior_hash):
                return None
        elif expected_secret_hash is not None and not hmac.compare_digest(
            expected_secret_hash, prior_hash
        ):
            return None

        resolved_ttl = self._resolve_session_ttl_days(ttl_days)
        new_secret = secrets.token_urlsafe(32)
        new_salt = secrets.token_bytes(16).hex()
        new_hash = self._hash_session_secret(new_salt, new_secret)
        now_iso = now_dt.isoformat()
        new_expires_iso = (now_dt + timedelta(days=resolved_ttl)).isoformat()

        with conn:
            cursor = conn.execute(
                """
                UPDATE session_credentials
                SET secret_hash = ?, secret_salt = ?, last_seen_at = ?, expires_at = ?
                WHERE session_id = ? AND secret_hash = ? AND revoked_at IS NULL;
                """,
                (
                    new_hash,
                    new_salt,
                    now_iso,
                    new_expires_iso,
                    session_id,
                    prior_hash,
                ),
            )
            if cursor.rowcount != 1:
                return None

        return SessionCreateResponse(
            session_id=session_id,
            session_secret=new_secret,
            expires_at=new_expires_iso,
        )

    def cleanup_expired_sessions(
        self, now: datetime | None = None, purge_orphaned_data: bool = True
    ) -> int:
        """
        Purge expired or revoked session credentials and, optionally, their orphaned
        check-in, task, and settings rows in a single atomic transaction.
        """
        now_dt = self._normalize_utc(now)
        conn = self._get_connection()
        rows = conn.execute(
            """
            SELECT session_id, expires_at, revoked_at
            FROM session_credentials;
            """
        ).fetchall()

        expired_ids: list[str] = []
        for row in rows:
            if row["revoked_at"] is not None:
                expired_ids.append(row["session_id"])
                continue
            expires_dt = self._parse_iso_utc(row["expires_at"])
            if expires_dt is None or expires_dt <= now_dt:
                expired_ids.append(row["session_id"])

        if not expired_ids:
            return 0

        placeholders = ", ".join("?" for _ in expired_ids)
        with conn:
            if purge_orphaned_data:
                conn.execute(
                    f"DELETE FROM checkins WHERE session_id IN ({placeholders});",
                    tuple(expired_ids),
                )
                conn.execute(
                    f"DELETE FROM tasks WHERE session_id IN ({placeholders});",
                    tuple(expired_ids),
                )
                conn.execute(
                    f"DELETE FROM user_settings WHERE session_id IN ({placeholders});",
                    tuple(expired_ids),
                )
            cursor = conn.execute(
                f"DELETE FROM session_credentials WHERE session_id IN ({placeholders});",
                tuple(expired_ids),
            )
            return cursor.rowcount

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
    # Privacy Data Erasure (2-Step Data Deletion)
    # --------------------------------------------------------------------------
    def delete_all_data(self, session_id: str) -> bool:
        """
        Permanently purges all records associated with this session token across
        all tables: check-in records, study tasks, user settings, and session credentials.
        """
        conn = self._get_connection()
        with conn:
            conn.execute("DELETE FROM checkins WHERE session_id = ?;", (session_id,))
            conn.execute("DELETE FROM tasks WHERE session_id = ?;", (session_id,))
            conn.execute(
                "DELETE FROM user_settings WHERE session_id = ?;", (session_id,)
            )
            conn.execute(
                "DELETE FROM session_credentials WHERE session_id = ?;", (session_id,)
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
