"""Referral schemas for healthcare CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, Field, field_validator, model_validator


_VALID_STATUSES = ("pending", "scheduled", "completed", "denied", "expired")
_VALID_PRIORITIES = ("routine", "urgent", "emergent")
_VALID_AUTH = ("pending", "approved", "denied")


def _check_status(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(_VALID_STATUSES)}")
    return v


def _check_priority(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_PRIORITIES:
        raise ValueError(f"priority must be one of: {', '.join(_VALID_PRIORITIES)}")
    return v


def _check_auth(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_AUTH:
        raise ValueError(f"authorization_status must be one of: {', '.join(_VALID_AUTH)}")
    return v


class ReferralBase(BaseModel):
    referral_number: str
    patient_id: PydanticObjectId
    referring_provider_id: PydanticObjectId
    receiving_provider_id: Optional[PydanticObjectId] = None
    referral_date: datetime
    expiry_date: Optional[datetime] = None
    status: str = "pending"
    priority: str = "routine"
    reason: Optional[str] = Field(None, max_length=1000)
    clinical_notes: Optional[str] = Field(None, max_length=2000)
    diagnosis_codes: List[str] = Field(default_factory=list)
    insurance_authorization_number: Optional[str] = None
    authorization_status: Optional[str] = None
    opportunity_id: Optional[PydanticObjectId] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)

    @field_validator("priority")
    @classmethod
    def _priority(cls, v):
        return _check_priority(v)

    @field_validator("authorization_status")
    @classmethod
    def _auth(cls, v):
        return _check_auth(v)

    @model_validator(mode="after")
    def _dates(self):
        if self.expiry_date and self.referral_date and self.expiry_date <= self.referral_date:
            raise ValueError("expiry_date must be after referral_date")
        return self


class ReferralCreate(ReferralBase):
    pass


class ReferralUpdate(BaseModel):
    referral_number: Optional[str] = None
    patient_id: Optional[PydanticObjectId] = None
    referring_provider_id: Optional[PydanticObjectId] = None
    receiving_provider_id: Optional[PydanticObjectId] = None
    referral_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    reason: Optional[str] = Field(None, max_length=1000)
    clinical_notes: Optional[str] = Field(None, max_length=2000)
    diagnosis_codes: Optional[List[str]] = None
    insurance_authorization_number: Optional[str] = None
    authorization_status: Optional[str] = None
    opportunity_id: Optional[PydanticObjectId] = None
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)

    @field_validator("priority")
    @classmethod
    def _priority(cls, v):
        return _check_priority(v)

    @field_validator("authorization_status")
    @classmethod
    def _auth(cls, v):
        return _check_auth(v)


class ReferralResponse(ReferralBase):
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
