"""
User Account View tracking - for recently viewed accounts
"""
from beanie import Document, Indexed
from beanie import PydanticObjectId
from datetime import datetime
from pydantic import Field

class UserAccountView(Document):
    """Track user views of accounts"""
    
    user_id: Indexed(PydanticObjectId)
    account_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    view_count: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "user_account_views"
        # indexes = [
        # [("user_id", 1), ("account_id", 1)],
            # [("user_id", 1), ("updated_at", -1)],
            # "tenant_id"
        # ]
