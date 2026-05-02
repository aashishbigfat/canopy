"""
Insurance Verification model — Healthcare CRM vertical.
"""

from beanie import Indexed
from pydantic import Field, field_validator, model_validator
from typing import Optional, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class InsuranceVerification(BaseDocument):
    """Insurance verification record for a patient."""

    patient_id: Indexed(PydanticObjectId)  # → Patient

    # Insurance Details
    insurance_provider: str = Field(..., max_length=200)
    policy_number: str = Field(..., max_length=50)
    group_id: Optional[str] = None

    # Verification
    verification_date: Optional[datetime] = None
    verified_by: Optional[PydanticObjectId] = None  # → User
    status: str = "pending"  # verified | denied | pending | expired

    # Coverage
    coverage_type: Optional[str] = None  # HMO | PPO | POS | EPO
    copay: Optional[float] = Field(None, ge=0)
    deductible: Optional[float] = Field(None, ge=0)
    coinsurance_percent: Optional[float] = Field(None, ge=0, le=100)
    out_of_pocket_max: Optional[float] = Field(None, ge=0)
    remaining_benefits: Optional[float] = Field(None, ge=0)

    # Authorization
    pre_auth_required: bool = False
    pre_auth_number: Optional[str] = None

    # Validity
    effective_date: Optional[datetime] = None
    termination_date: Optional[datetime] = None

    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("verified", "denied", "pending", "expired")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    @field_validator("coverage_type")
    @classmethod
    def validate_coverage_type(cls, v):
        valid = ("HMO", "PPO", "POS", "EPO", "Medicare", "Medicaid")
        if v is not None and v not in valid:
            raise ValueError(f"coverage_type must be one of: {', '.join(valid)}")
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.termination_date and self.effective_date and self.termination_date <= self.effective_date:
            raise ValueError("termination_date must be after effective_date")
        return self

    class Settings:
        name = "healthcare_insurance_verifications"
        indexes = [
            [(("tenant_id", 1), ("patient_id", 1))],
            [(("tenant_id", 1), ("status", 1))],
        ]
