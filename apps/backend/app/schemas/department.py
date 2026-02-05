"""
Pydantic schemas for Department API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DepartmentBase(BaseModel):
    """Base schema for Department"""
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    level: int = 0
    notes: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    """Schema for creating department"""
    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating department"""
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    level: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class DepartmentResponse(DepartmentBase):
    """Schema for department response"""
    id: str
    tenant_id: str
    is_active: bool
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
            if hasattr(obj, 'parent_id') and obj.parent_id:
                data['parent_id'] = str(obj.parent_id)
            if hasattr(obj, 'manager_id') and obj.manager_id:
                data['manager_id'] = str(obj.manager_id)
            
            return cls(**data)
        return cls()


class DepartmentDetailResponse(DepartmentResponse):
    """Schema for department with additional details"""
    user_count: int = 0
    child_count: int = 0
    manager_name: Optional[str] = None


class DepartmentListResponse(BaseModel):
    """Schema for list of departments"""
    departments: List[DepartmentResponse]
    total: int
