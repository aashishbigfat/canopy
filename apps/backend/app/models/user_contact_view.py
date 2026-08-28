"""
User Contact View tracking
"""
from beanie import Document, Indexed
from beanie import PydanticObjectId
from datetime import datetime
from pydantic import Field

class UserContactView(Document):
    """Track user views of contacts"""
    
    user_id: Indexed(PydanticObjectId)
    contact_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    view_count: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "user_contact_views"
        # indexes = [
        # [("user_id", 1), ("contact_id", 1)],
            # [("user_id", 1), ("updated_at", -1)],
            # "tenant_id"
        # ]


class ContactCustomField(Document):
    """Custom field values for contacts"""
    contact_id: Indexed(PydanticObjectId)
    contact_additional_field_id: Indexed(PydanticObjectId)
    field_value: str
    type: str
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "contact_custom_fields"
        # indexes = [
        # "contact_id",
        # "tenant_id"
        # ]
