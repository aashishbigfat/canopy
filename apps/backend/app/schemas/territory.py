"""
Pydantic schemas for Regions and Territories API.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ==================== Region Schemas ====================

class RegionBase(BaseModel):
    """Base schema for Region."""
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    is_active: bool = True


class RegionCreate(RegionBase):
    """Schema for creating a region."""
    pass


class RegionUpdate(BaseModel):
    """Schema for updating a region."""
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    is_active: Optional[bool] = None


class RegionResponse(RegionBase):
    """Schema for region response."""
    id: str
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RegionListResponse(BaseModel):
    """Schema for paginated region list."""
    regions: List[RegionResponse]
    total: int
    page: int
    per_page: int


# ==================== Territory Schemas ====================

class TerritoryBase(BaseModel):
    """Base schema for Territory."""
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    region_id: str
    parent_territory_id: Optional[str] = None
    assignment_type: str = "manual"
    countries: List[str] = Field(default_factory=list)
    states: List[str] = Field(default_factory=list)
    postal_codes: List[str] = Field(default_factory=list)
    users: List[str] = Field(default_factory=list)
    manager_id: Optional[str] = None
    is_active: bool = True


class TerritoryCreate(TerritoryBase):
    """Schema for creating a territory."""
    pass


class TerritoryUpdate(BaseModel):
    """Schema for updating a territory."""
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    region_id: Optional[str] = None
    parent_territory_id: Optional[str] = None
    assignment_type: Optional[str] = None
    countries: Optional[List[str]] = None
    states: Optional[List[str]] = None
    postal_codes: Optional[List[str]] = None
    users: Optional[List[str]] = None
    manager_id: Optional[str] = None
    is_active: Optional[bool] = None


class TerritoryResponse(TerritoryBase):
    """Schema for territory response."""
    id: str
    region_name: Optional[str] = None
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TerritoryListResponse(BaseModel):
    """Schema for paginated territory list."""
    territories: List[TerritoryResponse]
    total: int
    page: int
    per_page: int


# ==================== Assignment Schemas ====================

class TerritoryAssignmentRequest(BaseModel):
    """Schema for requesting territory assignment validation."""
    country: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None


class TerritoryAssignmentResponse(BaseModel):
    """Schema for territory assignment result."""
    territory_id: Optional[str] = None
    territory_name: Optional[str] = None
    region_id: Optional[str] = None
    region_name: Optional[str] = None
    matched_by: Optional[str] = None  # postal_code, state, country
