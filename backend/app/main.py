"""
Calmspace Backend — Privacy-First Student Wellbeing Companion
Rule-based safety routing, verified human-support escalation, and supportive language.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.routers.checkin import router as checkin_router
from app.routers.insights import router as insights_router
from app.routers.planner import router as planner_router
from app.routers.support_and_settings import settings_router, support_router

app = FastAPI(
    title="Calmspace API",
    description="Privacy-First Student Wellbeing Companion Backend. 'Rules decide safety. AI writes the language. Humans help.'",
    version="1.0.0",
)

# Enable CORS for frontend Vite dev server and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(checkin_router)
app.include_router(insights_router)
app.include_router(planner_router)
app.include_router(support_router)
app.include_router(settings_router)


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
