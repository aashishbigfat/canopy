"""
Pydantic schemas for Role API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class RoleBase(BaseModel):
    """Base schema for Role"""
    name: str
    display_name: str
    description: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    is_admin: bool = False


class RoleCreate(RoleBase):
    """Schema for creating role"""
    pass


class RoleUpdate(BaseModel):
    """Schema for updating role"""
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_admin: Optional[bool] = None


class RoleResponse(RoleBase):
    """Schema for role response"""
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            # Convert audit fields to strings
            if hasattr(obj, 'created_by') and obj.created_by:
                data['created_by'] = str(obj.created_by)
            if hasattr(obj, 'last_modified_by_id') and obj.last_modified_by_id:
                data['last_modified_by_id'] = str(obj.last_modified_by_id)
            
            return cls(**data)
        return cls()


class RoleListResponse(BaseModel):
    """Schema for list of roles"""
    roles: List[RoleResponse]
    total: int


class PermissionAdd(BaseModel):
    """Schema for adding permissions to role"""
    permissions: List[str]


class PermissionRemove(BaseModel):
    """Schema for removing permissions from role"""
    permissions: List[str]


class PermissionListResponse(BaseModel):
    """Schema for list of all available permissions"""
    permissions: List[str]
    total: int
