"""
Pydantic schemas for Comment API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[str] = None
    mentioned_user_ids: List[str] = Field(default_factory=list)


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    content: str
    author_id: str
    author_name: str
    parent_id: Optional[str] = None
    is_edited: bool
    edited_at: Optional[datetime] = None
    created_at: datetime
    replies: List["CommentResponse"] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    comments: List[CommentResponse]
    total: int
