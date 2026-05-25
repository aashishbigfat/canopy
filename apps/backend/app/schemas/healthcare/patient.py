"""Patient schemas for healthcare CRM."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, EmailStr, Field, field_validator


_VALID_GENDERS = ("male", "female", "other", "prefer_not_to_say")
_VALID_BLOOD = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")


class PatientBase(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    date_of_birth: date
    gender: Optional[str] = None
    blood_group: Optional[str] = None

    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    current_medications: List[str] = Field(default_factory=list)
    medical_notes: Optional[str] = None

    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_group_id: Optional[str] = None

    consent_signed: bool = False
    consent_date: Optional[datetime] = None

    primary_provider_id: Optional[PydanticObjectId] = None
    account_id: Optional[PydanticObjectId] = None
    contact_id: Optional[PydanticObjectId] = None

    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

    is_active: bool = True
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("gender")
    @classmethod
    def _gender(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_GENDERS:
            raise ValueError(f"gender must be one of: {', '.join(_VALID_GENDERS)}")
        return v

    @field_validator("blood_group")
    @classmethod
    def _blood(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_BLOOD:
            raise ValueError(f"blood_group must be one of: {', '.join(_VALID_BLOOD)}")
        return v


class PatientCreate(PatientBase):
    # patient_id is generated server-side if omitted; allow override for migrations
    patient_id: Optional[str] = None
    owner_id: Optional[PydanticObjectId] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None

    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None
    medical_notes: Optional[str] = None

    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_group_id: Optional[str] = None

    consent_signed: Optional[bool] = None
    consent_date: Optional[datetime] = None

    primary_provider_id: Optional[PydanticObjectId] = None
    account_id: Optional[PydanticObjectId] = None
    contact_id: Optional[PydanticObjectId] = None
    owner_id: Optional[PydanticObjectId] = None

    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("gender")
    @classmethod
    def _gender(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_GENDERS:
            raise ValueError(f"gender must be one of: {', '.join(_VALID_GENDERS)}")
        return v

    @field_validator("blood_group")
    @classmethod
    def _blood(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_BLOOD:
            raise ValueError(f"blood_group must be one of: {', '.join(_VALID_BLOOD)}")
        return v


class PatientResponse(PatientBase):
    id: str
    patient_id: str
    tenant_id: str
    owner_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
