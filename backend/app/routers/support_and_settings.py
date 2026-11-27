"""
Support Network & Settings Routers
Provides verified human support resources and privacy data management.
"""

from fastapi import APIRouter, Depends

from app.core.session import (
    require_authenticated_session,
    require_authenticated_session_with_secret,
)
from app.models.schemas import SupportContact, UserSettings
from app.services.ai_guidance import rate_limiter
from app.services.storage import storage
from app.services.support_directory import get_support_directory

support_router = APIRouter(prefix="/api/support", tags=["Support Network"])
settings_router = APIRouter(prefix="/api/settings", tags=["Settings"])


@support_router.get("/resources", response_model=list[SupportContact])
async def list_support_resources():
    return get_support_directory(active_only=True)


@settings_router.get("", response_model=UserSettings)
async def get_settings(session_id: str = Depends(require_authenticated_session)):
    return storage.get_settings(session_id)


@settings_router.put("", response_model=UserSettings)
async def update_settings(
    settings: UserSettings,
    auth_context: tuple[str, str] = Depends(require_authenticated_session_with_secret),
):
    session_id, session_secret = auth_context
    updated = storage.update_settings(
        session_id, settings, session_secret=session_secret
    )
    storage.cleanup_expired_records(session_id)
    return updated


@settings_router.delete("/data")
async def delete_all_user_data(
    session_id: str = Depends(require_authenticated_session),
):
    """Completely and permanently purges all check-ins, tasks, settings, and session credentials."""
    storage.delete_all_data(session_id)
    rate_limiter.clear_session(session_id)
    return {
        "status": "success",
        "message": "All session data has been permanently deleted.",
    }
