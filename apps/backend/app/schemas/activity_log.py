"""
Pydantic schemas for Activity Log API
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ActivityLogResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    description: str
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
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
            if hasattr(obj, 'user_id') and obj.user_id:
                data['user_id'] = str(obj.user_id)
            if hasattr(obj, 'entity_id') and obj.entity_id:
                data['entity_id'] = str(obj.entity_id)
            
            return cls(**data)
        return cls()


class ActivityLogListResponse(BaseModel):
    logs: List[ActivityLogResponse]
    total: int


class LoginLogResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    success: bool
    failure_reason: Optional[str] = None
    ip_address: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime
    logout_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'user_id') and obj.user_id:
                data['user_id'] = str(obj.user_id)
            
            return cls(**data)
        return cls()


class LoginLogListResponse(BaseModel):
    logs: List[LoginLogResponse]
    total: int
