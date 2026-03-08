"""
Opportunity custom fields model
"""
from beanie import Document, Indexed
from beanie import PydanticObjectId
from datetime import datetime
from pydantic import Field

class OpportunityCustomField(Document):
    """Custom field values for opportunities"""
    opportunity_id: Indexed(PydanticObjectId)
    opp_additional_field_id: Indexed(PydanticObjectId)
    field_value: str
    type: str
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "opportunity_custom_fields"
        # indexes = [
        # "opportunity_id",
        # "tenant_id"
        # ]


class UserOpportunityView(Document):
    """Track user views of opportunities"""
    user_id: Indexed(PydanticObjectId)
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    view_count: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "user_opportunity_views"
        # indexes = [
        # [("user_id", 1), ("opportunity_id", 1)],
            # [("user_id", 1), ("updated_at", -1)],
            # "tenant_id"
        # ]
