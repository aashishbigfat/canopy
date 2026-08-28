"""Provider schemas for healthcare CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


def _check_npi(v: Optional[str]) -> Optional[str]:
    if v is not None and (not v.isdigit() or len(v) != 10):
        raise ValueError("NPI number must be exactly 10 digits")
    return v


class ProviderBase(BaseModel):
    name: str
    npi_number: Optional[str] = Field(None, max_length=10)
    license_number: Optional[str] = None
    license_state: Optional[str] = None

    specialty: str
    designation: Optional[str] = None
    department: Optional[str] = None

    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_city: Optional[str] = None
    clinic_state: Optional[str] = None
    clinic_zip: Optional[str] = None

    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None

    accepting_new_patients: bool = True
    is_in_network: bool = True
    available_days: List[str] = Field(default_factory=list)
    consultation_fee: Optional[float] = Field(None, ge=0)

    is_active: bool = True
    rating: Optional[int] = Field(None, ge=1, le=5)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("npi_number")
    @classmethod
    def _npi(cls, v):
        return _check_npi(v)


class ProviderCreate(ProviderBase):
    pass


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    npi_number: Optional[str] = Field(None, max_length=10)
    license_number: Optional[str] = None
    license_state: Optional[str] = None
    specialty: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_city: Optional[str] = None
    clinic_state: Optional[str] = None
    clinic_zip: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    accepting_new_patients: Optional[bool] = None
    is_in_network: Optional[bool] = None
    available_days: Optional[List[str]] = None
    consultation_fee: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("npi_number")
    @classmethod
    def _npi(cls, v):
        return _check_npi(v)


class ProviderResponse(ProviderBase):
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
