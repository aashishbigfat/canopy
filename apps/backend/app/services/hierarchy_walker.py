"""
RoleHierarchy traversal — single source of truth for tree walks (up & down).

Two callers rely on these helpers:
- visibility_scope.get_visible_owner_ids() walks DOWN to collect subordinates
  for "manager sees their team's records" filtering.
- bd_assignment_service.resolve_for_address() walks UP to find a BD user's
  reporting manager for approval routing.

Keeping both walkers in one module prevents the inevitable drift when each
caller invents their own BFS.
"""
from typing import List, Optional
from bson import ObjectId

from app.models.role import RoleHierarchy
from app.models.user import User


async def descendant_user_ids(tenant_id: ObjectId, node_id: ObjectId) -> List[ObjectId]:
    """
    BFS down from `node_id`'s direct children, returning user IDs from all
    descendant nodes. Excludes users in the starting node itself (peers).
    """
    descendant_node_ids: List[ObjectId] = []
    frontier: List[ObjectId] = [node_id]

    while frontier:
        current = frontier.pop(0)
        children = await RoleHierarchy.find(
            {"tenant_id": tenant_id, "parent_id": current, "deleted_at": None}
        ).to_list()
        for child in children:
            descendant_node_ids.append(child.id)
            frontier.append(child.id)

    if not descendant_node_ids:
        return []

    users = await User.find(
        {
            "tenant_id": tenant_id,
            "role_hierarchy_id": {"$in": descendant_node_ids},
            "is_active": True,
            "deleted_at": None,
        }
    ).to_list()
    return [u.id for u in users]


async def ancestor_user_ids(tenant_id: ObjectId, user_id: ObjectId) -> List[ObjectId]:
    """
    Walk UP from `user_id`'s hierarchy node to the root, collecting the user
    ids assigned at each ancestor node. Returns ordered nearest-first; the
    first entry is the user's direct manager (peers in the parent node).
    """
    user = await User.find_one(
        {"_id": user_id, "tenant_id": tenant_id, "is_active": True, "deleted_at": None}
    )
    if not user or not user.role_hierarchy_id:
        return []

    node = await RoleHierarchy.find_one(
        {"_id": user.role_hierarchy_id, "tenant_id": tenant_id, "deleted_at": None}
    )
    if not node:
        return []

    ancestor_ids: List[ObjectId] = []
    visited: set[ObjectId] = {node.id}  # cycle guard

    parent_id = node.parent_id
    while parent_id is not None and parent_id not in visited:
        visited.add(parent_id)
        parent = await RoleHierarchy.find_one(
            {"_id": parent_id, "tenant_id": tenant_id, "deleted_at": None}
        )
        if not parent:
            break
        for uid in parent.user_ids or []:
            if uid != user_id and uid not in ancestor_ids:
                ancestor_ids.append(uid)
        parent_id = parent.parent_id

    return ancestor_ids


async def direct_manager_id(tenant_id: ObjectId, user_id: ObjectId) -> Optional[ObjectId]:
    """
    Convenience: return the user_id of the nearest ancestor (the direct
    manager). None if the user has no role hierarchy or sits at the root.
    """
    ancestors = await ancestor_user_ids(tenant_id, user_id)
    return ancestors[0] if ancestors else None
