"""
Insights API Router (Issue #14)
Computes session-scoped trends, averages, and plain-language summaries for Recharts.
Never uses clinical or diagnostic language.
"""

from fastapi import APIRouter, Depends, Query

from app.core.session import require_session_id
from app.models.schemas import InsightSummary
from app.services.analytics import compute_session_insights
from app.services.storage import storage

router = APIRouter(prefix="/api/insights", tags=["Insights"])


@router.get("", response_model=InsightSummary)
async def get_insights(
    days: int = Query(default=7, ge=1, le=90, description="Time window in days"),
    session_id: str = Depends(require_session_id),
):
    storage.cleanup_expired_records(session_id)
    return compute_session_insights(session_id=session_id, days=days)
