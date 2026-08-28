"""
Rate limiting configuration using slowapi.

Limits applied:
  - Auth endpoints (login / register / reset-password): 5 req / minute per IP
  - File upload endpoints:                              10 req / minute per IP
  - Global fallback (all other routes):               300 req / minute per IP

The key function uses the real client IP, respecting X-Forwarded-For when
the server is behind a reverse proxy (Nginx / AWS ALB).

Redis fallback:
  If the configured Redis URL is unreachable at startup, the limiter
  automatically falls back to in-memory storage (limits work per-process,
  not cluster-wide) so the application still starts and serves traffic.
"""
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

logger = logging.getLogger(__name__)


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


class SafeLimiter(Limiter):
    """
    A Limiter subclass that gracefully handles runtime Redis connection failures.
    If Redis goes down *after* startup, we fail open (allow the request) rather
    than propagating the ConnectionError and crashing the application.
    """
    def _check_request_limit(self, request, handler, in_middleware=True):
        try:
            super()._check_request_limit(request, handler, in_middleware)
        except Exception as e:
            try:
                import redis.exceptions
                if isinstance(e, (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError)):
                    logger.warning("Rate limiter bypassed due to Redis connection error: %s", e)
                    return
            except ImportError:
                pass
            raise


def _build_limiter() -> Limiter:
    """
    Try to create a Redis-backed Limiter; fall back to memory storage if Redis
    is not reachable (avoids a hard crash / connection error at import time).
    """
    redis_uri = settings.REDIS_URL or "redis://localhost:6379/0"

    # First try with Redis
    try:
        import redis as _redis_sync
        url = redis_uri.replace("redis://", "").split("/")[0]
        host, _, port = url.partition(":")
        port = int(port) if port else 6379
        db_part = redis_uri.split("/")[-1] if "/" in redis_uri.split("@")[-1] else "0"
        db = int(db_part) if db_part.isdigit() else 0
        # Quick ping to verify connectivity
        r = _redis_sync.Redis(host=host, port=port, db=db, socket_connect_timeout=2)
        r.ping()
        r.close()
        logger.info("Rate limiter: using Redis backend at %s", redis_uri)
        return SafeLimiter(
            key_func=_get_client_ip,
            storage_uri=redis_uri,
            default_limits=["300/minute"],
            headers_enabled=True,
            enabled=settings.ENVIRONMENT not in ("development", "testing"),
        )
    except Exception as e:
        logger.warning(
            "Rate limiter: Redis not available (%s). Falling back to in-memory storage. "
            "Rate limits will be per-process only.",
            e,
        )
        return SafeLimiter(
            key_func=_get_client_ip,
            storage_uri="memory://",
            default_limits=["300/minute"],
            headers_enabled=True,
            enabled=settings.ENVIRONMENT not in ("development", "testing"),
        )


# Global limiter instance – imported everywhere a route needs a limit
limiter = _build_limiter()
