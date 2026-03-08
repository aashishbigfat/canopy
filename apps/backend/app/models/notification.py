"""
Notification model for system alerts
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, Dict, Any
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument


class Notification(BaseDocument):
    """User notification"""
    
    user_id: Indexed(PydanticObjectId)
    
    # Content
    title: str
    message: str
    type: str = "info"  # info, success, warning, error, task, event, lead, opportunity
    
    # Related entity
    entity_type: Optional[str] = None
    entity_id: Optional[PydanticObjectId] = None
    
    # Status
    is_read: bool = False
    read_at: Optional[datetime] = None
    
    # Action
    action_url: Optional[str] = None
    
    # Metadata
    data: Optional[Dict[str, Any]] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "notifications"
        # indexes = [
        # "user_id", "tenant_id", "is_read",
        # [("user_id", 1), ("is_read", 1), ("created_at", -1)],
            # [("user_id", 1), ("created_at", -1)],
        # ]
