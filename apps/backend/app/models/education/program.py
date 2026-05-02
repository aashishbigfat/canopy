"""
Program model — Education CRM vertical.
Represents academic programs offered by an institution.
"""

from beanie import Indexed
from pydantic import Field, field_validator
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Program(BaseDocument):
    """Academic program model."""

    name: str = Field(..., max_length=200)
    code: Indexed(str)  # Unique program code per tenant, e.g. "CS-BSC"
    department: Optional[str] = Field(None, max_length=200)
    school: Optional[str] = Field(None, max_length=200)

    # Degree Info
    degree_type: str  # certificate | diploma | bachelors | masters | doctorate | professional
    duration_months: int = Field(..., ge=1, description="Duration in months (≥ 1)")
    credits_required: Optional[int] = Field(None, ge=0)

    # Description
    description: Optional[str] = Field(None, max_length=5000)
    learning_outcomes: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)

    # Financial
    tuition_fee: Optional[float] = Field(None, ge=0)
    currency: str = "USD"

    # Capacity
    intake_capacity: Optional[int] = Field(None, ge=1)

    # Status
    is_active: bool = True
    is_online: bool = False

    # Accreditation
    accreditation_body: Optional[str] = None
    accreditation_status: Optional[str] = None

    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("degree_type")
    @classmethod
    def validate_degree_type(cls, v):
        valid = ("certificate", "diploma", "bachelors", "masters", "doctorate", "professional")
        if v not in valid:
            raise ValueError(f"degree_type must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "education_programs"
        indexes = [
            [(("tenant_id", 1), ("deleted_at", 1), ("created_at", -1))],
            [(("tenant_id", 1), ("code", 1))],
            [(("tenant_id", 1), ("degree_type", 1))],
        ]
