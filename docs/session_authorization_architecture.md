# Calmspace Session Authorization Architecture Proposal

> **Status**: Architecture Proposal & Risk Documentation (Not Implemented in Anonymous MVP)  
> **Safety Boundary**: `backend/app/services/safety_evaluator.py` remains untouched (Git blob SHA `8f5e2e984c4ab41212a74a16158200b2c7a126b2`).  
> **Privacy Guarantee**: Preserves zero-PII anonymity (no email, password, roll number, or phone number required).

---

## 1. Current Architecture & Known Authorization Boundary Limitations

### 1.1 How the Anonymous MVP Works Today
1. The browser generates a client-side identifier (`calmspace_anonymous_session_id` in `localStorage`, currently `'student-' + 8 hex chars`, ~32 bits of entropy).
2. Every session-scoped API call sends `X-Session-ID: <id>`.
3. `backend/app/core/session.py` (`require_session_id`) validates header syntax (`8–128` chars, alphanumeric endpoints, rejects degenerate/reserved placeholders such as `anonymous-default-session`, `..`, `null`, `undefined`).
4. SQLite queries in `backend/app/services/storage.py` partition all rows by `WHERE session_id = ?` across `checkins`, `tasks`, and `user_settings`.

### 1.2 Why Identifier Validation Is Not Authentication
Format validation prevents accidental collision into a shared default bucket, **but does not provide cryptographic authorization**:
- **Self-asserted identifier**: Any HTTP client can supply an arbitrary syntactically valid `X-Session-ID` without proving possession of a secret.
- **Guessability / Enumeration risk**: The current client generator (`crypto.randomUUID().slice(0, 8)`) provides only 32 bits of randomness, making brute-force guessing feasible on an exposed network endpoint.
- **Possession = full access**: Anyone who observes, guesses, or extracts a `session_id` (e.g., via shared device, proxy log, or XSS) can read check-in summaries/history, edit planner tasks, or call `DELETE /api/settings/data`.
- **No server-side revocation**: `DELETE /api/settings/data` purges database rows, but the same `X-Session-ID` string can immediately be reused because no server-side credential record exists to revoke.

### 1.3 Explicit Deployment Restriction (Until Server-Issued Credentials Are Approved & Implemented)
Until this architecture is implemented:
- Deploy Calmspace **only** for local evaluation, hackathon demonstration, or trusted single-user/local-device environments.
- Do **not** deploy Calmspace as a multi-tenant internet-facing service with sensitive production student records, and do **not** represent `X-Session-ID` as cryptographic identity or account authentication.

---

## 2. Proposed Server-Issued Credential Architecture

The target design preserves full student anonymity (no PII or login forms) while separating **public partition identity (`session_id`)** from **secret proof of ownership (`session_secret`)**.

### 2.1 Credential Issuance & CSPRNG Secret Generation
- Introduce `POST /api/sessions` (or automatic bootstrap when no credential exists):
  - Generate `session_id = str(uuid.uuid4())` (128-bit UUIDv4 partition key).
  - Generate `session_secret = secrets.token_urlsafe(32)` (256-bit OS CSPRNG entropy; never truncated).
  - Return `{ session_id, session_secret, expires_at }` **once** at issuance (or set `session_secret` in an `HttpOnly; Secure; SameSite=Lax` cookie for web clients, avoiding `localStorage` XSS exposure).

