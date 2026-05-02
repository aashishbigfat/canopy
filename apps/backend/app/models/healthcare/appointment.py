"""
Appointment model — Healthcare CRM vertical.
Tracks patient appointments with providers.
"""

from beanie import Indexed
from pydantic import Field, field_validator, model_validator
from typing import Optional, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Appointment(BaseDocument):
    """Patient appointment model."""

    # Participants
    patient_id: Indexed(PydanticObjectId)  # → Patient
    provider_id: Indexed(PydanticObjectId)  # → Provider

    # Schedule
    appointment_date: datetime
    start_time: datetime
    end_time: Optional[datetime] = None

    # Type & Status
    appointment_type: str = "consultation"  # consultation | follow_up | procedure | lab_work | telehealth
    status: str = "scheduled"  # scheduled | confirmed | checked_in | completed | no_show | cancelled

    # Location
    location: Optional[str] = None
    room_number: Optional[str] = None

    # Telehealth
    is_telehealth: bool = False
    telehealth_link: Optional[str] = None

    # Clinical
    visit_reason: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)

    # Financial
    copay_amount: Optional[float] = Field(None, ge=0, description="Copay amount (≥ 0)")
    copay_collected: bool = False

    # Reminders
    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None

    # Referral link
    referral_id: Optional[PydanticObjectId] = None  # → Referral

    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("appointment_type")
    @classmethod
    def validate_appointment_type(cls, v):
        valid = ("consultation", "follow_up", "procedure", "lab_work", "telehealth")
        if v not in valid:
            raise ValueError(f"appointment_type must be one of: {', '.join(valid)}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("scheduled", "confirmed", "checked_in", "completed", "no_show", "cancelled")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    @model_validator(mode="after")
    def validate_times(self):
        if self.end_time and self.start_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self

    class Settings:
        name = "healthcare_appointments"
        indexes = [
            [(("tenant_id", 1), ("appointment_date", -1))],
            [(("tenant_id", 1), ("patient_id", 1))],
            [(("tenant_id", 1), ("provider_id", 1))],
            [(("tenant_id", 1), ("status", 1))],
        ]
