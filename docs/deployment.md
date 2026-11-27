# Calmspace Deployment & Operations Guide (Issue #15)

> **Coordinators**: `@roushan-23` (Member 4 — Hosting, Persistence & Release), `@mu368651-eng` (AI Secrets & Fallback Verification), `@nikhi20-900` (Frontend Build & API Integration)  
> **Architecture**: React + TypeScript + Vite static frontend + Python FastAPI backend + SQLite (WAL mode) on persistent storage. *Streamlit is intentionally excluded.*

---

## 1. Deployment Artifacts Included

| File | Purpose |
| --- | --- |
| `backend/Dockerfile` | Non-root Python 3.12 container running `uvicorn app.main:app --workers 1` with `/api/health` check |
| `backend/.dockerignore` | Excludes `.env`, local `*.db*` files, caches, and tests from backend images |
| `frontend/Dockerfile` | Multi-stage Node 20 build (`npm ci && npm run build`) served via Nginx on port `8080` (Docker Compose / containerized) |
| `frontend/.dockerignore` | Excludes `node_modules`, `dist`, and local `.env*` files |
| `frontend/nginx.conf` | Security headers, `/api/` reverse proxy (for Docker Compose), and SPA fallback routing |
| `frontend/vercel.json` | Vercel SPA static rewrite routing (`/(.*) -> /index.html`) for production static hosting |
| `docker-compose.yml` | Local production-like stack with named persistent volume `calmspace_data:/data` |
| `render.yaml` | Reproducible Render Blueprint for backend FastAPI web service with persistent `/data` disk |
| `backend/.env.example` | Backend placeholder variables (zero secrets) |
| `frontend/.env.example` | Frontend `VITE_API_BASE_URL` placeholder |

---

## 2. Environment Differences & Variables (Placeholders Only)

Never commit real credentials (`backend/app/.env` is gitignored). Configure secrets strictly in host secret stores for staging/production:

| Variable | Local Dev | Hosted Production | Notes |
| --- | --- | --- | --- |
| `CALMSPACE_ENV` | `development` | `production` | Enables production CORS & rate-limit guards |
| `DATABASE_URL` | `sqlite:///./calmspace.db` | `sqlite:////data/calmspace.db` | Mount `/data` on a persistent disk so data survives restarts |
| `CALMSPACE_SESSION_TTL_DAYS` | `90` | `90` | Sliding inactivity session expiry in days (`1`–`365`) |
| `CALMSPACE_SESSION_PEPPER` | *(empty)* | `<backend-secret-only>` | Required in `production` mode (`>= 32` high-entropy non-placeholder chars with `>= 8` distinct chars; auto-generated in `render.yaml` or via `openssl rand -hex 32`) |
| `CORS_ORIGINS` | `http://127.0.0.1:5173,...` | `https://calmspace.vercel.app` | Exact frontend origin URL; wildcard `*` is strictly rejected in `production` mode |
| `CALMSPACE_AI_PROVIDER` | `mock` | `mock` or `gemini` | Fails closed to safe deterministic fallback on misconfiguration |
| `CALMSPACE_AI_API_KEY` | *(empty)* | `<backend-secret-only>` | Sent via `x-goog-api-key` header only; never exposed to `VITE_*` |
| `CALMSPACE_AI_ALLOW_LOCAL_RATE_LIMITER` | `true` (default in dev) | `true` (single `--workers 1` MVP) | Keep `1` worker unless backed by Redis |
| `VITE_API_BASE_URL` | `/api` | `https://<your-backend-domain>/api` | Read by `frontend/src/services/api.ts` (`import.meta.env.VITE_API_BASE_URL`) |

---

## 3. Health, Readiness & Safe Failure Handling

- **`GET /api/health`** (Liveness): Returns service name and safety principle only (`200 OK`).
- **`GET /api/ready`** (Readiness): Runs `SELECT 1` via `storage.check_health()` and reads non-secret AI mode (`mock`, `gemini`, `disabled`, or `fallback`). Returns `503` (`{"status": "unavailable", "database": "error"}`) if SQLite is unreachable without exposing file paths, SQL statements, or user records.
- **Error Sanitization**:
  - `RequestValidationError` (`422`) strips raw `input` fields so reflections are never echoed back.
  - `sqlite3.Error` returns generic `503` without internal SQL or filesystem paths.
- **Privacy-Safe Log Inspection**: Inspect platform logs only for HTTP status codes, `/api/health`, `/api/ready`, and generic exception class names. Calmspace never logs reflection text or `CALMSPACE_AI_API_KEY`.

---

## 4. Database Persistence, Backup & Rollback

