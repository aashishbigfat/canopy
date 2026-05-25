"""
Hierarchy service layer - Business logic for hierarchy management
"""
from typing import List, Optional

from bson import ObjectId

from app.models.role import RoleHierarchy
from app.models.user import User
from app.schemas.hierarchy import HierarchyCreate, HierarchyUpdate


class HierarchyService:
    """Service for hierarchy business logic"""

    async def _get_parent_if_valid(
        self, parent_id: Optional[str], tenant_id: ObjectId
    ) -> Optional[RoleHierarchy]:
        if not parent_id:
            return None
        try:
            pid = ObjectId(parent_id)
        except Exception:
            raise ValueError("Parent hierarchy not found")
        parent = await RoleHierarchy.find_one(
            {"_id": pid, "tenant_id": tenant_id, "deleted_at": None}
        )
        if not parent:
            raise ValueError("Parent hierarchy not found")
        return parent

    async def _would_create_cycle(
        self, node_id: ObjectId, new_parent_id: ObjectId, tenant_id: ObjectId
    ) -> bool:
        """True if new_parent_id is node_id or lies under node_id in the tree.

        SECURITY: traversal is scoped to the tenant so a planted parent_id
        pointing into another tenant's tree cannot bypass the cycle check.
        """
        if new_parent_id == node_id:
            return True
        current = await RoleHierarchy.find_one(
            {"_id": new_parent_id, "tenant_id": tenant_id, "deleted_at": None}
        )
        while current and current.parent_id:
            if current.parent_id == node_id:
                return True
            current = await RoleHierarchy.find_one(
                {"_id": current.parent_id, "tenant_id": tenant_id, "deleted_at": None}
            )
        return False

    async def create_hierarchy(
        self,
        hierarchy_data: HierarchyCreate,
        user_id: ObjectId,
        tenant_id: ObjectId,
    ) -> RoleHierarchy:
        parent = await self._get_parent_if_valid(hierarchy_data.parent_id, tenant_id)

        # Same name may exist under different parents; uniqueness is per (tenant, parent, name).
        parent_key = parent.id if parent else None
        existing = await RoleHierarchy.find_one(
            {"name": hierarchy_data.name, "tenant_id": tenant_id, "deleted_at": None, "parent_id": parent_key}
        )
        if existing:
            raise ValueError(
                f"A hierarchy named '{hierarchy_data.name}' already exists under this parent"
            )

        hierarchy = RoleHierarchy(
            name=hierarchy_data.name,
            level=hierarchy_data.level,
            tenant_id=tenant_id,
            created_by=user_id,
        )

        if parent:
            hierarchy.parent_id = parent.id

        await hierarchy.insert()
        return hierarchy

    async def get_hierarchy(self, hierarchy_id: str, tenant_id: ObjectId) -> Optional[RoleHierarchy]:
        try:
            oid = ObjectId(hierarchy_id)
        except Exception:
            return None
        return await RoleHierarchy.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )

    async def update_hierarchy(
        self,
        hierarchy_id: str,
        hierarchy_data: HierarchyUpdate,
        tenant_id: ObjectId,
    ) -> Optional[RoleHierarchy]:
        hierarchy = await self.get_hierarchy(hierarchy_id, tenant_id)
        if not hierarchy:
            return None

        if hierarchy_data.name and hierarchy_data.name != hierarchy.name:
            existing = await RoleHierarchy.find_one(
                {"name": hierarchy_data.name, "tenant_id": tenant_id, "deleted_at": None, "parent_id": hierarchy.parent_id}
            )
            if existing and existing.id != hierarchy.id:
                raise ValueError(
                    f"A hierarchy named '{hierarchy_data.name}' already exists under this parent"
                )

        if hierarchy_data.name is not None:
            hierarchy.name = hierarchy_data.name
        if hierarchy_data.level is not None:
            hierarchy.level = hierarchy_data.level
        if hierarchy_data.parent_id is not None:
            new_parent_id = (
                ObjectId(hierarchy_data.parent_id)
                if hierarchy_data.parent_id
                else None
            )
            if new_parent_id is not None:
                parent = await self._get_parent_if_valid(
                    hierarchy_data.parent_id, tenant_id
                )
                if parent is None:
                    raise ValueError("Parent hierarchy not found")
                if await self._would_create_cycle(hierarchy.id, new_parent_id, tenant_id):
                    raise ValueError("Cannot move a hierarchy under itself or its descendant")
                hierarchy.parent_id = parent.id
            else:
                hierarchy.parent_id = None

        await hierarchy.save()
        return hierarchy

    async def delete_hierarchy(self, hierarchy_id: str, tenant_id: ObjectId) -> bool:
        hierarchy = await self.get_hierarchy(hierarchy_id, tenant_id)
        if not hierarchy:
            return False

        # Prevent delete if users are assigned to this hierarchy.
        user_count = await User.find(
            {"role_hierarchy_id": ObjectId(hierarchy_id), "tenant_id": tenant_id, "deleted_at": None}
        ).count()
        if user_count > 0:
            raise ValueError(f"Cannot delete hierarchy: {user_count} users are assigned to it")

        await hierarchy.soft_delete()
        return True

    async def get_hierarchies_by_tenant(
        self, tenant_id: ObjectId, skip: int = 0, limit: int = 200
    ) -> List[RoleHierarchy]:
        return await RoleHierarchy.find(
            {"tenant_id": tenant_id, "deleted_at": None}
        ).skip(skip).limit(limit).sort("+name").to_list()
