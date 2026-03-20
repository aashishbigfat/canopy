"""
Rate limiting configuration using slowapi (backed by Redis).

Limits applied:
  - Auth endpoints (login / register / reset-password): 5 req / minute per IP
  - File upload endpoints:                              10 req / minute per IP
  - Global fallback (all other routes):               100 req / minute per IP

The key function uses the real client IP, respecting X-Forwarded-For when
the server is behind a reverse proxy (Nginx / AWS ALB).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

def _get_client_ip(request) -> str:
    """
    Resolve the real client IP.
    If behind a reverse proxy, X-Forwarded-For contains the original IP as
    the first entry: "client, proxy1, proxy2".
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


# Build the Redis storage URI from settings
_redis_uri = settings.REDIS_URL or "redis://localhost:6379/0"

# Global limiter instance – imported everywhere a route needs a limit
limiter = Limiter(
    key_func=_get_client_ip,
    storage_uri=_redis_uri,
    default_limits=["300/minute"],  # global fallback
    headers_enabled=True,           # expose X-RateLimit-* headers
)
