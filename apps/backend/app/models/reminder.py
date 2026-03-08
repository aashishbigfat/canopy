"""
Reminder model for scheduled follow-ups
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument


class Reminder(BaseDocument):
    """Reminder for follow-ups"""
    
    # Target user
    user_id: Indexed(PydanticObjectId)
    
    # Related entity
    entity_type: Optional[str] = None
    entity_id: Optional[PydanticObjectId] = None
    entity_name: Optional[str] = None
    
    # Content
    title: str
    description: Optional[str] = None
    
    # Schedule
    remind_at: Indexed(datetime)
    
    # Status
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    is_sent: bool = False
    sent_at: Optional[datetime] = None
    
    # Recurrence (optional)
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    
    class Settings:
        name = "reminders"
        # indexes = [
        # "user_id", "tenant_id", "remind_at", "is_completed",
        # [("user_id", 1), ("remind_at", 1), ("is_completed", 1)],
        # ]
