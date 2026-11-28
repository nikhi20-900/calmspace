"""
Support Network & Settings Routers
Provides verified human support resources and privacy data management.
"""

from fastapi import APIRouter, Depends

from app.core.session import require_session_id
from app.models.schemas import SupportContact, UserSettings
from app.services.companion_memory import companion_memory
from app.services.storage import storage
from app.services.support_directory import get_support_directory

support_router = APIRouter(prefix="/api/support", tags=["Support Network"])
settings_router = APIRouter(prefix="/api/settings", tags=["Settings"])


@support_router.get("/resources", response_model=list[SupportContact])
async def list_support_resources():
    return get_support_directory(active_only=True)


@settings_router.get("", response_model=UserSettings)
async def get_settings(session_id: str = Depends(require_session_id)):
    return storage.get_settings(session_id)


@settings_router.put("", response_model=UserSettings)
async def update_settings(
    settings: UserSettings,
    session_id: str = Depends(require_session_id),
):
    updated = storage.update_settings(session_id, settings)
    storage.cleanup_expired_records(session_id)
    return updated


@settings_router.delete("/data")
async def delete_all_user_data(
    session_id: str = Depends(require_session_id),
):
    """Completely and permanently purges all check-ins, tasks, reminders, preferences, and volatile context"""
    storage.delete_all_data(session_id)
    companion_memory.clear_session(session_id)
    return {
        "status": "success",
        "message": "All session data has been permanently deleted.",
    }
