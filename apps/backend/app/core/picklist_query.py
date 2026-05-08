"""
Centralized picklist query builder for multi-tenant SaaS architecture.

Implements the "Platform Default + Tenant Override" pattern:
  - Platform defaults  (tenant_id = None)   -> inherited by ALL tenants
  - Tenant overrides   (tenant_id = <specific>) -> only that tenant

Every picklist endpoint in the system MUST use this builder instead of
hard-coding {"tenant_id": current_user.tenant_id}.
"""
from typing import Optional
from beanie import PydanticObjectId


def build_picklist_query(
    tenant_id: PydanticObjectId,
    *,
    industry: Optional[str] = None,
    active_only: bool = True,
) -> dict:
    """
    Build a MongoDB filter that returns both platform defaults AND tenant
    overrides for a given tenant, optionally scoped by industry.

    Args:
        tenant_id:   The current tenant's ObjectId.
        industry:    If provided, restricts to picklists scoped to this
                     industry OR global ones (industry=None / missing).
        active_only: If True (default), adds {"is_active": True}.

    Returns:
        A dict suitable for passing to ``Model.find(query)``.

    Examples:
        # Basic: all picklists visible to this tenant
        q = build_picklist_query(tenant_id)

        # Industry-scoped: only travel + global picklists
        q = build_picklist_query(tenant_id, industry="travel")
    """
    # Core tenant isolation: platform defaults (None) + tenant-specific
    tenant_or = {"$or": [
        {"tenant_id": tenant_id},
        {"tenant_id": None},
    ]}

    if industry:
        # Must satisfy BOTH the tenant filter AND the industry filter
        industry_or = {"$or": [
            {"industry": industry},
            {"industry": None},
            {"industry": {"$exists": False}},
        ]}
        query: dict = {"$and": [tenant_or, industry_or]}
    else:
        query = {**tenant_or}

    if active_only:
        query["is_active"] = True

    return query
