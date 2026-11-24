"""
Study Planner Router
Features study session tasks, break reminders, and gentle encouragement.
In-app only MVP.
"""
from fastapi import APIRouter, Header, HTTPException
from typing import Optional, List
from app.models.schemas import StudyTask, StudyTaskCreate
from app.services.storage import storage

router = APIRouter(prefix="/api/planner", tags=["Study Planner"])

@router.get("/tasks", response_model=List[StudyTask])
async def list_tasks(x_session_id: Optional[str] = Header("anonymous-default-session")):
    session_id = x_session_id or "anonymous-default-session"
    tasks = storage.get_tasks(session_id)
    if not tasks:
        # Provide welcoming starter tasks to inspire balance
        sample1 = storage.add_task(session_id, "Review lecture slides for 25 mins", 25, "Revision")
        sample2 = storage.add_task(session_id, "Take a restful 10-minute tea or stretch break", 10, "Break")
        return [sample2, sample1]
    return tasks

@router.post("/tasks", response_model=StudyTask)
async def create_task(
    payload: StudyTaskCreate,
    x_session_id: Optional[str] = Header("anonymous-default-session")
):
    session_id = x_session_id or "anonymous-default-session"
    return storage.add_task(
        session_id=session_id,
        title=payload.title,
        estimated_minutes=payload.estimated_minutes,
        category=payload.category
    )

@router.patch("/tasks/{task_id}/toggle", response_model=StudyTask)
async def toggle_task(
    task_id: str,
    x_session_id: Optional[str] = Header("anonymous-default-session")
):
    session_id = x_session_id or "anonymous-default-session"
    updated = storage.toggle_task(session_id, task_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    x_session_id: Optional[str] = Header("anonymous-default-session")
):
    session_id = x_session_id or "anonymous-default-session"
    success = storage.delete_task(session_id, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task removed"}
