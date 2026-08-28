"""
Care Plan model — Healthcare CRM vertical.
Tracks patient treatment plans, goals, and interventions.
"""

from beanie import Indexed
from pydantic import Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class CarePlan(BaseDocument):
    """Patient care plan model."""

    # Relationships
    patient_id: Indexed(PydanticObjectId)  # → Patient
    provider_id: Optional[PydanticObjectId] = None  # → Provider

    # Plan Details
    plan_name: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: str = "active"  # active | completed | on_hold | discontinued

    # Timeline
    start_date: datetime
    target_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None

    # Clinical Content
    diagnosis_codes: List[str] = Field(default_factory=list, description="ICD-10 codes")
    goals: List[Dict[str, Any]] = Field(
        default_factory=list,
        description='[{"goal": "...", "target_date": "...", "status": "in_progress"}]',
    )
    interventions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description='[{"intervention": "...", "frequency": "...", "responsible": "..."}]',
    )
    medications: List[Dict[str, Any]] = Field(
        default_factory=list,
        description='[{"name": "...", "dosage": "...", "frequency": "..."}]',
    )
    follow_up_schedule: List[Dict[str, Any]] = Field(
        default_factory=list,
        description='[{"date": "...", "type": "...", "notes": "..."}]',
    )

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
        valid = ("active", "completed", "on_hold", "discontinued")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "healthcare_care_plans"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("patient_id", 1)],
            [("tenant_id", 1), ("status", 1)],
        ]
