"""
Pydantic schemas for Tag API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TagBase(BaseModel):
    name: str
    color: str = "#1976d2"
    description: Optional[str] = None
    entity_types: List[str] = Field(default_factory=lambda: [
        "account", "contact", "lead", "opportunity", "task", "event"
    ])


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    entity_types: Optional[List[str]] = None


class TagResponse(TagBase):
    id: str
    tenant_id: str
    usage_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class TagListResponse(BaseModel):
    tags: List[TagResponse]
    total: int


class TagEntityRequest(BaseModel):
    tag_id: str


class EntityTagsResponse(BaseModel):
    entity_type: str
    entity_id: str
    tags: List[TagResponse]
