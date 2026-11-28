"""
Calm — Voice Companion API Router
Enforces:
1. Strict X-Session-ID header validation and session isolation on every route.
2. Volatile conversation memory (cleared on session end or data wipe).
3. Explicit confirmation flow for persistent actions.
4. Zero-call safety bypass on HIGH-risk routes.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.session import require_session_id
from app.models.companion_schemas import (
    CompanionConfirmRequest,
    CompanionPreferences,
    CompanionStartResponse,
    CompanionTurnRequest,
    CompanionTurnResponse,
    ReminderCreate,
    ReminderRecord,
    ReminderSnoozeRequest,
)
from app.services.companion_agent import (
    confirm_pending_action,
    process_companion_turn,
    start_companion_session,
)
from app.services.companion_memory import companion_memory
from app.services.storage import storage

router = APIRouter(prefix="/api/companion", tags=["Calm Companion"])


@router.post("/start", response_model=CompanionStartResponse)
async def start_companion(
    session_id: str = Depends(require_session_id),
):
    return start_companion_session(session_id=session_id)


@router.post("/turn", response_model=CompanionTurnResponse)
async def companion_turn(
    payload: CompanionTurnRequest,
    session_id: str = Depends(require_session_id),
):
    try:
        return process_companion_turn(
            session_id=session_id,
            message=payload.message,
            conversation_id=payload.conversation_id,
            consent_ai_processing=payload.consent_ai_processing,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc


@router.post("/confirm", response_model=CompanionTurnResponse)
async def companion_confirm(
    payload: CompanionConfirmRequest,
    session_id: str = Depends(require_session_id),
):
    try:
        return confirm_pending_action(
            session_id=session_id,
            conversation_id=payload.conversation_id,
            action_id=payload.action_id,
            approved=payload.approved,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
    except KeyError as exc:
        raise HTTPException(
            status_code=404, detail="Pending confirmation not found or expired"
        ) from exc


@router.delete("/session/{conversation_id}")
async def end_companion_session(
    conversation_id: str,
    session_id: str = Depends(require_session_id),
):
    """Clears volatile conversational context for this conversation immediately."""
    try:
        cleared = companion_memory.clear_conversation(session_id, conversation_id)
    except PermissionError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
    return {
        "status": "cleared" if cleared else "not_found",
        "message": "Temporary conversation context cleared.",
    }


@router.get("/reminders", response_model=list[ReminderRecord])
async def list_reminders(session_id: str = Depends(require_session_id)):
    return storage.get_reminders(session_id)


@router.post("/reminders", response_model=ReminderRecord)
async def create_reminder(
    payload: ReminderCreate,
    session_id: str = Depends(require_session_id),
):
    return storage.add_reminder(
        session_id=session_id,
        title=payload.title,
        category=payload.category,
        delay_minutes=payload.delay_minutes,
    )


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    session_id: str = Depends(require_session_id),
):
    removed = storage.delete_reminder(session_id, reminder_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder removed"}


@router.patch("/reminders/{reminder_id}/complete")
async def complete_reminder(
    reminder_id: str,
    session_id: str = Depends(require_session_id),
):
    completed = storage.complete_reminder(session_id, reminder_id)
    if not completed:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"status": "completed", "id": reminder_id}


@router.patch("/reminders/{reminder_id}/snooze", response_model=ReminderRecord)
async def snooze_reminder(
    reminder_id: str,
    payload: ReminderSnoozeRequest,
    session_id: str = Depends(require_session_id),
):
    updated = storage.snooze_reminder(session_id, reminder_id, payload.minutes)
    if not updated:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return updated


@router.get("/preferences", response_model=CompanionPreferences)
async def get_companion_preferences(session_id: str = Depends(require_session_id)):
    return storage.get_companion_preferences(session_id)


@router.put("/preferences", response_model=CompanionPreferences)
async def update_companion_preferences(
    payload: CompanionPreferences,
    session_id: str = Depends(require_session_id),
):
    return storage.update_companion_preferences(session_id, payload)
