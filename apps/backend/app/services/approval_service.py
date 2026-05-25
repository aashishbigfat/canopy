"""
Approval service — unified gate for actions that need manager sign-off.

Currently used by:
- bd_visit_service.approve_visit / reject_visit
- expense_service.approve_expense / reject_expense (Phase 6)

Today the rule is simple: the record's `reporting_manager_id` OR any user
with an admin role may approve. Centralising it here means Phase 7+ can
add an `ExpenseApprovalRule` matrix without touching every caller.
"""
from typing import Any, Optional
import logging

from bson import ObjectId
from app.models.role import Role
from app.models.user import User

logger = logging.getLogger(__name__)


async def _user_has_admin_role(user: User) -> bool:
    if not user.role_ids:
        return False
    role = await Role.find_one(
        {
            "_id": {"$in": list(user.role_ids)},
            "tenant_id": user.tenant_id,
            "is_admin": True,
            "deleted_at": None,
        }
    )
    return role is not None


async def _user_has_permission(user: User, permission: str) -> bool:
    return await user.has_permission(permission)


async def can_approve(approver: User, record: Any, *, extra_perm: Optional[str] = None) -> bool:
    """
    Returns True when `approver` may approve/reject `record`.

    Rules (any one is sufficient):
    - approver.id == record.reporting_manager_id (direct manager)
    - approver has an admin role within the same tenant
    - (optional) approver has the explicit permission like "approve_expense"
    """
    # Tenant boundary — record must belong to approver's tenant.
    record_tenant = getattr(record, "tenant_id", None)
    if record_tenant and record_tenant != approver.tenant_id:
        return False

    manager_id = getattr(record, "reporting_manager_id", None)
    if manager_id and ObjectId(manager_id) == approver.id:
        return True

    if extra_perm and await _user_has_permission(approver, extra_perm):
        return True

    if await _user_has_admin_role(approver):
        return True

    return False


async def assert_can_approve(approver: User, record: Any, *, extra_perm: Optional[str] = None) -> None:
    """Raise ValueError if not allowed. Convenience for services."""
    ok = await can_approve(approver, record, extra_perm=extra_perm)
    if not ok:
        raise ValueError("Not authorized to approve this record")
