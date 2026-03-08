"""
Pydantic schemas for Supplier API
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class SupplierBase(BaseModel):
    """Base schema for Supplier"""
    name: str
    company_name: Optional[str] = None
    supplier_type: str
    
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    
    contact_person_name: Optional[str] = None
    contact_person_email: Optional[EmailStr] = None
    contact_person_phone: Optional[str] = None
    
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
    supplier_type: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_preferred: Optional[bool] = None
    rating: Optional[int] = None


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
