"""
Destination models for travel CRM
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Destination(BaseDocument):
    """Destination model for travel destinations"""
    
    # Basic Information
    name: Indexed(str)
    description: Optional[str] = None
    
    # Geographic Information
    country_id: str  # ISO-3 country code (e.g., "USA", "FRA", "IND")
    state_id: Optional[PydanticObjectId] = None
    city_id: Optional[PydanticObjectId] = None
    
    # Additional Info
    destination_type: Optional[str] = None  # Beach, Mountain, City, Historical, etc.
    best_time_to_visit: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_popular: bool = False
    
    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Metadata
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    class Settings:
        name = "destinations"
        # indexes = [
        # "tenant_id",
        # "country_id",
        # "is_popular",
        # [("tenant_id", 1), ("name", 1)],
            # [(("tenant_id", 1), ("country_id", 1))],
            # [(("tenant_id", 1), ("is_popular", 1))],
        # ]


class DestinationOpportunity(BaseDocument):
    """Pivot table for Destination-Opportunity many-to-many relationship"""
    
    destination_id: Indexed(PydanticObjectId)
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    # Additional metadata
    is_primary: bool = False  # Primary destination for this opportunity
    notes: Optional[str] = None
    
    class Settings:
        name = "destination_opportunities"
        # indexes = [
        # [(("destination_id", 1), ("opportunity_id", 1))],
            # "tenant_id",
            # "opportunity_id"
        # ]


class DestinationLead(BaseDocument):
    """Pivot table for Destination-Lead many-to-many relationship"""
    
    destination_id: Indexed(PydanticObjectId)
    lead_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    # Additional metadata
    is_primary: bool = False  # Primary destination for this lead
    notes: Optional[str] = None
    
    class Settings:
        name = "destination_leads"
        # indexes = [
        # [(("destination_id", 1), ("lead_id", 1))],
            # "tenant_id",
            # "lead_id"
        # ]
