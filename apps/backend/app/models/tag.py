"""
Tag model for categorizing CRM entities
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Tag(BaseDocument):
    """Tag for categorizing entities"""
    
    name: Indexed(str)
    color: str = "#1976d2"  # Hex color
    description: Optional[str] = None
    
    # Entity types this tag applies to
    entity_types: List[str] = Field(default_factory=lambda: [
        "account", "contact", "lead", "opportunity", "task", "event"
    ])
    
    # Usage count (for sorting by popularity)
    usage_count: int = 0
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    
    class Settings:
        name = "tags"
        # indexes = [
        # "tenant_id", "name",
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("usage_count", -1)],
        # ]


class EntityTag(BaseDocument):
    """Association between tag and entity"""
    
    tag_id: Indexed(PydanticObjectId)
    entity_type: Indexed(str)  # account, contact, lead, etc.
    entity_id: Indexed(PydanticObjectId)
    
    tenant_id: Indexed(PydanticObjectId)
    tagged_by: PydanticObjectId
    
    class Settings:
        name = "entity_tags"
        # indexes = [
        # "tag_id", "entity_type", "entity_id", "tenant_id",
        # [("entity_type", 1), ("entity_id", 1)],
            # [("tag_id", 1), ("entity_type", 1)],
        # ]
