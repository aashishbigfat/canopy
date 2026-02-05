"""
Activity Log models for tracking user actions and system events
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, Dict, Any
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument


class ActivityLog(BaseDocument):
    """Activity log for tracking user actions"""
    
    # Who
    user_id: Indexed(PydanticObjectId)
    user_name: str
    
    # What
    action: Indexed(str)  # create, update, delete, view, login, logout, etc.
    entity_type: Indexed(str)  # account, contact, lead, opportunity, etc.
    entity_id: Optional[PydanticObjectId] = None
    entity_name: Optional[str] = None
    
    # Details
    description: str
    changes: Optional[Dict[str, Any]] = None  # For updates: {field: {old: x, new: y}}
    metadata: Optional[Dict[str, Any]] = None
    
    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "activity_logs"
        # indexes = [
        # "user_id", "tenant_id", "action", "entity_type",
        # [("tenant_id", 1), ("created_at", -1)],
            # [("user_id", 1), ("created_at", -1)],
            # [("entity_type", 1), ("entity_id", 1)],
        # ]


class LoginLog(BaseDocument):
    """Login history tracking"""
    
    user_id: Indexed(PydanticObjectId)
    user_name: str
    user_email: str
    
    # Status
    success: bool = True
    failure_reason: Optional[str] = None
    
    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None  # desktop, mobile, tablet
    browser: Optional[str] = None
    os: Optional[str] = None
    location: Optional[str] = None
    
    # Session
    session_id: Optional[str] = None
    logout_at: Optional[datetime] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "login_logs"
        # indexes = [
        # "user_id", "tenant_id", "success",
        # [("tenant_id", 1), ("created_at", -1)],
            # [("user_id", 1), ("created_at", -1)],
        # ]
