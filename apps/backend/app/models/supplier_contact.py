"""
Supplier Contact model — standalone MongoDB collection.

Previously embedded inside Supplier documents; migrated to its own collection
to enable proper pagination, global search, and scalable multi-industry usage.
"""
from beanie import Indexed
from pydantic import EmailStr, Field
from typing import Optional
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class SupplierContact(BaseDocument):
    """Standalone contact person linked to a supplier (own collection)"""

    # FK to parent supplier
    supplier_id: Indexed(PydanticObjectId)

    # Tenant isolation
    tenant_id: Indexed(PydanticObjectId)

    # Contact identity
    name: str
    designation: Optional[str] = None  # e.g. Sales Manager, Reservations Head
    department: Optional[str] = None

    # Communication
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None

    # Status
    is_primary: bool = False
    is_active: bool = True

    # Notes
    notes: Optional[str] = None

    class Settings:
        name = "supplier_contacts"
