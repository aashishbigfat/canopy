"""
Notification model for system alerts
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, Dict, Any
from beanie import PydanticObjectId
from datetime import datetime
from pymongo import IndexModel
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
        indexes = [
            # Supports the bell/list query: filter by user + read state, newest first.
            [("user_id", 1), ("is_read", 1), ("created_at", -1)],
            # TTL — auto-delete notifications 7 days after creation. Hard delete,
            # silent and unstoppable; notifications are ephemeral dashboard data
            # (mirrors LocationPing's TTL). Changing the window later requires a
            # collMod/recreate — Mongo won't alter expireAfterSeconds from here.
            IndexModel(
                [("created_at", 1)],
                expireAfterSeconds=7 * 24 * 3600,  # 604800 = 1 week
                name="notifications_ttl",
            ),
        ]
