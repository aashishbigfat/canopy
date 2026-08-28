"""
Package models for travel CRM - Travel packages with pricing
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument

class Package(BaseDocument):
    """Package model for travel packages"""
    
    # Basic Information
    name: Indexed(str)
    description: Optional[str] = None
    package_code: Optional[str] = None
    
    # Duration
    days: int
    nights: int
    
    # Destinations
    destination_ids: List[PydanticObjectId] = Field(default_factory=list)
    
    # Pricing
    base_price: float
    currency: str = "USD"
    
    # Validity
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    
    # Inclusions & Exclusions
    inclusions: List[str] = Field(default_factory=list)
    exclusions: List[str] = Field(default_factory=list)
    
    # Linked Itinerary
    itinerary_id: Optional[PydanticObjectId] = None
    
    # Category
    category: Optional[str] = None  # Honeymoon, Family, Adventure, etc.
    
    # Status
    is_active: bool = True
    is_featured: bool = False
    
    # Capacity
    min_pax: Optional[int] = None
    max_pax: Optional[int] = None
    
    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Metadata
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    class Settings:
        name = "packages"
        # indexes = [
        # "tenant_id",
        # "owner_id",
        # "category",
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("is_active", 1)],
        # ]


class PackagePricing(BaseDocument):
    """Package pricing tiers (seasonal, group size, etc.)"""
    
    package_id: Indexed(PydanticObjectId)
    
    # Pricing Details
    name: str  # e.g., "Peak Season", "Group of 4-6"
    price: float
    
    # Conditions
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    min_pax: Optional[int] = None
    max_pax: Optional[int] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "package_pricing"
        # indexes = [
        # "package_id",
        # "tenant_id"
        # ]


class PackageOpportunity(BaseDocument):
    """Pivot table for Package-Opportunity relationship"""
    
    package_id: Indexed(PydanticObjectId)
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    # Customization
    custom_price: Optional[float] = None
    notes: Optional[str] = None
    
    class Settings:
        name = "package_opportunities"
        # indexes = [
        # [("package_id", 1), ("opportunity_id", 1)],
            # "tenant_id"
        # ]
