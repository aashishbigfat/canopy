"""
Department model for organizational structure
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Department(BaseDocument):
    """Department model for organizational structure"""
    
    # Basic Information
    name: Indexed(str)
    description: Optional[str] = None
    
    # Hierarchy
    parent_id: Optional[PydanticObjectId] = None  # For department hierarchy
    level: int = 0  # Hierarchy level (0 = top level)
    
    # Manager
    manager_id: Optional[PydanticObjectId] = None  # Department head/manager
    
    # Status
    is_active: bool = True
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Metadata
    notes: Optional[str] = None
    
    class Settings:
        name = "departments"
        # indexes = [
        # "tenant_id",
        # "parent_id",
        # "manager_id",
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("parent_id", 1)],
        # ]
    
    async def get_children(self) -> List["Department"]:
        # """Get child departments"""
        return await Department.find(
            {"parent_id": self.id, "deleted_at": None}
        ).to_list()
    
    async def get_all_users(self):
        # """Get all users in this department"""
        from app.models.user import User
        return await User.find(
            {"department_id": self.id, "deleted_at": None}
        ).to_list()
