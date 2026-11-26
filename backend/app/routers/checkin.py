"""
Daily Check-in API Router
Enforces:
1. Rule-based safety routing evaluated strictly on backend.
2. Reflection text is NOT stored in persistent history.
3. AI guidance generated only for Low/Medium routes with explicit disclosure.
4. Support contacts returned for all routes (highlighting urgent for High route).
"""

from fastapi import APIRouter, Depends

from app.core.session import require_session_id
from app.models.schemas import CheckInRequest, CheckInResponse
from app.services.ai_guidance import generate_supportive_guidance
from app.services.safety_evaluator import evaluate_wellbeing_route
from app.services.storage import storage
from app.services.support_directory import get_support_directory, get_urgent_contacts

router = APIRouter(prefix="/api/checkin", tags=["Check-in"])


@router.post("", response_model=CheckInResponse)
async def submit_checkin(
    payload: CheckInRequest,
    session_id: str = Depends(require_session_id),
):

    # 0. Automatically prune expired records per session's retention policy
    storage.cleanup_expired_records(session_id)

    # 1. Fetch recent check-ins for trend-based safety checks
    recent_records = [
        {"mood": c.mood, "stress": c.stress, "sleep_hours": c.sleep_hours}
        for c in storage.get_checkins(session_id)[-5:]
    ]

    # 2. Safety evaluation strictly on backend
    safety = evaluate_wellbeing_route(
        mood=payload.mood,
        stress=payload.stress,
        sleep_hours=payload.sleep_hours,
        reflection=payload.reflection or "",
        recent_history=recent_records,
    )

    # 3. Persist numeric check-in metrics ONLY. Never save reflection text!
    record = storage.add_checkin(
        session_id=session_id,
        mood=payload.mood,
        stress=payload.stress,
        sleep_hours=payload.sleep_hours,
        route=safety.route,
    )

    # 4. Generate AI supportive guidance ONLY if eligible (Low / Medium routes)
    guidance = None
    if safety.ai_eligible:
        guidance = generate_supportive_guidance(
            route=safety.route,
            mood=payload.mood,
            stress=payload.stress,
            sleep_hours=payload.sleep_hours,
            reflection=payload.reflection if payload.consent_ai_processing else None,
            consent_given=payload.consent_ai_processing,
            session_id=session_id,
        )

    # 5. Fetch verified support directory
    if safety.route == "HIGH":
        contacts = get_urgent_contacts()
    else:
        contacts = get_support_directory()

    return CheckInResponse(
        record=record, safety=safety, guidance=guidance, support_contacts=contacts
    )


@router.get("/history")
async def get_checkin_history(
    session_id: str = Depends(require_session_id),
):
    storage.cleanup_expired_records(session_id)
    return storage.get_checkins(session_id)
