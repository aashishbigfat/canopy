"""
Pydantic schemas for Notification API
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str = "info"
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    action_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    action_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class NotificationCountResponse(BaseModel):
    total: int
    unread: int
