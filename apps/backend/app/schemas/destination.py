"""
Pydantic schemas for Destination API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DestinationBase(BaseModel):
    """Base schema for Destination"""
    name: str
    description: Optional[str] = None
    country_id: str  # ISO-3 code
    state_id: Optional[str] = None
    city_id: Optional[str] = None
    destination_type: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    is_popular: bool = False
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class DestinationCreate(DestinationBase):
    """Schema for creating destination"""
    pass


class DestinationUpdate(BaseModel):
    """Schema for updating destination"""
    name: Optional[str] = None
    description: Optional[str] = None
    country_id: Optional[str] = None
    state_id: Optional[str] = None
    city_id: Optional[str] = None
    destination_type: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    is_active: Optional[bool] = None
    is_popular: Optional[bool] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class DestinationResponse(DestinationBase):
    """Schema for destination response"""
    id: str
    tenant_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            if hasattr(obj, 'state_id') and obj.state_id:
                data['state_id'] = str(obj.state_id)
            if hasattr(obj, 'city_id') and obj.city_id:
                data['city_id'] = str(obj.city_id)
            
            return cls(**data)
        return cls()


class DestinationDetailResponse(DestinationResponse):
    """Schema for destination with relationships"""
    opportunity_count: int = 0
    lead_count: int = 0
    itinerary_count: int = 0


class DestinationListResponse(BaseModel):
    """Schema for list of destinations"""
    destinations: List[DestinationResponse]
    total: int


class DestinationLinkRequest(BaseModel):
    """Schema for linking destination to opportunity/lead"""
    destination_id: str
    is_primary: bool = False
    notes: Optional[str] = None
