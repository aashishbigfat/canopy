"""
Travel industry_data validation schemas for Lead and Opportunity.

These Pydantic models validate the `industry_data` JSON block when the
tenant's industry is "travel".  They mirror the fields that were previously
hardcoded directly onto the Lead / Opportunity core models.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TravelLeadData(BaseModel):
    """Validates industry_data for a Lead owned by a travel tenant."""

    travel_date: str = Field(..., description="Travel date is required")
    no_of_nights: Optional[int] = Field(None, ge=1, description="Number of nights (≥ 1)")
    no_of_adults: Optional[int] = Field(None, ge=1, description="Number of adults (≥ 1)")
    no_of_pax: Optional[int] = Field(None, ge=1, description="Total passengers (≥ 1)")
    no_of_childs: Optional[int] = Field(None, ge=0, description="Number of children (≥ 0)")
    no_of_infants: Optional[int] = Field(None, ge=0, description="Number of infants (≥ 0)")
    destinations: List[str] = Field(default_factory=list, description="Destination names")
    destination_ids: List[str] = Field(default_factory=list, description="Destination ObjectId refs")
    experience_id: Optional[str] = Field(None, description="Experience type ObjectId")
    is_fixed: bool = Field(False, description="Whether the itinerary is fixed")


class TravelOpportunityData(BaseModel):
    """Validates industry_data for an Opportunity owned by a travel tenant."""

    travel_date: datetime = Field(..., description="Travel date is required")
    no_of_pax: Optional[int] = Field(None, ge=1, description="Total passengers (≥ 1)")
    no_of_nights: Optional[int] = Field(None, ge=0, description="Number of nights (≥ 0)")
    no_of_adults: Optional[int] = Field(None, ge=1, description="Number of adults (≥ 1)")
    no_of_childs: Optional[int] = Field(None, ge=0, description="Number of children (≥ 0)")
    no_of_infants: Optional[int] = Field(None, ge=0, description="Number of infants (≥ 0)")
    destination_ids: List[str] = Field(default_factory=list, description="Destination ObjectId refs")
    origin_ids: List[str] = Field(default_factory=list, description="Origin ObjectId refs")
    inclusions: List[str] = Field(default_factory=list, description='e.g. ["Air Ticket", "Visa"]')
    country_of_origin: Optional[str] = Field(None, max_length=100)
    experience_id: Optional[str] = Field(None, description="Experience type ObjectId")
    departure_id: Optional[str] = Field(None, description="Departure ObjectId")
    custom_departure: Optional[str] = Field(None, max_length=200)


class TravelQuoteData(BaseModel):
    """Validates industry_data for a Quote owned by a travel tenant."""

    travel_date: Optional[datetime] = Field(None, description="Travel departure date")
    return_date: Optional[datetime] = Field(None, description="Return date")
    num_adults: Optional[int] = Field(None, ge=0, description="Number of adults (≥ 0)")
    num_children: Optional[int] = Field(None, ge=0, description="Number of children (≥ 0)")
    num_infants: Optional[int] = Field(None, ge=0, description="Number of infants (≥ 0)")
    destinations: List[str] = Field(default_factory=list, description="Destination names")
    destination_ids: List[str] = Field(default_factory=list, description="Destination ObjectId refs")
    no_of_nights: Optional[int] = Field(None, ge=0, description="Number of nights (≥ 0)")
    inclusions: List[str] = Field(default_factory=list, description='e.g. ["Air Ticket", "Visa"]')
