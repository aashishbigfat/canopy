"""
Healthcare industry_data validation schemas for Lead and Opportunity.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class HealthcareLeadData(BaseModel):
    """Validates industry_data for a Lead owned by a healthcare tenant."""

    referral_source: Optional[str] = Field(None, max_length=200, description="Who referred this patient")
    insurance_provider: Optional[str] = Field(None, max_length=200, description="Insurance company name")
    insurance_policy_number: Optional[str] = Field(None, max_length=50, description="Policy number")
    preferred_appointment_date: Optional[str] = Field(None, description="Preferred date for appointment")
    chief_complaint: Optional[str] = Field(None, max_length=500, description="Primary reason for visit")
    urgency: Optional[str] = Field(None, description="Urgency level")
    referred_by_provider_id: Optional[str] = Field(None, description="Referring provider ObjectId")
    patient_type: Optional[str] = Field("new", description="new | returning")

    @field_validator("urgency")
    @classmethod
    def validate_urgency(cls, v):
        if v is not None and v not in ("routine", "urgent", "emergent"):
            raise ValueError("urgency must be one of: routine, urgent, emergent")
        return v

    @field_validator("patient_type")
    @classmethod
    def validate_patient_type(cls, v):
        if v is not None and v not in ("new", "returning"):
            raise ValueError("patient_type must be one of: new, returning")
        return v


class HealthcareOpportunityData(BaseModel):
    """Validates industry_data for an Opportunity owned by a healthcare tenant."""

    patient_id: Optional[str] = Field(None, description="Patient ObjectId")
    appointment_date: Optional[datetime] = Field(None, description="Scheduled appointment datetime")
    treatment_type: Optional[str] = Field(None, max_length=200, description="Type of treatment")
    diagnosis_codes: List[str] = Field(default_factory=list, description="ICD-10 codes")
    insurance_authorization: Optional[str] = Field(None, max_length=100, description="Pre-auth number")
    estimated_treatment_cost: Optional[float] = Field(None, ge=0, description="Estimated cost (≥ 0)")
    referring_provider_id: Optional[str] = Field(None, description="Referring provider ObjectId")
    care_plan_id: Optional[str] = Field(None, description="Care plan ObjectId")
    procedure_codes: List[str] = Field(default_factory=list, description="CPT procedure codes")


class HealthcareQuoteData(BaseModel):
    """Validates industry_data for a Quote owned by a healthcare tenant."""

    treatment_type: Optional[str] = Field(None, max_length=200, description="Type of treatment")
    estimated_sessions: Optional[int] = Field(None, ge=1, description="Estimated sessions (≥ 1)")
    insurance_preauth: Optional[str] = Field(None, max_length=100, description="Pre-authorization number")
    procedure_codes: List[str] = Field(default_factory=list, description="CPT procedure codes")
