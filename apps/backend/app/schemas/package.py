"""
Pydantic schemas for Package API
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Union
from datetime import datetime, date

class PackagePricingBase(BaseModel):
    """Base schema for PackagePricing"""
    name: str
    price: float
    valid_from: Optional[Union[datetime, date]] = None
    valid_to: Optional[Union[datetime, date]] = None
    min_pax: Optional[int] = None
    max_pax: Optional[int] = None
    
    @field_validator('valid_from', 'valid_to', mode='before')
    @classmethod
    def convert_date_to_datetime(cls, v):
        """Convert date to datetime if needed"""
        if isinstance(v, date):
            return datetime.combine(v, datetime.min.time())
        return v


class PackagePricingCreate(PackagePricingBase):
    """Schema for creating package pricing"""
    pass


class PackagePricingResponse(PackagePricingBase):
    """Schema for package pricing response"""
    id: str
    package_id: str
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'package_id') and obj.package_id:
                data['package_id'] = str(obj.package_id)
            
            return cls(**data)
        return cls()


class PackageBase(BaseModel):
    """Base schema for Package"""
    name: str
    description: Optional[str] = None
    package_code: Optional[str] = None
    
    days: int
    nights: int
    
    destination_ids: List[str] = Field(default_factory=list)
    
    base_price: float
    currency: str = "USD"
    
    valid_from: Optional[Union[datetime, date]] = None
    valid_to: Optional[Union[datetime, date]] = None
    
    inclusions: List[str] = Field(default_factory=list)
    exclusions: List[str] = Field(default_factory=list)
    
    itinerary_id: Optional[str] = None
    category: Optional[str] = None
    
    is_featured: bool = False
    min_pax: Optional[int] = None
    max_pax: Optional[int] = None
    
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    @field_validator('valid_from', 'valid_to', mode='before')
    @classmethod
    def convert_date_to_datetime(cls, v):
        """Convert date to datetime if needed"""
        if isinstance(v, date):
            return datetime.combine(v, datetime.min.time())
        return v


class PackageCreate(PackageBase):
    """Schema for creating package"""
    pricing_tiers: List[PackagePricingCreate] = Field(default_factory=list)


class PackageUpdate(BaseModel):
    """Schema for updating package"""
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class PackageResponse(PackageBase):
    """Schema for package response"""
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
            # Convert itinerary_id to string
            if hasattr(obj, 'itinerary_id') and obj.itinerary_id:
                data['itinerary_id'] = str(obj.itinerary_id)
            
            return cls(**data)
        return cls()


class PackageDetailResponse(PackageResponse):
    """Schema for package with pricing tiers"""
    pricing_tiers: List[PackagePricingResponse]


class PackageListResponse(BaseModel):
    """Schema for list of packages"""
    packages: List[PackageResponse]
    total: int
