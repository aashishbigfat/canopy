"""
Data visibility scoping service — Industry-grade owner+hierarchy scoping.

Determines which records a user can see based on:
1. Super Admin / admin role → sees everything (returns None = no filter)
2. Manager in hierarchy → sees own records + subordinates' records
3. Regular user → sees only own records

This mirrors how Salesforce/Zoho CRM handle data visibility:
- Record ownership determines base visibility
- Hierarchy determines upward visibility (managers see downline)
- Re-assignment immediately transfers visibility to new owner
"""
from typing import List, Optional
from bson import ObjectId

from app.models.user import User
from app.models.role import Role, RoleHierarchy
from app.services import hierarchy_walker


async def _is_admin_user(user: User) -> bool:
    """Check if user has any admin role (is_admin=True on the role).

    SECURITY: Roles must be fetched scoped to the user's tenant_id. A role_id
    referencing another tenant's role (whether by accident or attack) must not
    grant admin privileges in this tenant.
    """
    if not user.role_ids:
        return False
    # Single tenant-scoped query for all the user's role_ids — safer and faster
    # than per-id fetches.
    role = await Role.find_one(
        {
            "_id": {"$in": list(user.role_ids)},
            "tenant_id": user.tenant_id,
            "is_admin": True,
            "deleted_at": None,
        }
    )
    return role is not None


async def _collect_descendant_user_ids(tenant_id: ObjectId, hierarchy_node_id: ObjectId) -> List[ObjectId]:
    """Delegates to the shared hierarchy_walker so up/down BFS lives in one place."""
    return await hierarchy_walker.descendant_user_ids(tenant_id, hierarchy_node_id)


async def get_visible_owner_ids(user: User) -> Optional[List[ObjectId]]:
    """
    Returns the list of owner_ids whose records the user can see:
    - None → admin, sees everything (no filter applied)
    - [user.id] → regular user with no hierarchy, sees only own records
    - [user.id, sub1, sub2, ...] → manager, sees own + subordinates

    Usage in queries:
        visible = await get_visible_owner_ids(current_user)
        if visible is not None:
            query["owner_id"] = {"$in": visible}
    """
    # Admin sees everything
    if await _is_admin_user(user):
        return None

    # Start with the user's own ID
    allowed: set[ObjectId] = {user.id}

    # If user is in a hierarchy, include all subordinate users
    if user.role_hierarchy_id:
        descendant_ids = await _collect_descendant_user_ids(
            user.tenant_id, user.role_hierarchy_id
        )
        allowed.update(descendant_ids)

    return list(allowed)


async def opportunity_pool_owner_ids(user: User) -> List[ObjectId]:
    """Extra owner ids a non-admin user may additionally see for opportunities:
    the tenant's "System" pool of unassigned opportunities.

    Only users who can assign opportunities (edit_opportunity permission) get
    the pool, so a regular salesperson's list isn't cluttered with it. Admins
    already see everything (get_visible_owner_ids returns None), so this is for
    the non-admin pre-sales case. Returns [] when there is no System user yet
    or the user can't assign.
    """
    if not await user.has_permission("edit_opportunity"):
        return []
    from app.services.system_user import get_system_user
    system_user = await get_system_user(user.tenant_id)
    return [system_user.id] if system_user else []


def apply_visibility_filter(query: dict, visible_owner_ids: Optional[List[ObjectId]]) -> dict:
    """
    Apply visibility scoping to a MongoDB query dict.
    If visible_owner_ids is None (admin), query is unchanged.
    Otherwise, adds owner_id $in filter.
    """
    if visible_owner_ids is not None:
        query["owner_id"] = {"$in": visible_owner_ids}
    return query


def is_record_visible(record_owner_id: ObjectId, visible_owner_ids: Optional[List[ObjectId]]) -> bool:
    """
    Returns True if the user is allowed to see a specific record.
    - None (admin) → always visible
    - List → owner must be in the list
    """
    if visible_owner_ids is None:
        return True
    return record_owner_id in visible_owner_ids


def is_task_visible(task_owner_id: Optional[ObjectId], task_assigned_id: Optional[ObjectId],
                    visible_owner_ids: Optional[List[ObjectId]]) -> bool:
    """
    Tasks have dual ownership: created_by (owner_id) AND assigned_user_id.
    A task is visible if EITHER the creator OR the assignee is in the user's visible scope.
    Admin (visible_owner_ids=None) always sees everything.
    """
    if visible_owner_ids is None:
        return True
    if task_owner_id and task_owner_id in visible_owner_ids:
        return True
    if task_assigned_id and task_assigned_id in visible_owner_ids:
        return True
    return False


def apply_lead_bd_visibility_filter(
    query: dict,
    visible_owner_ids: Optional[List[ObjectId]],
) -> dict:
    """
    Lead-specific filter that grants visibility when the user is EITHER the
    sales owner OR the BD owner OR the reporting manager. Admin (None) is
    unchanged.

    Use this in /bd/* views where BDs need to see leads they are field-owners
    of even if the sales owner is outside their hierarchy.
    """
    if visible_owner_ids is None:
        return query
    or_clauses = [
        {"owner_id": {"$in": visible_owner_ids}},
        {"bd_owner_id": {"$in": visible_owner_ids}},
        {"reporting_manager_id": {"$in": visible_owner_ids}},
    ]
    # Merge with existing $or rather than overwrite, if any.
    existing_or = query.pop("$or", None)
    if existing_or:
        query["$and"] = [{"$or": existing_or}, {"$or": or_clauses}]
    else:
        query["$or"] = or_clauses
    return query
