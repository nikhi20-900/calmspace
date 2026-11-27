"""
Study Planner Router
Features study session tasks, break reminders, and gentle encouragement.
In-app only MVP.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.session import require_authenticated_session_with_secret
from app.models.schemas import StudyTask, StudyTaskCreate, StudyTaskUpdate
from app.services.storage import storage

router = APIRouter(prefix="/api/planner", tags=["Study Planner"])


@router.get("/tasks", response_model=list[StudyTask])
async def list_tasks(
    auth_context: tuple[str, str] = Depends(require_authenticated_session_with_secret),
):
    session_id, session_secret = auth_context
    return storage.get_or_seed_tasks(session_id, session_secret=session_secret)


@router.post("/tasks", response_model=StudyTask)
async def create_task(
    payload: StudyTaskCreate,
    auth_context: tuple[str, str] = Depends(require_authenticated_session_with_secret),
):
    session_id, session_secret = auth_context
    storage.mark_planner_seeded(session_id, session_secret=session_secret)
    return storage.add_task(
        session_id=session_id,
        title=payload.title,
        estimated_minutes=payload.estimated_minutes,
        category=payload.category,
        session_secret=session_secret,
    )


@router.patch("/tasks/{task_id}/toggle", response_model=StudyTask)
async def toggle_task(
    task_id: str,
    auth_context: tuple[str, str] = Depends(require_authenticated_session_with_secret),
):
    session_id, session_secret = auth_context
    updated = storage.toggle_task(session_id, task_id, session_secret=session_secret)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@router.patch("/tasks/{task_id}", response_model=StudyTask)
async def update_task(
    task_id: str,
    payload: StudyTaskUpdate,
    auth_context: tuple[str, str] = Depends(require_authenticated_session_with_secret),
):
    session_id, session_secret = auth_context
    updated = storage.update_task(
        session_id=session_id,
        task_id=task_id,
        title=payload.title,
        estimated_minutes=payload.estimated_minutes,
        category=payload.category,
        session_secret=session_secret,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    auth_context: tuple[str, str] = Depends(require_authenticated_session_with_secret),
):
    session_id, session_secret = auth_context
    storage.mark_planner_seeded(session_id, session_secret=session_secret)
    success = storage.delete_task(session_id, task_id, session_secret=session_secret)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task removed"}
