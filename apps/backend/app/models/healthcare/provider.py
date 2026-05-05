"""
Provider model — Healthcare CRM vertical.
Represents doctors, specialists, and clinical staff.
"""

from beanie import Indexed
from pydantic import EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Provider(BaseDocument):
    """Healthcare provider / physician model."""

    # Identity
    name: Indexed(str)
    npi_number: Optional[str] = Field(None, max_length=10, description="National Provider Identifier (10-digit)")
    license_number: Optional[str] = None
    license_state: Optional[str] = None

    # Professional
    specialty: str  # Cardiology, Orthopedics, etc.
    designation: Optional[str] = None  # MD, DO, NP, PA
    department: Optional[str] = None

    # Clinic / Practice
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_city: Optional[str] = None
    clinic_state: Optional[str] = None
    clinic_zip: Optional[str] = None

    # Contact
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None

    # Availability
    accepting_new_patients: bool = True
    is_in_network: bool = True
    available_days: List[str] = Field(default_factory=list)  # ["Mon", "Tue", "Wed"]
    consultation_fee: Optional[float] = Field(None, ge=0, description="Consultation fee (≥ 0)")

    # Status
    is_active: bool = True
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating 1-5")

    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("npi_number")
    @classmethod
    def validate_npi(cls, v):
        if v is not None and (not v.isdigit() or len(v) != 10):
            raise ValueError("NPI number must be exactly 10 digits")
        return v

    class Settings:
        name = "healthcare_providers"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("specialty", 1)],
            [("tenant_id", 1), ("owner_id", 1)],
        ]
