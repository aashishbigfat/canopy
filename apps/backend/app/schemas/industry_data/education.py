"""
Education industry_data validation schemas for Lead and Opportunity.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime


class EducationLeadData(BaseModel):
    """Validates industry_data for a Lead owned by an education tenant."""

    program_interest_id: Optional[str] = Field(None, description="Program ObjectId the prospect is interested in")
    academic_term_id: Optional[str] = Field(None, description="Target academic term ObjectId")
    highest_qualification: Optional[str] = Field(None, max_length=200, description="e.g. Bachelors, Masters")
    gpa: Optional[float] = Field(None, ge=0.0, le=10.0, description="Grade point average (0–10)")
    test_scores: Optional[Dict[str, float]] = Field(None, description='e.g. {"SAT": 1400, "GRE": 320}')
    scholarship_interest: bool = Field(False, description="Whether the prospect wants scholarship info")
    preferred_start_date: Optional[str] = Field(None, description="Preferred program start date")
    nationality: Optional[str] = Field(None, max_length=100)
    sponsorship_type: Optional[str] = Field(None, description="self | employer | government")

    @field_validator("sponsorship_type")
    @classmethod
    def validate_sponsorship_type(cls, v):
        if v is not None and v not in ("self", "employer", "government"):
            raise ValueError("sponsorship_type must be one of: self, employer, government")
        return v


class EducationOpportunityData(BaseModel):
    """Validates industry_data for an Opportunity owned by an education tenant."""

    application_number: Optional[str] = Field(None, max_length=50, description="Auto-generated application number")
    program_id: Optional[str] = Field(None, description="Program ObjectId")
    academic_term_id: Optional[str] = Field(None, description="Academic term ObjectId")
    admission_status: Optional[str] = Field(None, description="Current admission status")
    interview_date: Optional[datetime] = Field(None, description="Scheduled interview date")
    scholarship_id: Optional[str] = Field(None, description="Scholarship ObjectId")
    scholarship_amount: Optional[float] = Field(None, ge=0, description="Scholarship amount (≥ 0)")
    tuition_fee: Optional[float] = Field(None, ge=0, description="Tuition fee (≥ 0)")
    documents_submitted: List[str] = Field(default_factory=list, description="List of submitted document names")

    @field_validator("admission_status")
    @classmethod
    def validate_admission_status(cls, v):
        valid = (
            "inquiry", "applied", "docs_pending", "under_review",
            "interview", "accepted", "rejected", "enrolled", "withdrawn",
        )
        if v is not None and v not in valid:
            raise ValueError(f"admission_status must be one of: {', '.join(valid)}")
        return v


class EducationQuoteData(BaseModel):
    """Validates industry_data for a Quote owned by an education tenant."""

    program_id: Optional[str] = Field(None, description="Program ObjectId")
    academic_term_id: Optional[str] = Field(None, description="Academic term ObjectId")
    tuition_fee: Optional[float] = Field(None, ge=0, description="Tuition fee (≥ 0)")
    scholarship_amount: Optional[float] = Field(None, ge=0, description="Scholarship amount (≥ 0)")
