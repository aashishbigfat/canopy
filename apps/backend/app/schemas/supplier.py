"""
Pydantic schemas for Supplier API
"""
from pydantic import BaseModel, EmailStr, Field, BeforeValidator, model_validator
from typing import Optional, Annotated, List, Dict, Any
from datetime import datetime
from app.core.validators import PHONE_REGEX, PHONE_REGEX_MESSAGE, ZIP_REGEX, ZIP_REGEX_MESSAGE, strict_phone_validator

class SupplierContactBase(BaseModel):
    """Base schema for an embedded supplier contact"""
    name: str
    designation: Optional[str] = None
    department: Optional[str] = None
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    mobile: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    is_primary: bool = False
    notes: Optional[str] = None


class SupplierContactCreate(SupplierContactBase):
    """Schema for adding a contact to a supplier"""
    pass


class SupplierContactUpdate(BaseModel):
    """Schema for updating a supplier contact"""
    name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    mobile: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


class SupplierContactResponse(SupplierContactBase):
    """Schema for a supplier contact response"""
    id: str
    created_at: datetime
    updated_at: datetime


class SupplierBase(BaseModel):
    """Base schema for Supplier"""
    name: str = Field(..., min_length=2, max_length=255)
    company_name: Optional[str] = None
    supplier_type: str = Field(..., min_length=1)
    
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[str, BeforeValidator(strict_phone_validator)] = Field(..., pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
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

    # Custom field values (Phase 1 §C) — accepted on create, populated on read
    custom_fields: Optional[Dict[str, Any]] = None


class SupplierCreate(SupplierBase):
    """Schema for creating a supplier"""
    pass


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier"""
    name: Optional[str] = None
    company_name: Optional[str] = None
    supplier_type: Optional[str] = None
    
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
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

    # Custom field values (Phase 1 §C)
    custom_fields: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_required_inline_fields(self) -> "SupplierUpdate":
        if "name" in self.model_fields_set and not self.name:
            raise ValueError("Name is required.")
        if "supplier_type" in self.model_fields_set and not self.supplier_type:
            raise ValueError("Supplier type is required.")
        if "phone" in self.model_fields_set and not self.phone:
            raise ValueError("Phone is required.")
        return self


class SupplierResponse(SupplierBase):
    """Schema for supplier response"""
    # Relax input-only constraints for output: legacy/partial records must still
    # serialize even if they predate current required-field / format rules.
    # (Mirrors AccountResponse — e.g. a supplier saved before phone was required,
    # or with a legacy non-conforming phone/mobile, must not 500 the list endpoint.)
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None

    id: str
    tenant_id: str
    owner_id: str
    is_active: bool

    contacts: List[SupplierContactResponse] = Field(default_factory=list)

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
            
            return cls(**data)
        return cls()


class SupplierListResponse(BaseModel):
    """Schema for list of suppliers"""
    suppliers: list[SupplierResponse]
    total: int
    page: int = 1
    per_page: int = 10
    pages: int


class SupplierOwnerChange(BaseModel):
    """Schema for changing supplier owner"""
    new_owner_id: str

