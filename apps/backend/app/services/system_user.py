"""
System service-user — owns the unassigned "System" opportunity pool.

When a lead is converted to an opportunity without an owner, the opportunity
is assigned to this per-tenant service account so it shows up as owner
"System" (matching the legacy CRM). The pre-sales team then reassigns it to a
real employee. The account is created inactive and not assignable, so it can
never log in or enter auto-assignment — it only holds ownership.
"""
import secrets

from bson import ObjectId

from app.models.user import User

SYSTEM_USER_NAME = "System"


def _system_email(tenant_id: ObjectId) -> str:
    # User.email is globally unique — scope the sentinel by tenant id.
    return f"system+{tenant_id}@system.tutterfly.local"


async def get_system_user(tenant_id: ObjectId) -> User | None:
    """Return the tenant's System user, or None if it hasn't been created yet."""
    return await User.find_one(
        {"tenant_id": tenant_id, "is_system": True, "deleted_at": None}
    )


async def get_or_create_system_user(tenant_id: ObjectId) -> User:
    """Find-or-create the tenant's System service user (race-safe)."""
    existing = await get_system_user(tenant_id)
    if existing:
        return existing

    user = User(
        name=SYSTEM_USER_NAME,
        email=_system_email(tenant_id),
        password=User.hash_password(secrets.token_urlsafe(32)),  # unusable
        tenant_id=tenant_id,
        is_active=False,                     # cannot log in
        is_verified=False,
        is_available_for_assignment=False,   # excluded from auto-assignment
        is_system=True,
        role_ids=[],                         # no permissions
    )
    try:
        await user.insert()
        return user
    except Exception:
        # Concurrent conversion already created it (unique email) — re-fetch.
        again = await get_system_user(tenant_id)
        if again:
            return again
        raise
