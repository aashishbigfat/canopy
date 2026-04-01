"""
Opportunity-related picklist and supporting models
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime

class SalesStage(Document):
    """Sales stage/pipeline stage"""
    name: Indexed(str)
    description: Optional[str] = None
    probability: int = 0  # Default probability for this stage
    color: Optional[str] = None
    sorting: int = 0
    is_active: bool = True
    is_default: bool = False  # Mark as default stage
    is_won: bool = False  # Mark as won stage
    is_lost: bool = False  # Mark as lost stage
    
    tenant_id: Optional[Indexed(PydanticObjectId)] = None  # Can be tenant-specific or global
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "sales_stages"
        # indexes = ["sorting", "is_active", "tenant_id"]


class OpportunityType(Document):
    """Opportunity type classification"""
    name: Indexed(str)
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    sorting: int = 0
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "opportunity_types"
        # indexes = ["tenant_id", "sorting"]


class Experience(Document):
    """Travel experience type"""
    name: Indexed(str)
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    sorting: int = 0
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "experiences"
        # indexes = ["tenant_id", "sorting"]


class OpportunityTag(Document):
    """Tags for opportunities"""
    name: Indexed(str)
    color: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "opportunity_tags"
        # indexes = ["tenant_id"]


class OpportunityHistory(Document):
    """Track opportunity stage changes and history"""
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    
    # Snapshot of opportunity financials AT THE TIME of the stage change
    amount_at_change: Optional[float] = None
    probability_at_change: Optional[int] = None
    
    changed_by: PydanticObjectId
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "opportunity_histories"
        # indexes = [
        # "opportunity_id",
        # [("opportunity_id", 1), ("changed_at", -1)]
        # ]


class DestinationOpportunity(Document):
    """Pivot table for Opportunity-Destination many-to-many"""
    opportunity_id: Indexed(PydanticObjectId)
    destination_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "destination_opportunity"
        # indexes = [
        # [("opportunity_id", 1), ("destination_id", 1)],
            # "tenant_id"
        # ]


class OpportunityLock(Document):
    """Track locked opportunities"""
    opportunity_id: Indexed(PydanticObjectId, unique=True)
    locked_by: PydanticObjectId
    locked_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "opportunity_locks"
        # indexes = ["opportunity_id", "locked_by"]
