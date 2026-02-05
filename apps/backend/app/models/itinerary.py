"""
Itinerary models for travel CRM - Day-wise travel planning
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List, Dict
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument

class Itinerary(BaseDocument):
    """Itinerary model for travel planning"""
    
    # Basic Information
    name: Indexed(str)
    description: Optional[str] = None
    
    # Duration
    total_days: int
    total_nights: int
    
    # Dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Destinations
    destination_ids: List[PydanticObjectId] = Field(default_factory=list)
    
    # Status
    is_active: bool = True
    is_template: bool = False  # Template itineraries can be reused
    
    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Metadata
    notes: Optional[str] = None
    
    class Settings:
        name = "itineraries"
        # indexes = [
        # "tenant_id",
        # "owner_id",
        # [("tenant_id", 1), ("name", 1)],
        # ]


class ItineraryDay(BaseDocument):
    """Day-wise itinerary details"""
    
    itinerary_id: Indexed(PydanticObjectId)
    day_number: int  # Day 1, Day 2, etc.
    
    # Day Information
    title: str
    description: Optional[str] = None
    
    # Location
    city: Optional[str] = None
    destination_id: Optional[PydanticObjectId] = None
    
    # Activities
    activities: List[Dict] = Field(default_factory=list)  # [{time, activity, description}]
    
    # Accommodation
    hotel_name: Optional[str] = None
    hotel_type: Optional[str] = None
    
    # Meals
    breakfast: bool = False
    lunch: bool = False
    dinner: bool = False
    
    # Transport
    transport_mode: Optional[str] = None
    transport_details: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "itinerary_days"
        # indexes = [
        # "itinerary_id",
        # [("itinerary_id", 1), ("day_number", 1)],
        # ]


class ItineraryOpportunity(BaseDocument):
    """Pivot table for Itinerary-Opportunity many-to-many relationship"""
    
    itinerary_id: Indexed(PydanticObjectId)
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    # Customization notes for this specific opportunity
    notes: Optional[str] = None
    
    class Settings:
        name = "itinerary_opportunities"
        # indexes = [
        # [("itinerary_id", 1), ("opportunity_id", 1)],
            # "tenant_id"
        # ]
