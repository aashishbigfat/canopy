"""
Supplier Contact embedded model - contacts stored inside the Supplier document.
This avoids creating a new MongoDB collection (Atlas has a 500 collection limit).
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


class SupplierContact(BaseModel):
    """Embedded contact person within a supplier document (NOT a standalone collection)"""

    # Unique ID for each contact (generated, not a MongoDB ObjectId)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

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

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
