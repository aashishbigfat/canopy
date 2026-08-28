"""
Lead-related picklist models — re-export shim.

The canonical Document classes live in `consolidated_picklists` (single
'picklists' Mongo collection w/ discriminator). Older code imports from
`lead_picklists`; this shim keeps backward compat without registering
duplicate collections.

Destination + DestinationLead are non-picklist Documents kept here.
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime

# Re-export consolidated picklist classes
from app.models.consolidated_picklists import (
    LeadStatus,
    Source,
    SourceMedium,
)


class Destination(Document):
    """Travel destination (for travel CRM)"""
    name: Indexed(str)
    country: str
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    is_active: bool = True

    class Settings:
        name = "destinations"
        indexes = ["tenant_id", "country"]


class DestinationLead(Document):
    """Pivot table for Lead-Destination many-to-many"""
    lead_id: Indexed(PydanticObjectId)
    destination_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "destination_leads"


__all__ = ["LeadStatus", "Source", "SourceMedium", "Destination", "DestinationLead"]
