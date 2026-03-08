"""
Pydantic schemas for Template API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "email"
    category: Optional[str] = None
    subject: Optional[str] = None
    body: str
    variables: List[str] = Field(default_factory=list)
    is_default: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str
    category: Optional[str] = None
    subject: Optional[str] = None
    body: str
    variables: List[str]
    is_active: bool
    is_default: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            
            return cls(**data)
        return cls()


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int


class TemplateRenderRequest(BaseModel):
    data: Dict[str, Any]  # Variable values


class TemplateRenderResponse(BaseModel):
    subject: Optional[str] = None
    body: str
