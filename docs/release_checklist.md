# Calmspace Production Readiness & Release Checklist

> **Protected Safety Engine**: `backend/app/services/safety_evaluator.py` (Git blob SHA `8f5e2e984c4ab41212a74a16158200b2c7a126b2` — verified untouched)  
> **Campus Integration Disclosure**: Institutional campus counselling (`campus-counselling`) remains a clearly labeled **Demo Placeholder** (`is_demo_placeholder: true`, `official_source_url: null`) and must not be presented as a connected university service until configured by an institution.

---

## Stage 1 — Security Hardening (Completed)

- [x] **Server-issued anonymous session credentials**: `POST /api/sessions` issues a 128-bit UUIDv4 `session_id` and 256-bit CSPRNG `session_secret`, storing only a salted SHA-256/HMAC-SHA256 hash in `session_credentials` (`CALMSPACE_SESSION_PEPPER` enforced as `>= 16` non-placeholder chars in production; **must remain stable across restarts, redeployments, container recreation, and DB-retaining migrations** because changing it invalidates all existing `session_credentials` hashes and forces users to start new sessions).
- [x] **Strict credential enforcement**: `require_authenticated_session()` verifies `Authorization: Bearer <session_id>.<session_secret>` in constant time (`hmac.compare_digest`), rejects unauthenticated `X-Session-ID` spoofing, and returns uniform `401 Unauthorized` responses with zero oracle.
- [x] **Session expiry, rotation & revocation**: Implemented sliding inactivity expiry (`CALMSPACE_SESSION_TTL_DAYS`, default 90 days), optimistic-concurrency rotation (`POST /api/sessions/rotate` checking `secret_hash = ?`), `POST /api/sessions/revoke`, concurrent verification/revocation checks (`cursor.rowcount`), and `cleanup_expired_sessions()`.
- [x] **Deletion & retention edge cases**: `DELETE /api/settings/data` atomically purges `checkins`, `tasks`, `user_settings`, and `session_credentials`, clears in-memory AI rate-limit timestamps, and invalidates the old Bearer token (`401` on reuse). Non-UTC timestamp offsets and exact boundary cutoffs verified.
- [x] **Cross-session security tests**: Verified isolation, credential splicing rejection, rotation, expiry, and revocation across all API routes.

## Stage 2 — Deployment Verification (Local Production-Mode Verified; Live Hosting Pending)

- [x] **Local production-mode verification**: Verified `CALMSPACE_ENV=production` startup, strict CORS origin enforcement, `/api/health`, `/api/ready`, SQLite WAL persistence across process restarts, `CALMSPACE_AI_ENABLED=false` fallback mode, and deletion revocation.
- [ ] **Complete live hosting**: Provision Render/cloud services (`render.yaml`) over HTTPS with persistent `/data` disk.
- [ ] **Verify live persistent storage**: Confirm live SQLite persistence and `DELETE /api/settings/data` across a hosted container restart.
- [ ] **Verify production AI & pepper stability**: Inject `CALMSPACE_AI_API_KEY` (if enabling live Gemini) and confirm `CALMSPACE_SESSION_PEPPER` remains unchanged across restarts, redeployments, and container recreation so existing SQLite sessions stay valid.
- [ ] **Run live API smoke tests**: Execute `docs/deployment.md` Section 5 smoke script against the live HTTPS URL.
- [ ] **Record deployment URLs**:
  - Frontend URL: `PENDING_LIVE_DEPLOY`
  - Backend URL: `PENDING_LIVE_DEPLOY`
  - Release Git SHA: `PENDING_LIVE_DEPLOY`

## Stage 3 — Testing & Quality (Completed)

- [x] **Backend test suite & coverage**: `285` backend tests passing (`pytest`), `98%` statement coverage on `app/services/safety_evaluator.py`, `ruff format --check .` and `ruff check .` clean.
- [x] **Frontend tests, build & accessibility**: `9` frontend unit/contract tests passing (`npm test`), `tsc && vite build` clean, keyboard focus trapping & restoration added to `Dialog.tsx`, and form label associations verified on `SettingsPage.tsx`.
- [x] **End-to-end check-in journeys**: Verified full `LOW`, `MEDIUM`, and `HIGH` routes, Insights, Planner, Settings retention, and permanent deletion (`backend/tests/test_e2e_journeys.py`).
- [x] **HIGH-route zero-AI proof**: Verified `HIGH` route executes `0` AI provider calls even when `consent_ai_processing=true` and Gemini is configured.
- [x] **AI outage & disabled mode**: Verified HTTP `503`, `401`, `ReadTimeout`, malformed JSON output, and `CALMSPACE_AI_ENABLED=false` safely return deterministic fallback guidance with zero reflection leakage.

## Stage 4 — Documentation & Release (Completed)

- [x] **Reconciled `README.md` and `docs/demo_journey.md`**: Updated test counts (`285` backend + `9` frontend), corrected `Exam Fatigue` synthetic demo metrics to match deterministic `MEDIUM` scoring, replaced outdated campus phone prose with explicit Demo Placeholder notice, and updated session auth flows.
- [x] **Updated architecture, API contracts, and privacy docs**: Updated `docs/architecture.md`, `docs/api_contracts.md`, `docs/privacy_data_inventory.md`, `docs/session_authorization_architecture.md`, and `docs/deployment.md`.
- [x] **Honest limitations preserved**: `localStorage` Bearer storage vs `HttpOnly` cookie trade-off, single-node SQLite WAL scope, `checkins`-only rolling retention scope, and Demo Placeholder status of campus counselling remain explicitly documented.
