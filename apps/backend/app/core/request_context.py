"""
Per-request activity context.

Holds the authenticated user + request metadata for the duration of a single
request so that any service using ActivityMixin can log activity without the
endpoint having to call set_request_context() explicitly.

Populated in get_current_user() (see app/api/deps.py). Because each request runs
in its own asyncio task, the ContextVar is isolated per request — there is no
cross-request leakage.
"""
from contextvars import ContextVar
from typing import Optional, Dict, Any

_activity_context: ContextVar[Optional[Dict[str, Any]]] = ContextVar(
    "activity_context", default=None
)


def set_activity_context(context: Dict[str, Any]) -> None:
    """Store the current request's activity context."""
    _activity_context.set(context)


def get_activity_context() -> Optional[Dict[str, Any]]:
    """Return the current request's activity context, or None if unset."""
    return _activity_context.get()
