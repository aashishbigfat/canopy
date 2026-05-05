"""
Admission model — Education CRM vertical.
Tracks student applications through the admissions funnel.
"""

from beanie import Indexed
from pydantic import Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Admission(BaseDocument):
    """Student admission / application model."""

    application_number: Indexed(str)  # Auto-generated

    # Applicant (links to CRM)
    applicant_contact_id: Optional[PydanticObjectId] = None  # → Contact

    # Program & Term
    program_id: Indexed(PydanticObjectId)  # → Program
    academic_term_id: Optional[PydanticObjectId] = None  # → AcademicTerm

    # Status Pipeline
    status: str = "inquiry"

    # Dates
    application_date: Optional[datetime] = None
    decision_date: Optional[datetime] = None

    # Academic Records
    gpa: Optional[float] = Field(None, ge=0.0, le=10.0, description="GPA (0–10)")
    test_scores: Optional[Dict[str, float]] = Field(None, description='e.g. {"SAT": 1400}')
    previous_institution: Optional[str] = Field(None, max_length=200)
    previous_degree: Optional[str] = Field(None, max_length=200)

    # Documents
    documents: List[Dict[str, Any]] = Field(
        default_factory=list,
        description='[{"name": "...", "file_id": "...", "status": "pending"}]',
    )

    # Review
    reviewer_id: Optional[PydanticObjectId] = None  # → User
    reviewer_notes: Optional[str] = Field(None, max_length=2000)

    # Interview
    interview_date: Optional[datetime] = None
    interview_notes: Optional[str] = Field(None, max_length=2000)

    # Scholarship
    scholarship_applied: bool = False
    scholarship_id: Optional[PydanticObjectId] = None  # → Scholarship

    # CRM Links
    source_id: Optional[PydanticObjectId] = None
    lead_id: Optional[PydanticObjectId] = None  # → Lead
    opportunity_id: Optional[PydanticObjectId] = None  # → Opportunity

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
        valid = (
            "inquiry", "applied", "docs_pending", "under_review",
            "interview", "accepted", "rejected", "enrolled", "withdrawn",
        )
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "education_admissions"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("status", 1)],
            [("tenant_id", 1), ("program_id", 1)],
            [("tenant_id", 1), ("application_number", 1)],
        ]
