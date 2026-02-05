"""
Lead custom fields models
"""
from beanie import Document, Indexed
from beanie import PydanticObjectId
from datetime import datetime
from pydantic import Field

class LeadCustomField(Document):
    """Custom field values for leads"""
    lead_id: Indexed(PydanticObjectId)
    lead_additional_field_id: Indexed(PydanticObjectId)
    field_value: str
    type: str
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "lead_custom_fields"
        # indexes = [
        # "lead_id",
        # "tenant_id"
        # ]


class UserLeadView(Document):
    """Track user views of leads"""
    user_id: Indexed(PydanticObjectId)
    lead_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    view_count: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "user_lead_views"
        # indexes = [
        # [("user_id", 1), ("lead_id", 1)],
            # [("user_id", 1), ("updated_at", -1)],
            # "tenant_id"
        # ]
