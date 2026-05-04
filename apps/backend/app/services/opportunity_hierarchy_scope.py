"""
Hierarchy-based visibility for opportunities (owner_id).

When hierarchy scope is enabled, a user sees:
- Their own opportunities
- Opportunities owned by users in descendant hierarchy nodes (downline), not peers on the same node.

Peers assigned to the same RoleHierarchy node cannot see each other's opportunities.
"""
from typing import List

from app.models.role import RoleHierarchy
from app.models.user import User


async def collect_descendant_hierarchy_node_ids(
    tenant_id: ObjectId, parent_node_id: ObjectId
) -> List[ObjectId]:
    """BFS from direct children of parent_node_id; does not include parent_node_id."""
    out: List[ObjectId] = []
    frontier: List[ObjectId] = [parent_node_id]
    while frontier:
        cur = frontier.pop(0)
        children = await RoleHierarchy.find(
            {"tenant_id": tenant_id, "parent_id": cur, "deleted_at": None}
        ).to_list()
        for ch in children:
            out.append(ch.id)
            frontier.append(ch.id)
    return out


async def user_ids_for_hierarchy_nodes(
    tenant_id: ObjectId, node_ids: List[ObjectId]
) -> List[ObjectId]:
    if not node_ids:
        return []
    users = await User.find(
        {
            "tenant_id": tenant_id,
            "role_hierarchy_id": {"$in": list(node_ids)},
            "is_active": True,
            "deleted_at": None,
        }
    ).to_list()
    return [u.id for u in users]


async def get_allowed_owner_ids_for_hierarchy_scope(user: User) -> List[ObjectId]:
    """
    Allowed opportunity owner_ids for the current user when hierarchy scope is on.

    Includes the user and all users assigned to descendant hierarchy nodes (reports / downline).
    Excludes peers on the same hierarchy node (they are not descendants of that node).
    """
    allowed: set[ObjectId] = {user.id}
    if user.role_hierarchy_id is None:
        return list(allowed)

    desc_nodes = await collect_descendant_hierarchy_node_ids(
        user.tenant_id, user.role_hierarchy_id
    )
    downline_ids = await user_ids_for_hierarchy_nodes(user.tenant_id, desc_nodes)
    allowed.update(downline_ids)
    return list(allowed)
