"""
Insights API Router (Issue #14)
Computes session-scoped trends, averages, and plain-language summaries for Recharts.
Never uses clinical or diagnostic language.
"""

from fastapi import APIRouter, Depends, Query

from app.core.session import require_session_id
from app.models.schemas import InsightSummary, InsightSummaryV2
from app.services.analytics import compute_session_insights, compute_session_insights_v2
from app.services.storage import storage

router = APIRouter(prefix="/api/insights", tags=["Insights"])


@router.get("", response_model=InsightSummary)
async def get_insights(
    days: int = Query(default=7, ge=1, le=90, description="Time window in days"),
    session_id: str = Depends(require_session_id),
):
    storage.cleanup_expired_records(session_id)
    return compute_session_insights(session_id=session_id, days=days)


@router.get("/v2", response_model=InsightSummaryV2)
async def get_insights_v2(
    days: int = Query(
        default=30, ge=1, le=90, description="Local calendar window in days"
    ),
    timezone_name: str = Query(
        default="UTC",
        alias="timezone",
        min_length=1,
        max_length=64,
        description="IANA timezone used to group local calendar days",
    ),
    session_id: str = Depends(require_session_id),
):
    """Return timezone-aware analytics for the authenticated anonymous session."""
    return compute_session_insights_v2(
        session_id=session_id,
        days=days,
        timezone_name=timezone_name,
    )
