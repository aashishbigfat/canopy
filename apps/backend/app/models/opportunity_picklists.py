"""
Opportunity-related picklist and supporting models — re-export shim.

SalesStage / OpportunityType / Experience / OpportunityTag canonical
defs live in `consolidated_picklists` (single 'picklists' collection w/
discriminator). This module re-exports them for backward-compat callers.

OpportunityHistory + OpportunityLock are kept here as their own
collections (non-picklist domain objects).
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime

# Re-export consolidated picklist classes
from app.models.consolidated_picklists import (
    SalesStage,
    OpportunityType,
    Experience,
    OpportunityTag,
)
# Re-export DestinationOpportunity from consolidated_pivots for back-compat
from app.models.consolidated_pivots import DestinationOpportunity


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


class OpportunityLock(Document):
    """Track locked opportunities"""
    opportunity_id: Indexed(PydanticObjectId, unique=True)
    locked_by: PydanticObjectId
    locked_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: Indexed(PydanticObjectId)

    class Settings:
        name = "opportunity_locks"


__all__ = [
    "SalesStage",
    "OpportunityType",
    "Experience",
    "OpportunityTag",
    "DestinationOpportunity",
    "OpportunityHistory",
    "OpportunityLock",
]
