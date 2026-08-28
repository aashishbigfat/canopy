"""
Pydantic schemas for Note API
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NoteBase(BaseModel):
    """Base schema for Note"""
    title: Optional[str] = None
    content: str
    
    noteable_type: Optional[str] = None
    noteable_id: Optional[str] = None
    
    is_private: bool = False
    is_pinned: bool = False


class NoteCreate(NoteBase):
    """Schema for creating a note"""
    pass


class NoteUpdate(BaseModel):
    """Schema for updating a note"""
    title: Optional[str] = None
    content: Optional[str] = None
    is_private: Optional[bool] = None
    is_pinned: Optional[bool] = None


class NoteResponse(NoteBase):
    """Schema for note response"""
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    
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
            if hasattr(obj, 'owner_id') and obj.owner_id:
                data['owner_id'] = str(obj.owner_id)
            if hasattr(obj, 'created_by') and obj.created_by:
                data['created_by'] = str(obj.created_by)
            if hasattr(obj, 'noteable_id') and obj.noteable_id:
                data['noteable_id'] = str(obj.noteable_id)
            
            return cls(**data)
        return cls()


class NoteListResponse(BaseModel):
    """Schema for list of notes"""
    notes: list[NoteResponse]
    total: int
