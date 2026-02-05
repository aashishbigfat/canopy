from beanie import Indexed
from pydantic import Field
from typing import List, Optional
from beanie import PydanticObjectId
from app.models.base import BaseDocument

class Role(BaseDocument):
    """Role model for RBAC"""
    
    name: Indexed(str)
    display_name: str
    description: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Permissions (array of permission strings)
    permissions: List[str] = Field(default_factory=list)
    
    # Hierarchy
    is_admin: bool = False
    
    # Audit fields
    created_by: Optional[PydanticObjectId] = None
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    class Settings:
        name = "roles"
        # indexes = [
        # "tenant_id",
        # "name",
        # [("tenant_id", 1), ("name", 1)],
        # ]
    
    def has_permission(self, permission: str) -> bool:
        # """Check if role has a specific permission"""
        return permission in self.permissions
    
    def has_any_permission(self, permissions: List[str]) -> bool:
        # """Check if role has any of the specified permissions"""
        return any(perm in self.permissions for perm in permissions)


class RoleHierarchy(BaseDocument):
    """Role hierarchy for organizational structure"""
    
    name: str
    tenant_id: Indexed(PydanticObjectId)
    
    # Hierarchy
    parent_id: Optional[PydanticObjectId] = None
    level: int = 0
    
    # Users in this hierarchy level
    user_ids: List[PydanticObjectId] = Field(default_factory=list)
    
    class Settings:
        name = "role_hierarchies"
        # indexes = [
        # "tenant_id",
        # "parent_id",
        # [("tenant_id", 1), ("parent_id", 1)],
        # ]
    
    async def get_children(self):
        # """Get child hierarchies"""
        return await RoleHierarchy.find(
            RoleHierarchy.parent_id == self.id
        ).to_list()
    
    async def get_all_descendant_users(self) -> List[PydanticObjectId]:
        # """Get all users in this hierarchy and below"""
        user_ids = list(self.user_ids)
        
        children = await self.get_children()
        for child in children:
            child_users = await child.get_all_descendant_users()
            user_ids.extend(child_users)
        
        return list(set(user_ids))  # Remove duplicates
