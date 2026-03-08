"""
Pydantic schemas for Activity Log API
"""
from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId


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
    
    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "extra": "ignore"
    }

    @field_validator("created_at", mode="after")
    @classmethod
    def ensure_utc(cls, v):
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if obj is None:
            return None
            
        data = obj.model_dump() if hasattr(obj, 'model_dump') else {}
        
        # Recursive conversion of ObjectId to str
        def stringify_ids(d):
            if isinstance(d, dict):
                return {k: stringify_ids(v) for k, v in d.items()}
            elif isinstance(d, list):
                return [stringify_ids(v) for v in d]
            elif isinstance(d, ObjectId):
                return str(d)
            return d
            
        data = stringify_ids(data)
        
        # Ensure standard fields are handled if stringify_ids missed something
        if hasattr(obj, 'id'):
            data['id'] = str(obj.id)
        
        # Filter only fields defined in the schema
        field_names = cls.model_fields.keys()
        filtered_data = {k: v for k, v in data.items() if k in field_names}
        
        return cls(**filtered_data)


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
    
    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "extra": "ignore"
    }

    @field_validator("created_at", "logout_at", mode="after")
    @classmethod
    def ensure_utc(cls, v):
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if obj is None:
            return None
            
        data = obj.model_dump() if hasattr(obj, 'model_dump') else {}
        
        # Recursive conversion of ObjectId to str
        def stringify_ids(d):
            if isinstance(d, dict):
                return {k: stringify_ids(v) for k, v in d.items()}
            elif isinstance(d, list):
                return [stringify_ids(v) for v in d]
            elif isinstance(d, ObjectId):
                return str(d)
            return d
            
        data = stringify_ids(data)
        
        # Ensure standard fields are handled
        if hasattr(obj, 'id'):
            data['id'] = str(obj.id)
            
        # Filter only fields defined in the schema
        field_names = cls.model_fields.keys()
        filtered_data = {k: v for k, v in data.items() if k in field_names}
        
        return cls(**filtered_data)


class LoginLogListResponse(BaseModel):
    logs: List[LoginLogResponse]
    total: int