1. **Schema Setup**: `CalmspaceStorage._init_db()` automatically creates `session_credentials`, `checkins`, `tasks`, and `user_settings` (with `PRAGMA journal_mode = WAL;` and defensive `data_retention_days` / `planner_seeded` migrations) on startup.
2. **Persistence Across Restarts**: Mount persistent storage at `/data` and point `DATABASE_URL=sqlite:////data/calmspace.db`.
3. **Pepper Generation, Entropy & Stability (`CALMSPACE_SESSION_PEPPER`)**:
   - **Entropy & Validation Requirements**:
     - In `production`, `CALMSPACE_SESSION_PEPPER` must have at least **32 characters**, a character diversity of at least 8 unique characters, and must not match common placeholder strings (`changeme`, `placeholder`, `default-pepper`, `calmspace-session-pepper`).
     - Generation command:
       ```bash
       openssl rand -hex 32
       ```
       This yields a 64-hex-character cryptographically secure pseudo-random string with full 256-bit entropy.
   - **Stability Across Restarts & Redeployments**:
     - `CALMSPACE_SESSION_PEPPER` **must remain strictly identical** across all backend restarts, redeployments, container recreations, and infrastructure upgrades.
     - Changing or regenerating `CALMSPACE_SESSION_PEPPER` breaks HMAC validation for every persisted `secret_hash` in `session_credentials`. This immediately invalidates all active student sessions with `401 Unauthorized`, resetting students' access to their prior check-in trends and study tasks.
   - **Backup & Recovery Procedure**:
     - Store `CALMSPACE_SESSION_PEPPER` in the platform's secure secret manager (e.g. Render environment variables, HashiCorp Vault, or AWS Secrets Manager).
     - In `render.yaml`, `generateValue: true` provisions a persistent 32-character secret on Blueprint creation and retains it across standard Git pushes.
     - Document and back up this value in an encrypted secrets vault alongside SQLite database snapshot backups (`/data/calmspace.backup.db`). When recovering or migrating the database to a new server instance, restore both the database file and the exact original `CALMSPACE_SESSION_PEPPER`.
4. **Backup & Rollback**:
   - Before upgrading, snapshot the SQLite database safely while running:

     ```bash
     sqlite3 /data/calmspace.db ".backup '/data/calmspace.backup.db'"
     ```

   - To roll back the application revision, redeploy the previous Git tag/image and restore `/data/calmspace.backup.db` if schema/data recovery is needed.

---

## 5. AI Provider Smoke Test, Disable & Key Rotation Runbook

- **Disable AI Immediately (Zero-Downtime Mitigation)**:
  Set `CALMSPACE_AI_ENABLED=false` (or `CALMSPACE_AI_PROVIDER=mock`) in backend host secrets and restart. All `LOW`/`MEDIUM` check-ins safely serve deterministic fallback guidance; `HIGH` routes remain zero-call.
- **Key Rotation**:
  Generate a new Gemini API key, update `CALMSPACE_AI_API_KEY` in backend host secrets, redeploy/restart the backend, then revoke the old key in Google AI Studio.
- **Synthetic Smoke Tests (After Deploy)**:

  ```bash
  # 1. Health & Readiness
  curl -fsS https://<backend-domain>/api/health
  curl -fsS https://<backend-domain>/api/ready

  # 2. Issue anonymous Bearer credential
  SESSION_JSON=$(curl -fsS -X POST https://<backend-domain>/api/sessions)
  TOKEN=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print(f"{d[\"session_id\"]}.{d[\"session_secret\"]}")' "$SESSION_JSON")

  # 3. Synthetic LOW route (unconsented fallback)
  curl -fsS -X POST https://<backend-domain>/api/checkin \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"mood":4,"stress":2,"sleep_hours":7.5,"reflection":"Synthetic smoke check","consent_ai_processing":false}'

  # 4. Synthetic cleanup & revocation proof (next request must return 401)
  curl -fsS -X DELETE https://<backend-domain>/api/settings/data \
    -H "Authorization: Bearer ${TOKEN}"
  ```

---

## 6. Verification Status vs. Remaining Live Hosting Steps

### Verified in Repository / Local Production-Mode Build

- Frontend authenticates via `POST /api/sessions` (`Authorization: Bearer <id>.<secret>`), reads `VITE_API_BASE_URL` with 15s timeout, and handles `422` / `401` cleanly (`frontend/src/services/api.ts`).
- Production CORS rejects wildcard `*` (`resolve_cors_settings` in `backend/app/main.py`).
- `/api/health`, `/api/ready`, and `sqlite3.Error` handlers omit secrets, paths, and user records.
- Production-mode multi-process restart test (`CALMSPACE_ENV=production`) verified SQLite persistence across restarts, `LOW`/`MEDIUM`/`HIGH` routing, `CALMSPACE_AI_ENABLED=false` fallback, and permanent deletion/revocation (`401` on reuse).
- Full 285-test backend suite (`98%` coverage on `safety_evaluator.py`), Ruff lint/format, 9 frontend unit/contract tests, and `tsc && vite build` pass cleanly.

### Pending Live Host Execution (Owned by `@roushan-23` & `@mu368651-eng`)

- Provision hosted frontend + backend targets over HTTPS (e.g., via `render.yaml`) and configure `CORS_ORIGINS`, `VITE_API_BASE_URL`, and `CALMSPACE_SESSION_PEPPER`.
- Attach persistent `/data` disk and run the synthetic smoke tests above across a live host restart/redeploy.
- Inject real `CALMSPACE_AI_API_KEY` into backend secrets (if enabling live Gemini) and record the deployed URLs and release SHA in `docs/release_checklist.md`.