### 2.2 Secure Storage of Credential Hashes
Add a `session_credentials` table in SQLite / PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS session_credentials (
    session_id TEXT PRIMARY KEY,
    secret_hash TEXT NOT NULL,          -- HMAC-SHA256(pepper, session_secret) or SHA-256(salt || session_secret)
    secret_salt TEXT NOT NULL,          -- 16-byte CSPRNG per-session salt (hex)
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,           -- Sliding inactivity expiry (e.g., 90 days)
    revoked_at TEXT DEFAULT NULL        -- Non-null when revoked
);
```

- **Never store `session_secret` in plaintext** in database tables, logs, or error payloads.
- Compute `secret_hash = hashlib.sha256(bytes.fromhex(salt) + session_secret.encode("utf-8")).hexdigest()` (or `hmac.new(server_pepper, ..., hashlib.sha256).hexdigest()` when a server pepper env var is configured). Because `session_secret` has 256 bits of CSPRNG entropy, fast salted SHA-256/HMAC-SHA256 is preimage-resistant without adding Argon2 latency on every API call.

### 2.3 Constant-Time Credential Verification
- Clients authenticate requests via `Authorization: Bearer <session_id>.<session_secret>` (or `HttpOnly` cookie + CSRF protection if cookie-based).
- FastAPI dependency `require_authenticated_session()`:
  1. Parse `session_id` and `session_secret` from the credential header/cookie.
  2. Look up `session_credentials` where `session_id = ?`.
  3. Reject with HTTP `401 Unauthorized` (generic error, no oracle distinguishing missing vs. wrong secret vs. revoked) if:
     - Row does not exist,
     - `revoked_at IS NOT NULL`,
     - `expires_at <= now_utc`, or
     - `not hmac.compare_digest(computed_hash, row.secret_hash)`.
  4. Never trust a raw `X-Session-ID` header without verifying the matching secret hash.

### 2.4 Credential Revocation & Rotation
- **Explicit Revocation (`POST /api/sessions/revoke` or `DELETE /api/settings/data`)**:
  - Set `revoked_at = now_utc` or hard-delete the `session_credentials` row.
  - All subsequent calls with the old token immediately fail with `401 Unauthorized`.
- **Credential Rotation (`POST /api/sessions/rotate`)**:
  - Authenticated caller receives a fresh 256-bit `session_secret`; server updates `secret_salt` and `secret_hash` atomically while preserving existing `session_id` data.

### 2.5 Data Deletion & Credential Lifecycle
When a student executes **"Delete all my data"** (`DELETE /api/settings/data`):
1. Verify current session credential (`401` if invalid/revoked).
2. In a single atomic transaction:
   - `DELETE FROM checkins WHERE session_id = ?`
   - `DELETE FROM tasks WHERE session_id = ?`
   - `DELETE FROM user_settings WHERE session_id = ?`
   - `DELETE FROM session_credentials WHERE session_id = ?` (hard-delete so no credential metadata remains).
3. Client clears `sessionStorage` (`calmspace_latest_checkin`, `calmspace_high_risk_exited`) and local credential state; a subsequent visit issues a brand-new `session_id` + `session_secret`.

---

## 3. Backward-Compatible Migration Plan for the Anonymous MVP

To roll out credential enforcement without breaking existing local dev/MVP sessions abruptly:
1. **Phase 1 — Dual Support (Opt-In Strict Mode)**:
   - Add `POST /api/sessions` and `session_credentials` table.
   - Frontend automatically calls `POST /api/sessions` if no credential is stored, and upgrades to sending `Authorization: Bearer <session_id>.<session_secret>`.
   - Legacy `X-Session-ID`-only calls remain accepted **only** when `CALMSPACE_AUTH_MODE=legacy_compat` (default in local dev/CI during migration) for `session_id` values without a registered `session_credentials` row. Once a `session_id` has a credential row, `Authorization: Bearer` is strictly mandatory.
2. **Phase 2 — Strict Enforcement (`CALMSPACE_AUTH_MODE=strict`)**:
   - Reject any request without a valid, non-revoked, non-expired `session_credentials` match with HTTP `401`.
   - Remove `legacy_compat` fallback and require `strict` mode whenever `CALMSPACE_ENV=production`.
3. **Zero Impact on Safety Evaluator**:
   - `evaluate_wellbeing_route()` remains pure and stateless; authentication runs at the FastAPI dependency boundary before calling `storage` or `safety_evaluator`.
