"""
Calmspace Backend — Privacy-First Student Wellbeing Companion
Rule-based safety routing, verified human-support escalation, and supportive language.
"""

import logging
import os
import sqlite3
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import AIServiceConfig, load_local_env
from app.routers.checkin import router as checkin_router
from app.routers.companion import router as companion_router
from app.routers.insights import router as insights_router
from app.routers.planner import router as planner_router
from app.routers.support_and_settings import settings_router, support_router
from app.services.storage import storage

logger = logging.getLogger(__name__)

if "pytest" not in sys.modules:
    load_local_env()


def resolve_cors_settings(
    cors_env: str | None = None, env_mode: str | None = None
) -> tuple[list[str], bool]:
    """
    Resolve CORS allowed origins and allow_credentials safely.
    - In production (CALMSPACE_ENV=production), wildcard '*' is strictly disallowed.
    - In development/test, defaults to local dev origins unless explicit origins are set.
    """
    mode = (
        (
            env_mode
            if env_mode is not None
            else os.getenv("CALMSPACE_ENV", "development")
        )
        .strip()
        .lower()
    )
    raw = cors_env if cors_env is not None else os.getenv("CORS_ORIGINS", "")
    parsed = [orig.strip().rstrip("/") for orig in raw.split(",") if orig.strip()]

    if mode == "production":
        explicit = [orig for orig in parsed if orig != "*"]
        if "*" in parsed and not explicit:
            logger.warning("Wildcard CORS_ORIGINS='*' rejected in production mode.")
        return explicit, bool(explicit)

    if not parsed:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ], True

    if "*" in parsed:
        return ["*"], False

    return parsed, True


app = FastAPI(
    title="Calmspace API",
    description="Privacy-First Student Wellbeing Companion Backend. 'Rules decide safety. AI writes the language. Humans help.'",
    version="1.0.0",
)

allowed_origins, allow_credentials = resolve_cors_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Session-ID", "Authorization"],
)

app.include_router(checkin_router)
app.include_router(companion_router)
app.include_router(insights_router)
app.include_router(planner_router)
app.include_router(support_router)
app.include_router(settings_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Sanitize validation error responses:
    Strips raw input fields from Pydantic validation errors so that private reflection
    strings are NEVER echoed back in 422 HTTP responses.
    """
    sanitized_errors = []
    for err in exc.errors():
        err_copy = dict(err)
        err_copy.pop("input", None)
        if isinstance(err_copy.get("ctx"), dict):
            err_copy["ctx"] = {
                k: str(v) if isinstance(v, BaseException) else v
                for k, v in err_copy["ctx"].items()
            }
        sanitized_errors.append(err_copy)
    return JSONResponse(status_code=422, content={"detail": sanitized_errors})


@app.exception_handler(sqlite3.Error)
async def database_exception_handler(request: Request, exc: sqlite3.Error):
    """
    Fail safely on database errors without exposing SQL statements, paths, or credentials.
    """
    logger.error("Database operation failed (%s).", type(exc).__name__)
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Database service temporarily unavailable. Please try again."
        },
    )


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Calmspace Backend",
        "principle": "Rules decide safety. AI writes the language. Humans help.",
    }


@app.get("/api/ready")
async def readiness_check():
    """
    Readiness probe verifying database connectivity and safe AI config status.
    Never exposes secrets, DB connection strings, environment variables, or user records.
    """
    try:
        storage.check_health()
    except Exception as exc:  # noqa: BLE001
        logger.error("Readiness database check failed (%s).", type(exc).__name__)
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "database": "error"},
        )

    ai_status = "fallback"
    try:
        cfg = AIServiceConfig.from_env()
        ai_status = cfg.provider if cfg.enabled else "disabled"
    except Exception:  # noqa: BLE001
        ai_status = "fallback"

    return {
        "status": "ready",
        "database": "connected",
        "ai_mode": ai_status,
    }


# Redirect legacy /landing routes to official 3D homepage at /
@app.get("/landing")
@app.get("/landing/{path:path}")
async def redirect_old_landing(path: str = ""):
    return RedirectResponse(url="/", status_code=301)


# Serve frontend build static files if frontend/dist exists
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../frontend/dist")
)
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Keep unknown API routes as API 404s instead of returning `null` or the SPA.
    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    if full_path in {"docs", "redoc", "openapi.json"}:
        raise HTTPException(status_code=404, detail="Not found")

    if not os.path.exists(frontend_dist):
        raise HTTPException(status_code=404, detail="Not found")

    build_root = Path(frontend_dist).resolve()
    requested_path = (build_root / full_path).resolve()

    # resolve() also follows symlinks, so this rejects both traversal and links
    # that point outside the frontend build directory.
    try:
        requested_path.relative_to(build_root)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Not found") from exc

    if requested_path.is_file():
        return FileResponse(requested_path)

    # A valid client-side route has no corresponding file and receives the SPA.
    index_path = build_root / "index.html"
    if not index_path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(index_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
