"""
Login log model for tracking user login activity
"""
from beanie import Document, Indexed
from beanie import PydanticObjectId
from datetime import datetime
from pydantic import Field
from typing import Optional

class LoginLog(Document):
    """Track user login activity"""
    
    user_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    login_time: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    class Settings:
        name = "login_logs"
        # indexes = [
        # "user_id",
        # "tenant_id",
        # [("user_id", 1), ("login_time", -1)]
        # ]
