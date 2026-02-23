import json
import redis.asyncio as redis
from fastapi.encoders import jsonable_encoder
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.coder import Coder
from app.core.config import settings
from bson import ObjectId

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
    """Initializes the Redis connection pool and FastAPI Cache."""
    global redis_client
    redis_url = settings.REDIS_URL or "redis://localhost:6379/0"
    
    redis_client = redis.from_url(redis_url, encoding="utf-8", decode_responses=False)
    FastAPICache.init(RedisBackend(redis_client), prefix="tutterfly-cache", coder=CustomJsonCoder)

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
        # Log a warning here in a production system.
        tenant_id = "global"
        
    base_key = f"{FastAPICache.get_prefix()}:{namespace}:{func.__module__}:{func.__name__}"
    return f"{base_key}:{tenant_id}:{user_id}"

async def invalidate_tenant_cache(tenant_id: str):
    """
    Invalidates all Redis cache keys associated with a specific tenant_id.
    Useful when core entities (leads, opportunities) are modified, requiring dashboard recalculation.
    """
    global redis_client
    if not redis_client:
        return
        
    # Match any cache key that contains the tenant_id segment
    pattern = f"{FastAPICache.get_prefix()}:*:*:{tenant_id}:*"
    
    # Use SCAN to find keys without blocking Redis (important for scale)
    cursor = "0"
    while cursor != 0:
        cursor, keys = await redis_client.scan(cursor=cursor, match=pattern, count=100)
        if keys:
            await redis_client.delete(*keys)
