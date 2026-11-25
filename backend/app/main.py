"""
Calmspace Backend — Privacy-First Student Wellbeing Companion
Rule-based safety routing, verified human-support escalation, and supportive language.
"""

import os
import sys

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import load_local_env
from app.routers.checkin import router as checkin_router
from app.routers.insights import router as insights_router
from app.routers.planner import router as planner_router
from app.routers.support_and_settings import settings_router, support_router

if "pytest" not in sys.modules:
    load_local_env()

app = FastAPI(
    title="Calmspace API",
    description="Privacy-First Student Wellbeing Companion Backend. 'Rules decide safety. AI writes the language. Humans help.'",
    version="1.0.0",
)

# Enable CORS for frontend Vite dev server and production origins
cors_env = os.getenv("CORS_ORIGINS", "*")
allowed_origins = [orig.strip() for orig in cors_env.split(",") if orig.strip()]
if not allowed_origins or "*" in allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(checkin_router)
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
        sanitized_errors.append(err_copy)
    return JSONResponse(status_code=422, content={"detail": sanitized_errors})


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Calmspace Backend",
        "principle": "Rules decide safety. AI writes the language. Humans help.",
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
        # Allow API routes and documentation to be handled by FastAPI
        if full_path.startswith("api/") or full_path in [
            "docs",
            "redoc",
            "openapi.json",
        ]:
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
