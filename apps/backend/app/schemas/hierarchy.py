"""
Pydantic schemas for Role Hierarchy API
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class HierarchyBase(BaseModel):
    name: str
    parent_id: Optional[str] = None
    level: int = 0


class HierarchyCreate(HierarchyBase):
    pass


class HierarchyUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None
    level: Optional[int] = None


class HierarchyResponse(HierarchyBase):
    id: str
    tenant_id: str
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Enriched fields matching the reference Roles UI
    user_count: int = 0
    related_roles_count: int = 0
    parent_name: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(
        cls,
        obj,
        created_by_name: Optional[str] = None,
        user_count: int = 0,
        related_roles_count: int = 0,
        parent_name: Optional[str] = None,
    ):
        data = obj.model_dump()
        data["id"] = str(obj.id)
        data["tenant_id"] = str(obj.tenant_id)
        data["created_by"] = str(obj.created_by) if getattr(obj, "created_by", None) else None
        data["parent_id"] = str(obj.parent_id) if getattr(obj, "parent_id", None) else None
        data["created_by_name"] = created_by_name
        data["user_count"] = user_count
        data["related_roles_count"] = related_roles_count
        data["parent_name"] = parent_name
        return cls(**data)


class HierarchyListResponse(BaseModel):
    hierarchies: List[HierarchyResponse]
    total: int
