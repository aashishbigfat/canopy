"""
Region and Territory models for geographic management and sales territories.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class Region(Document):
    """Region model for high-level geographic areas (e.g., North America, EMEA)."""
    
    # Basic Info
    name: Indexed(str)
    code: Optional[str] = None
    description: Optional[str] = None
    
    # Configuration
    currency: Optional[str] = None  # Default currency for the region
    timezone: Optional[str] = None
    
    # Hierarchy
    parent_id: Optional[PydanticObjectId] = None  # For nested regions
    
    # Assignment
    manager_id: Optional[PydanticObjectId] = None  # Regional manager
    
    # Status
    is_active: bool = Field(default=True)
    
    # Ownership
    created_by: Optional[PydanticObjectId] = None
    owner_id: Optional[PydanticObjectId] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "regions"
        # indexes = [
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("is_active", 1)],
        # ]


class Territory(Document):
    """Territory model for specific sales territories (e.g., California, UK)."""
    
    # Basic Info
    name: Indexed(str)
    code: Optional[str] = None
    description: Optional[str] = None
    
    # Hierarchy
    region_id: Indexed(PydanticObjectId)  # Parent region
    parent_territory_id: Optional[PydanticObjectId] = None  # For nested territories
    
    # Assignment rule type
    assignment_type: str = Field(default="manual")  # manual, geographic, rule_based
    
    # Geographic Criteria (if assignment_type is geographic)
    countries: List[str] = Field(default_factory=list)  # Country codes
    states: List[str] = Field(default_factory=list)  # State codes/names
    postal_codes: List[str] = Field(default_factory=list)  # Zip/Postal codes (supports wildcards)
    
    # Users
    users: List[PydanticObjectId] = Field(default_factory=list)  # Sales rep IDs assigned to this territory
    manager_id: Optional[PydanticObjectId] = None  # Territory manager
    
    # Status
    is_active: bool = Field(default=True)
    
    # Ownership
    created_by: Optional[PydanticObjectId] = None
    owner_id: Optional[PydanticObjectId] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "territories"
        # indexes = [
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("region_id", 1)],
            # [("tenant_id", 1), ("users", 1)],
        # ]
