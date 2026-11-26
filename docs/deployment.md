# Calmspace Deployment & Operations Guide (Issue #15)

> **Coordinators**: `@roushan-23` (Member 4 — Hosting, Persistence & Release), `@mu368651-eng` (AI Secrets & Fallback Verification), `@nikhi20-900` (Frontend Build & API Integration)  
> **Architecture**: React + TypeScript + Vite static frontend + Python FastAPI backend + SQLite (WAL mode) on persistent storage. *Streamlit is intentionally excluded.*

---

## 1. Deployment Artifacts Included

| File | Purpose |
|---|---|
| `backend/Dockerfile` | Non-root Python 3.12 container running `uvicorn app.main:app --workers 1` with `/api/health` check |
| `backend/.dockerignore` | Excludes `.env`, local `*.db*` files, caches, and tests from backend images |
| `frontend/Dockerfile` | Multi-stage Node 20 build (`npm ci && npm run build`) served via Nginx on port `8080` |
| `frontend/.dockerignore` | Excludes `node_modules`, `dist`, and local `.env*` files |
| `frontend/nginx.conf` | Security headers, `/api/` reverse proxy (for Docker Compose), and SPA fallback routing |
| `docker-compose.yml` | Local production-like stack with named persistent volume `calmspace_data:/data` |
| `render.yaml` | Reproducible Render Blueprint (FastAPI web service + persistent disk + React static site) |
| `backend/.env.example` | Backend placeholder variables (zero secrets) |
| `frontend/.env.example` | Frontend `VITE_API_BASE_URL` placeholder |

---

## 2. Environment Differences & Variables (Placeholders Only)

Never commit real credentials (`backend/app/.env` is gitignored). Configure secrets strictly in host secret stores for staging/production:

| Variable | Local Dev | Hosted Production | Notes |
|---|---|---|---|
| `CALMSPACE_ENV` | `development` | `production` | Enables production CORS & rate-limit guards |
| `DATABASE_URL` | `sqlite:///./calmspace.db` | `sqlite:////data/calmspace.db` | Mount `/data` on a persistent disk so data survives restarts |
| `CORS_ORIGINS` | `http://127.0.0.1:5173,...` | `https://<your-frontend-domain>` | Wildcard `*` is rejected in `production` mode |
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

1. **Schema Setup**: `CalmspaceStorage._init_db()` automatically creates `checkins`, `tasks`, and `user_settings` (with `PRAGMA journal_mode = WAL;` and defensive `data_retention_days` migration) on startup.
2. **Persistence Across Restarts**: Mount persistent storage at `/data` and point `DATABASE_URL=sqlite:////data/calmspace.db`.
3. **Backup & Rollback**:
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

  # 2. Synthetic LOW route (unconsented fallback)
  curl -fsS -X POST https://<backend-domain>/api/checkin \
    -H "Content-Type: application/json" \
    -H "X-Session-ID: smoke-test-session-01" \
    -d '{"mood":4,"stress":2,"sleep_hours":7.5,"reflection":"Synthetic smoke check","consent_ai_processing":false}'

  # 3. Synthetic cleanup
  curl -fsS -X DELETE https://<backend-domain>/api/settings/data \
    -H "X-Session-ID: smoke-test-session-01"
  ```

---

## 6. Verification Status vs. Remaining Live Hosting Steps

### Verified in Repository / Local Build
- Frontend reads `VITE_API_BASE_URL` with 15s timeout and safe `422` message formatting (`frontend/src/services/api.ts`).
- Production CORS rejects wildcard `*` (`resolve_cors_settings` in `backend/app/main.py`).
- `/api/health`, `/api/ready`, and `sqlite3.Error` handlers omit secrets, paths, and user records.
- `backend/tests/test_deployment_readiness.py` + full 262-test suite, Ruff, and `tsc && vite build` pass cleanly.

### Pending Live Host Execution (Owned by `@roushan-23` & `@mu368651-eng`)
- Provision hosted frontend + backend targets over HTTPS and configure `CORS_ORIGINS` + `VITE_API_BASE_URL`.
- Attach persistent `/data` disk and verify persistence, session isolation, and deletion across a live host restart/redeploy.
- Inject real `CALMSPACE_AI_API_KEY` into backend secrets (if enabling live Gemini) and record the deployed URLs and release SHA below once live.
