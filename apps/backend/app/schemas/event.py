"""
Pydantic schemas for Event API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class EventBase(BaseModel):
    """Base schema for Event"""
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    
    start_datetime: datetime
    end_datetime: datetime
    all_day: bool = False
    
    event_type: str = "Meeting"
    
    eventable_type: Optional[str] = None
    eventable_id: Optional[str] = None
    
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    
    assigned_user_ids: List[str] = Field(default_factory=list)
    reminder_minutes: Optional[int] = None


class EventCreate(EventBase):
    """Schema for creating an event"""
    pass


class EventUpdate(BaseModel):
    """Schema for updating an event"""
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    status: Optional[str] = None
    event_type: Optional[str] = None


class EventResponse(EventBase):
    """Schema for event response"""
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    
    status: str = "Planned"
    reminder_sent: bool = False
    view_count: int = 0
    
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
            
            # Convert assigned_user_ids from ObjectId to string
            if hasattr(obj, 'assigned_user_ids') and obj.assigned_user_ids:
                data['assigned_user_ids'] = [str(user_id) for user_id in obj.assigned_user_ids]
            
            # Convert other ObjectId fields
            if hasattr(obj, 'eventable_id') and obj.eventable_id:
                data['eventable_id'] = str(obj.eventable_id)
            if hasattr(obj, 'contact_id') and obj.contact_id:
                data['contact_id'] = str(obj.contact_id)
            if hasattr(obj, 'account_id') and obj.account_id:
                data['account_id'] = str(obj.account_id)
            
            return cls(**data)
        return cls()


class EventListResponse(BaseModel):
    """Schema for list of events"""
    events: List[EventResponse]
    total: int
    page: int = 1
    per_page: int = 10
    pages: int
