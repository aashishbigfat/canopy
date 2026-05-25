"""Appointment schemas for healthcare CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, Field, field_validator, model_validator


_VALID_TYPES = ("consultation", "follow_up", "procedure", "lab_work", "telehealth")
_VALID_STATUSES = ("scheduled", "confirmed", "checked_in", "completed", "no_show", "cancelled")


class AppointmentBase(BaseModel):
    patient_id: PydanticObjectId
    provider_id: PydanticObjectId

    appointment_date: datetime
    start_time: datetime
    end_time: Optional[datetime] = None

    appointment_type: str = "consultation"
    status: str = "scheduled"

    location: Optional[str] = None
    room_number: Optional[str] = None

    is_telehealth: bool = False
    telehealth_link: Optional[str] = None

    visit_reason: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)

    copay_amount: Optional[float] = Field(None, ge=0)
    copay_collected: bool = False

    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None

    referral_id: Optional[PydanticObjectId] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("appointment_type")
    @classmethod
    def _type(cls, v: str) -> str:
        if v not in _VALID_TYPES:
            raise ValueError(f"appointment_type must be one of: {', '.join(_VALID_TYPES)}")
        return v

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        if v not in _VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(_VALID_STATUSES)}")
        return v

    @model_validator(mode="after")
    def _validate_times(self):
        if self.end_time and self.start_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    appointment_type: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    room_number: Optional[str] = None
    is_telehealth: Optional[bool] = None
    telehealth_link: Optional[str] = None
    visit_reason: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)
    copay_amount: Optional[float] = Field(None, ge=0)
    copay_collected: Optional[bool] = None
    reminder_sent: Optional[bool] = None
    reminder_sent_at: Optional[datetime] = None
    referral_id: Optional[PydanticObjectId] = None
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("appointment_type")
    @classmethod
    def _type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_TYPES:
            raise ValueError(f"appointment_type must be one of: {', '.join(_VALID_TYPES)}")
        return v

    @field_validator("status")
    @classmethod
    def _status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(_VALID_STATUSES)}")
        return v


class AppointmentResponse(AppointmentBase):
    id: str
    tenant_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
