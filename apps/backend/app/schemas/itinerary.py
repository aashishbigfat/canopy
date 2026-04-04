"""
Pydantic schemas for Itinerary API
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Union
from datetime import datetime, date

class ItineraryDayBase(BaseModel):
    """Base schema for ItineraryDay"""
    day_number: int
    title: str
    description: Optional[str] = None
    
    city: Optional[str] = None
    destination_id: Optional[str] = None
    
    activities: List[Dict] = Field(default_factory=list)
    
    hotel_name: Optional[str] = None
    hotel_type: Optional[str] = None
    
    breakfast: bool = False
    lunch: bool = False
    dinner: bool = False
    
    transport_mode: Optional[str] = None
    transport_details: Optional[str] = None


class ItineraryDayCreate(ItineraryDayBase):
    """Schema for creating itinerary day"""
    pass


class ItineraryDayResponse(ItineraryDayBase):
    """Schema for itinerary day response"""
    id: str
    itinerary_id: str
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'itinerary_id') and obj.itinerary_id:
                data['itinerary_id'] = str(obj.itinerary_id)
            if hasattr(obj, 'destination_id') and obj.destination_id:
                data['destination_id'] = str(obj.destination_id)
            
            return cls(**data)
        return cls()


class ItineraryBase(BaseModel):
    """Base schema for Itinerary"""
    name: str
    description: Optional[str] = None
    
    total_days: int
    total_nights: int
    
    start_date: Optional[Union[datetime, date]] = None
    end_date: Optional[Union[datetime, date]] = None
    
    destination_ids: List[str] = Field(default_factory=list)
    tour_starts_from: Optional[str] = None
    tour_ends_same: bool = False
    inclusions: List[str] = Field(default_factory=list)
    feature_image: Optional[str] = None
    overview: Optional[str] = None
    
    is_template: bool = False
    notes: Optional[str] = None
    
    @field_validator('start_date', 'end_date', mode='before')
    @classmethod
    def convert_date_to_datetime(cls, v):
        """Convert date to datetime if needed"""
        if isinstance(v, date):
            return datetime.combine(v, datetime.min.time())
        return v


class ItineraryCreate(ItineraryBase):
    """Schema for creating itinerary"""
    days: List[ItineraryDayCreate] = Field(default_factory=list)


class ItineraryUpdate(BaseModel):
    """Schema for updating itinerary"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ItineraryResponse(ItineraryBase):
    """Schema for itinerary response"""
    id: str
    tenant_id: str
    owner_id: str
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
            if hasattr(obj, 'owner_id') and obj.owner_id:
                data['owner_id'] = str(obj.owner_id)
            # Convert destination_ids to strings
            if hasattr(obj, 'destination_ids') and obj.destination_ids:
                data['destination_ids'] = [str(dest_id) for dest_id in obj.destination_ids]
            
            return cls(**data)
        return cls()


class ItineraryDetailResponse(ItineraryResponse):
    """Schema for itinerary with days"""
    days: List[ItineraryDayResponse]


class ItineraryListResponse(BaseModel):
    """Schema for list of itineraries"""
    itineraries: List[ItineraryResponse]
    total: int
