import json
import logging
import redis.asyncio as redis
from fastapi.encoders import jsonable_encoder
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.coder import Coder
from app.core.config import settings
from bson import ObjectId

logger = logging.getLogger(__name__)


class CustomJsonCoder(Coder):
    @classmethod
    def encode(cls, value):
        def custom_default(obj):
            if isinstance(obj, ObjectId):
                return str(obj)
            return jsonable_encoder(obj)
        return json.dumps(value, default=custom_default).encode("utf-8")

    @classmethod
    def decode(cls, value):
        return json.loads(value.decode("utf-8"))


redis_client = None

async def init_cache():
    """Initializes the Redis connection pool and FastAPI Cache.
    Falls back to in-memory cache if Redis is not available.
    """
    global redis_client
    redis_url = settings.REDIS_URL or "redis://localhost:6379/0"

    try:
        client = redis.from_url(
            redis_url, 
            encoding="utf-8", 
            decode_responses=False,
            socket_connect_timeout=2,
            socket_timeout=5,
            retry_on_timeout=True,
            socket_keepalive=True
        )
        # Verify connectivity
        await client.ping()
        redis_client = client
        FastAPICache.init(RedisBackend(redis_client), prefix="tutterfly-cache", coder=CustomJsonCoder)
        logger.info("Cache: using Redis backend at %s", redis_url)
    except Exception as e:
        logger.warning(
            "Cache: Redis not available (%s). Falling back to in-memory cache. "
            "Cache will not persist across restarts or be shared between processes.",
            e,
        )
        FastAPICache.init(InMemoryBackend(), prefix="tutterfly-cache", coder=CustomJsonCoder)

async def close_cache():
    """Closes the Redis connection pool."""
    global redis_client
    if redis_client:
        await redis_client.close()

def custom_key_builder(func, namespace: str = "", request=None, response=None, *args, **kwargs):
    """
    Builds a cache key that strictly isolates caches by tenant_id.
    Looks for tenant_id and user_id in the kwargs or args.
    """
    tenant_id = kwargs.get("tenant_id")
    user_id = kwargs.get("user_id", "system")
    
    if not tenant_id:
        # Fallback if no tenant is provided - highly dangerous in a multi-tenant system
        tenant_id = "global"
        
    base_key = f"{FastAPICache.get_prefix()}:{namespace}:{func.__module__}:{func.__name__}"
    return f"{base_key}:{tenant_id}:{user_id}"

async def invalidate_tenant_cache(tenant_id: str):
    """
    Invalidates all Redis cache keys associated with a specific tenant_id.
    Useful when core entities (leads, opportunities) are modified, requiring dashboard recalculation.
    No-op if Redis is not available (in-memory cache).
    """
    global redis_client
    if not redis_client:
        return
        
    # Match any cache key that contains the tenant_id segment
    pattern = f"{FastAPICache.get_prefix()}:*:*:{tenant_id}:*"
    
    try:
        cursor = 0
        while True:
            cursor, keys = await redis_client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await redis_client.delete(*keys)
            if cursor == 0:
                break
    except Exception as e:
        logger.error(f"Failed to invalidate tenant cache for {tenant_id}: {e}")

async def invalidate_module_cache(module: str, tenant_id: str):
    """
    Invalidates all Redis cache keys associated with a specific module and tenant_id.
    """
    global redis_client
    if not redis_client:
        return
        
    pattern = f"{FastAPICache.get_prefix()}:{module}:*:{tenant_id}:*"
    
    try:
        cursor = 0
        while True:
            cursor, keys = await redis_client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await redis_client.delete(*keys)
            if cursor == 0:
                break
    except Exception as e:
        logger.error(f"Failed to invalidate {module} cache for {tenant_id}: {e}")

async def invalidate_account_cache(tenant_id: str):
    await invalidate_module_cache("accounts", tenant_id)

async def invalidate_contact_cache(tenant_id: str):
    await invalidate_module_cache("contacts", tenant_id)

async def get_cache_status() -> dict:
    """Return cache backend status for health checks."""
    global redis_client
    if redis_client:
        try:
            await redis_client.ping()
            info = await redis_client.info(section="memory")
            return {
                "backend": "redis",
                "connected": True,
                "used_memory_human": info.get("used_memory_human", "unknown"),
                "prefix": FastAPICache.get_prefix(),
            }
        except Exception as e:
            return {"backend": "redis", "connected": False, "error": str(e)}
    return {"backend": "in-memory", "connected": True, "prefix": FastAPICache.get_prefix()}
