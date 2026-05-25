"""
Tenant industry resolver.

A single place that translates a tenant_id into the tenant's industry. Replaces
the scattered `tenant = await Tenant.get(...); industry = tenant.industry if tenant else "travel"`
pattern, which silently treated unknown / missing tenants as travel and biased
the whole system toward one vertical.

This service:
- Caches the result per request via a ContextVar (so the same request hitting
  several services doesn't repeat the lookup).
- Raises TenantNotFoundError if the tenant cannot be resolved (the previous
  silent "travel" fallback masked real bugs — missing tenant lookups must be
  loud).
- Provides a sync helper to read the cached value when already inside a
  request (for places that already have a tenant_id but cannot await).
"""
from __future__ import annotations

from contextvars import ContextVar
from typing import Dict, Literal

from bson import ObjectId

from app.constants.industry_registry import SUPPORTED_INDUSTRIES
from app.models.tenant import Tenant

# Per-request cache: maps str(tenant_id) -> industry. ContextVar is the right
# scope here — FastAPI runs each request in its own asyncio task, and ContextVar
# values are inherited but not shared across tasks.
_industry_cache: ContextVar[Dict[str, str]] = ContextVar(
    "industry_cache", default={}
)


class TenantNotFoundError(LookupError):
    """Raised when a tenant_id does not resolve to an existing tenant."""


async def get_tenant_industry(tenant_id: ObjectId | str) -> str:
    """Resolve a tenant's industry.

    Raises TenantNotFoundError if the tenant doesn't exist. Callers that
    previously fell back to "travel" should let this error propagate — the
    surrounding endpoint should return a 503 / 500 because the tenant
    reference is invalid.
    """
    key = str(tenant_id)

    cache = _industry_cache.get()
    if key in cache:
        return cache[key]

    try:
        oid = ObjectId(tenant_id) if not isinstance(tenant_id, ObjectId) else tenant_id
    except Exception as exc:  # noqa: BLE001
        raise TenantNotFoundError(f"Invalid tenant_id: {tenant_id}") from exc

    tenant = await Tenant.find_one({"_id": oid, "is_active": True})
    if not tenant:
        raise TenantNotFoundError(f"Tenant {tenant_id} not found or inactive")

    industry = tenant.industry
    if industry not in SUPPORTED_INDUSTRIES:
        # Defensive: the model uses Literal so this shouldn't happen, but if
        # the DB was migrated from older data, surface it.
        raise TenantNotFoundError(
            f"Tenant {tenant_id} has unsupported industry '{industry}'"
        )

    # Update the cache in place — ContextVar.set would create a new dict per
    # update; mutating the existing dict is fine since the var is per-task.
    cache[key] = industry
    return industry


def cached_tenant_industry(tenant_id: ObjectId | str) -> str | None:
    """Return cached industry for this request, or None if not yet resolved.

    Useful for sync code paths that cannot await — they can read what an
    earlier async call already resolved without doing another DB roundtrip.
    """
    return _industry_cache.get().get(str(tenant_id))


def clear_industry_cache() -> None:
    """Clear the per-request industry cache. Call from middleware on request end
    or after a tenant's industry changes."""
    _industry_cache.set({})


__all__ = [
    "TenantNotFoundError",
    "get_tenant_industry",
    "cached_tenant_industry",
    "clear_industry_cache",
]
