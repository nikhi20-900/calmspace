"""
Session Header Validation Dependency
Rejects missing, empty, or malformed X-Session-ID headers so unrelated clients
never fall back into a shared default bucket.
"""

from fastapi import Header


def require_session_id(
    x_session_id: str = Header(
        ...,
        min_length=1,
        max_length=128,
        pattern=r"^[A-Za-z0-9._-]+$",
        description="Client-generated anonymous session UUID",
    ),
) -> str:
    return x_session_id
