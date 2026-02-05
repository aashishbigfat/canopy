"""
Pydantic schemas for Reminder API
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    remind_at: datetime
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    remind_at: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None


class ReminderResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    remind_at: datetime
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
    is_recurring: bool
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


class ReminderListResponse(BaseModel):
    reminders: List[ReminderResponse]
    total: int
