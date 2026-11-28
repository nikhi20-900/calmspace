# Calmspace Session Authorization Architecture

> **Status**: Implemented (Stage 1 Security Hardening)  
> **Safety Boundary**: `backend/app/services/safety_evaluator.py` remains untouched (Git blob SHA `8f5e2e984c4ab41212a74a16158200b2c7a126b2`).  
> **Privacy Guarantee**: Preserves zero-PII anonymity (no email, password, roll number, or phone number required).

---

## 1. Background: Why Client-Supplied `X-Session-ID` Was Replaced

Prior to Stage 1 hardening, the browser generated `'student-' + 8 hex chars` in `localStorage` and sent `X-Session-ID`. Format validation prevented accidental collision into a shared default bucket, **but did not provide cryptographic authorization**:
- Any HTTP client could supply an arbitrary syntactically valid `X-Session-ID` without proving possession of a secret.
- A 32-bit client ID risked enumeration on an exposed endpoint.
- `DELETE /api/settings/data` purged rows, but could not revoke a client-supplied identifier on the server.

All session-scoped endpoints now strictly enforce **server-issued anonymous Bearer credentials** (`Authorization: Bearer <session_id>.<session_secret>`), rejecting unauthenticated `X-Session-ID`-only requests with HTTP `401 Unauthorized`.

---

## 2. Implemented Server-Issued Credential Architecture

The implemented design preserves full student anonymity (zero PII or login forms) while separating **public partition identity (`session_id`)** from **secret proof of ownership (`session_secret`)**.

### 2.1 Credential Issuance & CSPRNG Secret Generation (`POST /api/sessions`)
- `CalmspaceStorage.create_session()` generates:
  - `session_id = str(uuid.uuid4())` (128-bit UUIDv4 partition key).
  - `session_secret = secrets.token_urlsafe(32)` (256-bit OS CSPRNG entropy; never truncated).
  - `secret_salt = secrets.token_bytes(16).hex()` (16-byte per-session salt).
- `POST /api/sessions` returns `{ session_id, session_secret, expires_at, token_type: "Bearer" }` **once** with `Cache-Control: no-store` and `Pragma: no-cache`.

### 2.2 Secure Storage of Credential Hashes
`backend/app/services/storage.py` creates and indexes `session_credentials`:

```sql
CREATE TABLE IF NOT EXISTS session_credentials (
    session_id TEXT PRIMARY KEY,
    secret_hash TEXT NOT NULL,          -- Salted SHA-256 or HMAC-SHA256 when CALMSPACE_SESSION_PEPPER is set
    secret_salt TEXT NOT NULL,          -- 16-byte CSPRNG per-session salt (hex)
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,           -- Sliding inactivity expiry (default 90 days via CALMSPACE_SESSION_TTL_DAYS)
    revoked_at TEXT DEFAULT NULL        -- Non-null when revoked
);
```

- `session_secret` is **never stored in plaintext** in database tables, logs, or error payloads.

### 2.3 Constant-Time Credential Verification (`backend/app/core/session.py`)
- Clients authenticate requests via `Authorization: Bearer <session_id>.<session_secret>`.
- FastAPI dependency `require_authenticated_session()`:
  1. Parses `session_id` and `session_secret` from `Authorization: Bearer`.
  2. Rejects any mismatched `X-Session-ID` header if also supplied, and never accepts `X-Session-ID` alone.
  3. Calls `storage.verify_session_credential(session_id, session_secret)`, which checks row existence, `revoked_at IS NULL`, `expires_at > now_utc`, and `hmac.compare_digest(computed_hash, row.secret_hash)`.
  4. Returns uniform HTTP `401 Unauthorized` (`WWW-Authenticate: Bearer`, `"Invalid or expired session credential."`) on any failure so no validation oracle is exposed.
  5. On valid verification, updates `last_seen_at` and slides `expires_at` forward by `CALMSPACE_SESSION_TTL_DAYS`.

### 2.4 Credential Revocation, Rotation & Data Deletion
- **Explicit Revocation (`POST /api/sessions/revoke`)**: Sets `revoked_at = now_utc` and clears in-memory AI rate-limit state; all subsequent calls fail immediately with `401`.
- **Credential Rotation (`POST /api/sessions/rotate`)**: Authenticated caller receives a fresh 256-bit `session_secret` (`secret_salt` and `secret_hash` updated atomically while preserving existing check-ins, tasks, and settings); the old secret fails immediately with `401`.
- **Permanent Data Deletion (`DELETE /api/settings/data`)**: Atomically deletes matching rows across `checkins`, `tasks`, `user_settings`, and `session_credentials` in one SQLite transaction and clears local credentials (`calmspace_session_credential`), so reusing the deleted Bearer token immediately fails with `401 Unauthorized`.
- **Orphan & Expired Session Cleanup (`cleanup_expired_sessions`)**: Atomically purges expired or revoked `session_credentials` rows and any orphaned `checkins`, `tasks`, and `user_settings`.

### 2.5 Frontend Handling (`frontend/src/services/api.ts`)
- Calls `POST /api/sessions` (single-flight deduplicated) when no valid non-expired credential is present in `localStorage` (`calmspace_session_credential`), removing any legacy `calmspace_anonymous_session_id` key.
- Sends `Authorization: Bearer <session_id>.<session_secret>` on all session-scoped API requests.
- Clears credentials on `deleteAllData()`, and handles `401` expiry/revocation safely (re-bootstrapping idempotent/read/new-check-in calls once while failing closed on task/settings/delete mutations).
- **Remaining Limitation**: Because static frontend and backend services may be deployed on separate origins, the Bearer credential is stored in `localStorage` rather than an `HttpOnly` cookie; XSS hygiene and single-device privacy remain important.
