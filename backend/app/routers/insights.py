"""
Insights API Router (Issue #14)
Computes session-scoped trends, averages, and plain-language summaries for Recharts.
Never uses clinical or diagnostic language.
"""

from fastapi import APIRouter, Header, Query

from app.models.schemas import InsightSummary
from app.services.analytics import compute_session_insights

router = APIRouter(prefix="/api/insights", tags=["Insights"])


@router.get("", response_model=InsightSummary)
async def get_insights(
    days: int = Query(default=7, ge=1, le=90, description="Time window in days"),
    x_session_id: str | None = Header("anonymous-default-session"),
):
    session_id = x_session_id or "anonymous-default-session"
    return compute_session_insights(session_id=session_id, days=days)
