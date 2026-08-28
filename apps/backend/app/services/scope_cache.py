"""
Type-safe Redis cache for the per-request visibility tax (Phase 2).

`get_visible_owner_ids()` runs a role-hierarchy walk (2-5 DB queries) on EVERY
list/detail request and was recomputed every time. This caches the result per
(tenant_id, user_id) with a short TTL.

WHY A DEDICATED CACHE (not the @cache decorator + CustomJsonCoder):
    The shared CustomJsonCoder.decode returns plain JSON (strings). The visibility
    result is List[ObjectId], and it is fed straight into {"owner_id": {"$in": ...}}.
    Decoding ObjectIds back to *strings* would match ZERO documents — a silent
    visibility break. So we serialize/deserialize ObjectIds explicitly here.

ADMIN SENTINEL:
    get_visible_owner_ids returns None for admins ("see everything, no filter").
    We must cache that too, distinctly from "[]", so admins don't recompute the
    admin check every request. Stored as {"admin": true}.

FALLBACK:
    If Redis is unavailable (cache.redis_client is None), every call is a clean
    miss -> caller computes fresh. Behaviour is identical to pre-cache, just
    without the speedup.
"""
import json
import logging
from typing import List, Optional

from bson import ObjectId

from app.core import cache as cache_module

logger = logging.getLogger(__name__)

TTL_SECONDS = 90
_MISS = object()  # distinguishes "not cached" from a cached None (admin)


def _key(tenant_id, user_id) -> str:
    # Mirrors the {prefix}:{ns}:{...}:{tenant}:{user} shape so the existing
    # invalidate_tenant_cache glob ({prefix}:*:*:{tenant}:*) also clears these.
    from fastapi_cache import FastAPICache

    prefix = FastAPICache.get_prefix()
    return f"{prefix}:scope:visible_owner_ids:{tenant_id}:{user_id}"


async def get_cached_visible_owner_ids(tenant_id, user_id):
    """Return the cached value, or the _MISS sentinel.

    Cached value is either None (admin) or List[ObjectId]. Returns _MISS when
    there is no cache entry (or Redis is unavailable / errored).
    """
    client = cache_module.redis_client
    if client is None or tenant_id is None or user_id is None:
        return _MISS
    try:
        raw = await client.get(_key(tenant_id, user_id))
    except Exception as e:  # noqa: BLE001 - cache must never break the request
        logger.debug("scope_cache get failed: %s", e)
        return _MISS
    if raw is None:
        return _MISS
    try:
        payload = json.loads(raw)
    except Exception:  # noqa: BLE001
        return _MISS
    if payload.get("admin"):
        return None
    return [ObjectId(s) for s in payload.get("ids", [])]


async def set_cached_visible_owner_ids(tenant_id, user_id, value: Optional[List[ObjectId]]) -> None:
    client = cache_module.redis_client
    if client is None or tenant_id is None or user_id is None:
        return
    if value is None:
        payload = {"admin": True}
    else:
        payload = {"ids": [str(o) for o in value]}
    try:
        await client.set(_key(tenant_id, user_id), json.dumps(payload), ex=TTL_SECONDS)
    except Exception as e:  # noqa: BLE001
        logger.debug("scope_cache set failed: %s", e)


async def invalidate_scope_cache(tenant_id) -> None:
    """Clear all cached visibility scopes for a tenant.

    Call on role / role-hierarchy / user-active changes. With a 90s TTL this is
    a belt-and-suspenders measure; staleness is bounded even without it.
    """
    client = cache_module.redis_client
    if client is None:
        return
    from fastapi_cache import FastAPICache

    pattern = f"{FastAPICache.get_prefix()}:scope:visible_owner_ids:{tenant_id}:*"
    try:
        cursor = 0
        while True:
            cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await client.delete(*keys)
            if cursor == 0:
                break
    except Exception as e:  # noqa: BLE001
        logger.error("invalidate_scope_cache failed for %s: %s", tenant_id, e)
