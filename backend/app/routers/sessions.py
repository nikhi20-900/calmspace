"""
Anonymous Session Credential Router
Issues, rotates, and revokes zero-PII anonymous session credentials.
"""

from fastapi import APIRouter, Depends, HTTPException, Response

from app.core.session import (
    require_authenticated_session,
    require_authenticated_session_with_secret,
)
from app.models.schemas import SessionCreateResponse, SessionRevokeResponse
from app.services.ai_guidance import rate_limiter
from app.services.storage import storage

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


def _set_no_store_headers(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


@router.post("", response_model=SessionCreateResponse, status_code=201)
async def create_anonymous_session(response: Response):
    """
    Issue a new anonymous session ID and 256-bit CSPRNG secret.
    The plaintext secret is returned once and never stored on the server.
    """
    _set_no_store_headers(response)
    return storage.create_session()


@router.post("/rotate", response_model=SessionCreateResponse)
async def rotate_session_credential(
    response: Response,
    auth_context: tuple[str, str] = Depends(require_authenticated_session_with_secret),
):
    """
    Rotate the session secret for an active authenticated session, invalidating
    the previous secret immediately while preserving session data.
    """
    _set_no_store_headers(response)
    session_id, session_secret = auth_context
    rotated = storage.rotate_session_secret(session_id, current_secret=session_secret)
    if not rotated:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session credential.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return rotated


@router.post("/revoke", response_model=SessionRevokeResponse)
async def revoke_session_credential(
    response: Response,
    session_id: str = Depends(require_authenticated_session),
):
    """Revoke the current anonymous session credential immediately."""
    _set_no_store_headers(response)
    storage.revoke_session(session_id)
    rate_limiter.clear_session(session_id)
    return SessionRevokeResponse(
        status="revoked",
        message="Session credential has been revoked.",
    )
