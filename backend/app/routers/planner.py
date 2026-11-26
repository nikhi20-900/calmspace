"""
Study Planner Router
Features study session tasks, break reminders, and gentle encouragement.
In-app only MVP.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.session import require_session_id
from app.models.schemas import StudyTask, StudyTaskCreate, StudyTaskUpdate
from app.services.storage import storage

router = APIRouter(prefix="/api/planner", tags=["Study Planner"])


@router.get("/tasks", response_model=list[StudyTask])
async def list_tasks(session_id: str = Depends(require_session_id)):
    tasks = storage.get_tasks(session_id)
    if not tasks and not storage.has_planner_seeded(session_id):
        # Provide welcoming starter tasks once for a brand-new session
        storage.add_task(
            session_id, "Review lecture slides for 25 mins", 25, "Revision"
        )
        storage.add_task(
            session_id, "Take a restful 10-minute tea or stretch break", 10, "Break"
        )
        storage.mark_planner_seeded(session_id)
        return storage.get_tasks(session_id)
    return tasks


@router.post("/tasks", response_model=StudyTask)
async def create_task(
    payload: StudyTaskCreate,
    session_id: str = Depends(require_session_id),
):
    storage.mark_planner_seeded(session_id)
    return storage.add_task(
        session_id=session_id,
        title=payload.title,
        estimated_minutes=payload.estimated_minutes,
        category=payload.category,
    )


@router.patch("/tasks/{task_id}/toggle", response_model=StudyTask)
async def toggle_task(
    task_id: str,
    session_id: str = Depends(require_session_id),
):
    updated = storage.toggle_task(session_id, task_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@router.patch("/tasks/{task_id}", response_model=StudyTask)
async def update_task(
    task_id: str,
    payload: StudyTaskUpdate,
    session_id: str = Depends(require_session_id),
):
    updated = storage.update_task(
        session_id=session_id,
        task_id=task_id,
        title=payload.title,
        estimated_minutes=payload.estimated_minutes,
        category=payload.category,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    session_id: str = Depends(require_session_id),
):
    storage.mark_planner_seeded(session_id)
    success = storage.delete_task(session_id, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task removed"}
