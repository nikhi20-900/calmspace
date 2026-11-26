"""
Session Header Validation Dependency
Rejects missing, empty, trivial, or malformed X-Session-ID headers so unrelated
clients never fall back into a shared default bucket.
"""

from fastapi import Header, HTTPException

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


def require_session_id(
    x_session_id: str = Header(
        ...,
        min_length=8,
        max_length=128,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{6,126}[A-Za-z0-9]$",
        description="Client-generated anonymous session identifier (8-128 chars)",
    ),
) -> str:
    """Validate X-Session-ID format and reject degenerate placeholder values."""
    normalized = x_session_id.strip().lower()
    if normalized in _RESERVED_SESSION_IDS or ".." in x_session_id:
        raise HTTPException(
            status_code=422,
            detail="Invalid X-Session-ID header.",
        )
    return x_session_id
