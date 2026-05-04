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


async def _is_admin_user(user: User) -> bool:
    """Check if user has any admin role (is_admin=True on the role)."""
    if not user.role_ids:
        return False
    for role_id in user.role_ids:
        role = await Role.get(role_id)
        if role and role.is_admin:
            return True
    return False


async def _collect_descendant_user_ids(tenant_id: ObjectId, hierarchy_node_id: ObjectId) -> List[ObjectId]:
    """
    BFS from direct children of hierarchy_node_id.
    Returns user IDs from all descendant nodes (NOT the node itself — peers excluded).
    """
    descendant_user_ids: List[ObjectId] = []
    frontier: List[ObjectId] = [hierarchy_node_id]

    while frontier:
        current_node_id = frontier.pop(0)
        children = await RoleHierarchy.find(
            {"tenant_id": tenant_id, "parent_id": current_node_id, "deleted_at": None}
        ).to_list()
        for child in children:
            # Collect users from child nodes
            if child.user_ids:
                descendant_user_ids.extend(child.user_ids)
            # Continue BFS into grandchildren
            frontier.append(child.id)

    return descendant_user_ids


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
