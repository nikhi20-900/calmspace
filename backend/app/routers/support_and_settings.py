"""
Support Network & Settings Routers
Provides verified human support resources and privacy data management.
"""

from fastapi import APIRouter, Header

from app.models.schemas import SupportContact, UserSettings
from app.services.storage import storage
from app.services.support_directory import get_support_directory

support_router = APIRouter(prefix="/api/support", tags=["Support Network"])
settings_router = APIRouter(prefix="/api/settings", tags=["Settings"])


@support_router.get("/resources", response_model=list[SupportContact])
async def list_support_resources():
    return get_support_directory()


@settings_router.get("", response_model=UserSettings)
async def get_settings(
    x_session_id: str = Header(
        ..., min_length=1, max_length=128, pattern=r"^[A-Za-z0-9._-]+$"
    ),
):
    session_id = x_session_id
    return storage.get_settings(session_id)


@settings_router.put("", response_model=UserSettings)
async def update_settings(
    settings: UserSettings,
    x_session_id: str = Header(
        ..., min_length=1, max_length=128, pattern=r"^[A-Za-z0-9._-]+$"
    ),
):
    session_id = x_session_id
    return storage.update_settings(session_id, settings)


@settings_router.delete("/data")
async def delete_all_user_data(
    x_session_id: str = Header(
        ..., min_length=1, max_length=128, pattern=r"^[A-Za-z0-9._-]+$"
    ),
):
    """Removes check-ins, tasks, and settings associated with the supplied session ID."""
    session_id = x_session_id
    storage.delete_all_data(session_id)
    return {
        "status": "success",
        "message": "Check-ins, tasks, and settings have been removed.",
    }
