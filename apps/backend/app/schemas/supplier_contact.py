"""
Pydantic schemas for Supplier Contact API (standalone collection).
Follows the same validation pattern as SupplierBase, ContactBase, etc.
"""
from pydantic import BaseModel, EmailStr, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime


class SupplierContactBase(BaseModel):
    """Base schema for SupplierContact"""
    name: str
    designation: Optional[str] = None
    department: Optional[str] = None
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    mobile: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None)] = None
    is_primary: bool = False
    is_active: bool = True
    notes: Optional[str] = None


class SupplierContactCreate(SupplierContactBase):
    """Schema for creating a supplier contact"""
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
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class SupplierContactResponse(SupplierContactBase):
    """Schema for supplier contact response"""
    id: str
    supplier_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_doc(cls, obj):
        """Convert a SupplierContact Document to a response"""
        data = obj.model_dump()
        data['id'] = str(obj.id)
        data['supplier_id'] = str(obj.supplier_id)
        return cls(**data)
