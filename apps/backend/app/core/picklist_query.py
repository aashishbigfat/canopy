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
    picklist_type: Optional[str] = None,
) -> dict:
    """
    Build a MongoDB filter that returns both platform defaults AND tenant
    overrides for a given tenant, optionally scoped by industry and picklist type.

    Args:
        tenant_id:      The current tenant's ObjectId.
        industry:       If provided, restricts to picklists scoped to this
                         industry OR global ones (industry=None / missing).
        active_only:    If True (default), adds {"is_active": True}.
        picklist_type:  If provided, filters by the discriminator field
                         (e.g. "lead_status", "source", "industry").
                         REQUIRED when querying the shared 'picklists' collection
                         to avoid cross-type contamination.

    Returns:
        A dict suitable for passing to ``Model.find(query)``.

    Examples:
        # Basic: all picklists visible to this tenant
        q = build_picklist_query(tenant_id)

        # Industry-scoped: only travel + global picklists
        q = build_picklist_query(tenant_id, industry="travel")

        # Type-scoped: only lead_status picklists for this tenant
        q = build_picklist_query(tenant_id, picklist_type="lead_status")
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

    # Discriminator filter — prevents cross-type contamination in shared collection
    if picklist_type:
        query["picklist_type"] = picklist_type

    return query


def dedup_picklist_items(items: list) -> list:
    """
    Deduplicate picklist results: tenant-specific items shadow (override)
    platform defaults with the same name.

    When both a platform default (tenant_id=None) and a tenant override exist
    with the same name, only the tenant's version is kept.

    Args:
        items: List of picklist document objects with tenant_id and name attrs.

    Returns:
        Deduplicated list preserving original order.
    """
    if not items:
        return items

    tenant_names = {
        item.name for item in items
        if getattr(item, "tenant_id", None) is not None
    }
    return [
        item for item in items
        if getattr(item, "tenant_id", None) is not None
        or item.name not in tenant_names
    ]
