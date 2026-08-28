"""
Cached per-tenant lookup directories (PERF Phase 5).

Every list endpoint (accounts, contacts, leads, opportunities, ...) fetches the
full set of active users (for the owner dropdown + owner-name resolution) and
several near-static picklists on EVERY request. These are now index-backed
(Phase 1) but still cost a round-trip + full-document parse each time. This
caches the lightweight projections in Redis with a short TTL.

Serialization: returns plain JSON-safe dicts (ids already str), so the shared
CustomJsonCoder round-trips them correctly (unlike ObjectId lists — see
scope_cache for why that needs special handling).

Invalidation: user writes call invalidate_tenant_cache (see user_service);
picklist writes should clear the relevant module cache. The short TTL bounds
staleness regardless.
"""
from typing import List, Dict, Any, Optional

from beanie import PydanticObjectId
from fastapi_cache.decorator import cache

from app.core.cache import custom_key_builder
from app.models.user import User


# NOTE: always call with tenant_id as a KEYWORD arg — custom_key_builder reads
# tenant_id from kwargs (or func_args[1], assuming a leading self). For a bare
# function the positional fallback would mis-key, so keyword is required.
@cache(expire=60, key_builder=custom_key_builder)
async def get_active_users(tenant_id: str) -> List[Dict[str, Any]]:
    """Active users for a tenant as light dicts: {id, name, email}.

    Sorted by name to match the owner-dropdown ordering the list endpoints used.
    """
    users = await User.find(
        {"tenant_id": PydanticObjectId(tenant_id), "is_active": True}
    ).sort("+name").to_list()
    return [
        {"id": str(u.id), "name": u.name, "email": u.email}
        for u in users
    ]


async def get_active_user_name_map(tenant_id: str) -> Dict[str, str]:
    """{user_id_str: name} built from the cached active-user list."""
    return {u["id"]: u["name"] for u in await get_active_users(tenant_id=tenant_id)}
