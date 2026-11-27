"""
Session Credential Authentication Dependency
Enforces server-issued anonymous Bearer credentials (`<session_id>.<session_secret>`),
rejecting missing, malformed, spoofed, expired, or revoked credentials with HTTP 401.
"""

import re

from fastapi import Header, HTTPException

from app.services.storage import storage

_RESERVED_SESSION_IDS = frozenset(
    {
        "anonymous-default-session",
        "anonymous",
        "default",
        "undefined",
        "null",
        "none",
        "test-default",
    }
)

_SESSION_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{6,126}[A-Za-z0-9]$")


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Invalid or expired session credential.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _is_valid_session_id_format(session_id: str) -> bool:
    if not _SESSION_ID_RE.match(session_id):
        return False
    normalized = session_id.strip().lower()
    return not (normalized in _RESERVED_SESSION_IDS or ".." in session_id)


def _verify_bearer_headers(
    authorization: str | None,
    x_session_id: str | None,
) -> tuple[str, str]:
    """
    Validate server-issued anonymous session credential (`Authorization: Bearer <id>.<secret>`).
    Returns identical 401 Unauthorized for missing, malformed, unknown, wrong-secret,
    expired, or revoked credentials so no validation oracle is exposed.
    """
    if not authorization:
        raise _unauthorized()

    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise _unauthorized()

    token = parts[1].strip()
    if "." not in token:
        raise _unauthorized()

    session_id, session_secret = token.split(".", 1)
    if not _is_valid_session_id_format(session_id):
        raise _unauthorized()

    if (
        not session_secret
        or len(session_secret) < 16
        or len(session_secret) > 256
        or any(ch.isspace() for ch in session_secret)
    ):
        raise _unauthorized()

    if x_session_id is not None and x_session_id != session_id:
        raise _unauthorized()

    if not storage.verify_session_credential(session_id, session_secret):
        raise _unauthorized()

    return session_id, session_secret


def require_authenticated_session(
    authorization: str | None = Header(
        default=None,
        description="Bearer <session_id>.<session_secret>",
    ),
    x_session_id: str | None = Header(
        default=None,
        description="Optional matching session_id header; never accepted without Bearer secret",
    ),
) -> str:
    session_id, _ = _verify_bearer_headers(authorization, x_session_id)
    return session_id


def require_authenticated_session_with_secret(
    authorization: str | None = Header(
        default=None,
        description="Bearer <session_id>.<session_secret>",
    ),
    x_session_id: str | None = Header(
        default=None,
        description="Optional matching session_id header; never accepted without Bearer secret",
    ),
) -> tuple[str, str]:
    return _verify_bearer_headers(authorization, x_session_id)


require_session_id = require_authenticated_session
