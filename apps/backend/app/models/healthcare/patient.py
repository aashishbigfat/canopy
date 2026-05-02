"""
Patient model — Healthcare CRM vertical.
Represents a patient profile linked to CRM Accounts/Contacts.
"""

from beanie import Indexed
from pydantic import EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Patient(BaseDocument):
    """Patient model for healthcare CRM."""

    # Patient Identification
    patient_id: Indexed(str)  # Auto-generated MRN (Medical Record Number)

    # Demographics
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    date_of_birth: date
    gender: Optional[str] = None  # male | female | other | prefer_not_to_say
    blood_group: Optional[str] = None  # A+ | A- | B+ | B- | AB+ | AB- | O+ | O-

    # Contact
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

    # Medical
    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    current_medications: List[str] = Field(default_factory=list)
    medical_notes: Optional[str] = None

    # Insurance
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_group_id: Optional[str] = None

    # Consent
    consent_signed: bool = False
    consent_date: Optional[datetime] = None

    # Relationships — links to core CRM entities
    primary_provider_id: Optional[PydanticObjectId] = None  # → Provider
    account_id: Optional[PydanticObjectId] = None  # → Account (hospital/clinic)
    contact_id: Optional[PydanticObjectId] = None  # → Contact (CRM contact)

    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

    # Status
    is_active: bool = True
    tags: List[str] = Field(default_factory=list)

    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        if v is not None and v not in ("male", "female", "other", "prefer_not_to_say"):
            raise ValueError("gender must be one of: male, female, other, prefer_not_to_say")
        return v

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v):
        valid = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
        if v is not None and v not in valid:
            raise ValueError(f"blood_group must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "healthcare_patients"
        indexes = [
            [(("tenant_id", 1), ("deleted_at", 1), ("created_at", -1))],
            [(("tenant_id", 1), ("patient_id", 1))],
            [(("tenant_id", 1), ("owner_id", 1))],
        ]
