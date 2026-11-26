# Calmspace Data Inventory & Privacy Specification (Issue #10 & Issue #11)

> **Document Status**: Implemented & Verified (SQLite WAL Storage + Automated Retention + Canary Leak Suite)  
> **Safety Boundary**: `backend/app/services/safety_evaluator.py` remains immutable (Git blob SHA `8f5e2e984c4ab41212a74a16158200b2c7a126b2`).  
> **Guiding Principle**: *"Rules decide safety. AI writes the language. Humans help. Privacy by default."*

---

## 1. Implemented Data Inventory (SQLite WAL Schema)

Calmspace enforces strict data minimization. We do not collect real names, email addresses, university roll numbers, phone numbers, or IP addresses. Persistent storage lives in SQLite (`backend/app/services/storage.py`, WAL mode enabled).

### 1.1 Field-by-Field Inventory Matrix

| Field Name | SQLite Table | Type | Purpose | Stored On Server? | Access Scope | Retention Lifetime |
|---|---|---|---|---|---|---|
| `session_id` | `checkins`, `tasks`, `user_settings` | `TEXT` (Client UUID) | Anonymous session partition key (`X-Session-ID`) | Yes (DB Column / PK) | Client & Server (`WHERE session_id = ?`) | Deleted when all check-ins/tasks/settings are purged |
| `id`, `timestamp` | `checkins` | `TEXT` (UUID, UTC ISO-8601) | Check-in entry ID and chronological ordering | Yes (DB) | Session-scoped (`WHERE session_id = ?`) | Configurable rolling window: `14`, `30` (default), `60`, or `90` days |
| `mood` | `checkins` | `INTEGER` (1–5) | Daily mood rating & insight trend graphs | Yes (DB) | Session-scoped | Rolling window (`14/30/60/90`d) or immediate purge |
| `stress` | `checkins` | `INTEGER` (1–5) | Stress rating & deterministic safety evaluation | Yes (DB) | Session-scoped | Rolling window (`14/30/60/90`d) or immediate purge |
| `sleep_hours` | `checkins` | `REAL` (0.0–24.0) | Rest duration & sleep pattern insights | Yes (DB) | Session-scoped | Rolling window (`14/30/60/90`d) or immediate purge |
| `route` | `checkins` | `TEXT` (`LOW`, `MEDIUM`, `HIGH`) | Deterministic safety classification | Yes (DB) | Session-scoped | Rolling window (`14/30/60/90`d) or immediate purge |
| **`reflection`** | *N/A (Transient)* | `TEXT` ($\le$ 2,000 chars) | Crisis keyword evaluation & opt-in AI guidance | **NO (NEVER PERSISTED)** | Volatile request memory only | Zero DB storage; excluded from logs, stdout/stderr, and 422 responses |
| `id`, `title`, `category`, `estimated_minutes`, `completed`, `created_at` | `tasks` | `TEXT`, `INTEGER` | Study-life balance planner task management | Yes (DB) | Session-scoped | Until deleted by student or purged via `DELETE /api/settings/data` |
| `nickname` | `user_settings` | `TEXT` (1–60 non-blank chars) | Optional dashboard greeting (non-identifying) | Yes (DB) | Session-scoped | Until updated or purged via `DELETE /api/settings/data` |
| `break_reminders_enabled`, `reminder_interval_minutes` | `user_settings` | `INTEGER` (bool), `INTEGER` (`5`–`240`) | In-app study pacing preferences | Yes (DB) | Session-scoped | Until updated or purged via `DELETE /api/settings/data` |
| `share_anonymous_analytics` | `user_settings` | `INTEGER` (bool, default `0`) | Opt-in anonymous trend preference | Yes (DB) | Session-scoped | Until updated or purged via `DELETE /api/settings/data` |
| `data_retention_days`, `planner_seeded` | `user_settings` | `INTEGER` (`14`, `30`, `60`, or `90`), `INTEGER` (bool) | Rolling check-in retention window & one-time starter task seeding state | Yes (DB, defaults `30`, `0`) | Session-scoped | Enforced by `cleanup_expired_records(session_id)`; purged on full data deletion |

---

## 2. Privacy Guarantees, Disclosures & Known Limitations

