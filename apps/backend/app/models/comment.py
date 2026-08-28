"""
Comment model for entity discussions
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument


class Comment(BaseDocument):
    """Comment on an entity"""
    
    # Entity reference
    entity_type: Indexed(str)  # account, contact, lead, opportunity, etc.
    entity_id: Indexed(PydanticObjectId)
    
    # Content
    content: str
    
    # Author
    author_id: Indexed(PydanticObjectId)
    author_name: str
    
    # Parent comment (for replies/threads)
    parent_id: Optional[PydanticObjectId] = None
    
    # Mentions
    mentioned_user_ids: List[PydanticObjectId] = Field(default_factory=list)
    
    # Edit tracking
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "comments"
        # indexes = [
        # "entity_type", "entity_id", "author_id", "parent_id", "tenant_id",
        # [("entity_type", 1), ("entity_id", 1), ("created_at", -1)],
        # ]
