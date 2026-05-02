"""
Pydantic schemas for Supplier API
"""
from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from typing import Optional, Annotated, List
from datetime import datetime
from app.core.validators import PHONE_REGEX, PHONE_REGEX_MESSAGE, ZIP_REGEX, ZIP_REGEX_MESSAGE

class SupplierBase(BaseModel):
    """Base schema for Supplier"""
    name: str
    company_name: Optional[str] = None
    supplier_type: str
    
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    mobile: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    website: Optional[str] = None
    
    # Multi-select fields
    services: List[str] = Field(default_factory=list)
    countries: List[str] = Field(default_factory=list)
    states: List[str] = Field(default_factory=list)
    service_cities: List[str] = Field(default_factory=list)
    destinations: List[str] = Field(default_factory=list)
    
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    country: Optional[str] = None
    
    contact_person_name: Optional[str] = None
    contact_person_email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    contact_person_phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    
    is_preferred: bool = False
    rating: Optional[int] = None
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    """Schema for creating a supplier"""
    pass


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier"""
    name: Optional[str] = None
    company_name: Optional[str] = None
    supplier_type: Optional[str] = None
    
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    mobile: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    website: Optional[str] = None
    
    # Multi-select fields
    services: Optional[List[str]] = None
    countries: Optional[List[str]] = None
    states: Optional[List[str]] = None
    service_cities: Optional[List[str]] = None
    destinations: Optional[List[str]] = None
    
    # Address fields
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    country: Optional[str] = None
    
    # Contact person
    contact_person_name: Optional[str] = None
    contact_person_email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    contact_person_phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    
    # Finance
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    
    is_active: Optional[bool] = None
    is_preferred: Optional[bool] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    owner_id: Optional[str] = None


class SupplierResponse(SupplierBase):
    """Schema for supplier response"""
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
            # Exclude embedded contacts from list/detail responses
            # (contacts are fetched via dedicated /contacts endpoint)
            data = obj.model_dump(exclude={'contacts'})
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            if hasattr(obj, 'owner_id') and obj.owner_id:
                data['owner_id'] = str(obj.owner_id)
            
            return cls(**data)
        return cls()


class SupplierListResponse(BaseModel):
    """Schema for list of suppliers"""
    suppliers: list[SupplierResponse]
    total: int
    page: int = 1
    per_page: int = 10
    pages: int
