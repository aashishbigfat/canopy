"""
Denormalized name maintenance (PERF Phase 7).

`owner_name` / `account_name` are server-managed copies of the related User /
Account name so list endpoints don't have to join. They are maintained:
  - on create     → Beanie `before_event(Insert)` hooks on each model
  - on change-owner → the change-owner service/endpoint sets owner_name
  - on rename      → a Celery task propagates the new name to child records

Reads prefer the denormalized value and fall back to a live lookup for any row
still missing it, so the whole feature is non-breaking even mid-backfill.
"""
from typing import Optional


async def resolve_owner_name(tenant_id, owner_id) -> Optional[str]:
    """Tenant-scoped lookup of a user's display name (for denormalized owner_name)."""
    if not owner_id:
        return None
    from app.models.user import User
    u = await User.find_one({"_id": owner_id, "tenant_id": tenant_id})
    return u.name if u else None


async def resolve_account_name(tenant_id, account_id) -> Optional[str]:
    """Tenant-scoped lookup of an account's name (for denormalized account_name)."""
    if not account_id:
        return None
    from app.models.account import Account
    a = await Account.find_one(
        {"_id": account_id, "tenant_id": tenant_id, "deleted_at": None}
    )
    return a.name if a else None


async def propagate_owner_name(tenant_id, owner_id, new_name) -> None:
    """Push a renamed user's name onto every record they own (denormalized owner_name).

    Inline + immediate (one index-backed update_many per collection, bounded
    regardless of how many records the user owns). Renames are rare, so this is
    cheaper and more consistent than an async job that might lag behind reads.
    """
    if not owner_id:
        return
    from app.models.account import Account
    from app.models.contact import Contact
    from app.models.lead import Lead
    from app.models.opportunity import Opportunity

    flt = {"tenant_id": tenant_id, "owner_id": owner_id}
    for Model in (Account, Contact, Lead, Opportunity):
        await Model.find(flt).update({"$set": {"owner_name": new_name}})


async def propagate_account_name(tenant_id, account_id, new_name) -> None:
    """Push a renamed account's name onto its contacts + opportunities."""
    if not account_id:
        return
    from app.models.contact import Contact
    from app.models.opportunity import Opportunity

    flt = {"tenant_id": tenant_id, "account_id": account_id}
    for Model in (Contact, Opportunity):
        await Model.find(flt).update({"$set": {"account_name": new_name}})