### 2.1 Pre-Check-in & Point-of-Collection Consent
- **Pre-Check-in Disclosure (`CheckInPage.tsx`)**: Explains that check-ins take ~60 seconds, rules decide safety, reflection text is never saved, and users remain anonymous, with direct modal access to the Data Inventory (`PrivacyInventoryModal.tsx`).
- **Explicit Consent Enforcement (`StrictBool`)**: `consent_ai_processing` defaults to `false` on every check-in. `CheckInRequest` enforces Pydantic `StrictBool`, rejecting coerced strings/integers (`"true"`, `1`) with HTTP `422` without invoking AI.
- **HIGH-Route Zero-Call Guarantee**: Check-ins classified as `HIGH` unconditionally bypass AI (`guidance = None`, 0 provider calls).
- **Sanitized Error Responses**: A custom `RequestValidationError` handler in `backend/app/main.py` strips raw `input` fields from HTTP `422` responses so private reflections are never echoed back.

### 2.2 Retention & Deletion Mechanics
- **Automated Request-Boundary Pruning**: `storage.cleanup_expired_records(session_id)` reads the session's `data_retention_days` (`14`, `30`, `60`, or `90`; invalid inputs coerce to `30`) and atomically deletes `checkins` strictly older than `now - retention_days` (`strftime(...) < cutoff`) across `POST /api/checkin`, `GET /api/checkin/history`, `GET /api/insights`, `compute_session_insights`, and `PUT /api/settings`.
- **High-Route Record Handling**: `HIGH`-route check-in rows store only numeric scores, `route="HIGH"`, and `timestamp` (never reflection text) under the exact same configurable retention window and immediate deletion controls.
- **Transactional 2-Step Deletion (`DELETE /api/settings/data`)**: Deletes all `checkins`, `tasks`, and `user_settings` rows matching `session_id` in a single atomic SQLite transaction, and clears local check-in session cache (`calmspace_latest_checkin`, `calmspace_high_risk_exited`). It does not rotate or revoke an unauthenticated server credential in the current MVP. If deletion fails, `SettingsPage.tsx` preserves the confirmation dialog, displays a failure alert with a Retry control, and never reports false success.
- **High-Risk Safe Exit**: Clicking *"Safe Exit to Overview"* removes `calmspace_latest_checkin`, sets `calmspace_high_risk_exited`, clears router history state, and navigates to `/app` (Overview) without prompting or resuming AI dialogue. Submitting a subsequent check-in clears `calmspace_high_risk_exited` only after the new submission succeeds.

### 2.3 Remaining Architectural Limitations (Honest Scope)
1. **Relational Isolation vs. Authenticated Ownership**: Because Calmspace deliberately collects no emails, logins, or passwords, the browser-generated `X-Session-ID` header acts as an unauthenticated partition key (validated for format only, not cryptographic ownership). Server queries enforce `WHERE session_id = ?`, preventing accidental cross-session mixing, but any party who obtains or guesses another user's `session_id` can read, mutate, or delete that session's records. See [docs/session_authorization_architecture.md](session_authorization_architecture.md) for the server-issued credential architecture proposal and explicit MVP deployment restrictions.
2. **External Provider Policies**: When a student explicitly opts in on `LOW`/`MEDIUM` routes and `CALMSPACE_AI_PROVIDER=gemini` is configured, reflections are transmitted over TLS (`x-goog-api-key` header) to Google Gemini for real-time generation; external provider gateway retention is outside Calmspace's control.
3. **Infrastructure Backups**: Deletion immediately purges live SQLite tables (`checkins`, `tasks`, `user_settings`); any host-level snapshots or backups follow the deployment host's separate lifecycle.

---

## 3. Automated Verification Coverage

All privacy, retention, isolation, and canary leak assertions are verified in the backend test suite:

- `backend/tests/test_retention.py` (12 tests): Exact UTC cutoff boundaries, 14/30/60/90-day enforcement, invalid retention coercion to 30, schema migration, concurrency integrity (`PRAGMA integrity_check`), cross-session pruning isolation, and FastAPI request-boundary integration.
- `backend/tests/test_canary_leakage.py` (16 tests): `SENTINEL_CANARY_REFLECT_*` leak assertions across `caplog`, `capsys`, tracebacks, provider timeout/401/unexpected errors, sanitized `422` validation errors, malformed `StrictBool` consent rejection, `500` responses, SQLite schema/row inspection, HIGH-route zero-call guarantee, cross-session negative access, and Safe Exit failure honesty.
- `backend/tests/test_storage_persistence.py` (5 tests) & `backend/tests/test_ai_guidance.py` (29 tests): Persistence across restarts, session isolation, prompt minimization, and fail-closed fallback behavior.
