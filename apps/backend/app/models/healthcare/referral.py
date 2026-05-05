"""
Referral model — Healthcare CRM vertical.
Tracks patient referrals between providers with authorization workflow.
"""

from beanie import Indexed
from pydantic import Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Referral(BaseDocument):
    """Patient referral tracking model."""

    # Identification
    referral_number: Indexed(str)  # Auto-generated

    # Participants
    patient_id: Indexed(PydanticObjectId)  # → Patient
    referring_provider_id: Indexed(PydanticObjectId)  # → Provider (source)
    receiving_provider_id: Optional[PydanticObjectId] = None  # → Provider (destination)

    # Dates
    referral_date: datetime = Field(default_factory=datetime.utcnow)
    expiry_date: Optional[datetime] = None

    # Status & Priority
    status: str = "pending"  # pending | scheduled | completed | denied | expired
    priority: str = "routine"  # routine | urgent | emergent

    # Clinical
    reason: Optional[str] = Field(None, max_length=1000)
    clinical_notes: Optional[str] = Field(None, max_length=2000)
    diagnosis_codes: List[str] = Field(default_factory=list, description="ICD-10 codes")

    # Insurance Authorization
    insurance_authorization_number: Optional[str] = None
    authorization_status: Optional[str] = None  # pending | approved | denied

    # CRM Link
    opportunity_id: Optional[PydanticObjectId] = None  # → Opportunity (CRM deal)

    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("pending", "scheduled", "completed", "denied", "expired")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v):
        valid = ("routine", "urgent", "emergent")
        if v not in valid:
            raise ValueError(f"priority must be one of: {', '.join(valid)}")
        return v

    @field_validator("authorization_status")
    @classmethod
    def validate_auth_status(cls, v):
        valid = ("pending", "approved", "denied")
        if v is not None and v not in valid:
            raise ValueError(f"authorization_status must be one of: {', '.join(valid)}")
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.expiry_date and self.referral_date and self.expiry_date <= self.referral_date:
            raise ValueError("expiry_date must be after referral_date")
        return self

    class Settings:
        name = "healthcare_referrals"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("status", 1)],
            [("tenant_id", 1), ("patient_id", 1)],
        ]
