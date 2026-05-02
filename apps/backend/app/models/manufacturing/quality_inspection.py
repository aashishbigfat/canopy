"""
QualityInspection model — Manufacturing CRM vertical.
"""

from beanie import Indexed
from pydantic import Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class QualityInspection(BaseDocument):
    """Quality inspection record for manufactured products."""

    inspection_number: Indexed(str)  # Auto-generated
    production_order_id: Optional[PydanticObjectId] = None  # → ProductionOrder
    product_id: Indexed(PydanticObjectId)  # → ManufacturingProduct

    # Inspector
    inspector_id: Optional[PydanticObjectId] = None  # → User
    inspection_date: datetime = Field(default_factory=datetime.utcnow)

    # Results
    status: str = "pending"  # pending | passed | failed | conditional
    inspection_type: str = "final"  # incoming | in_process | final | random
    sample_size: Optional[int] = Field(None, ge=1)
    defects_found: int = Field(0, ge=0)
    pass_rate: Optional[float] = Field(None, ge=0.0, le=100.0, description="Pass rate % (0–100)")

    # Criteria
    criteria: List[Dict[str, Any]] = Field(
        default_factory=list,
        description='[{"parameter": "...", "standard": "...", "actual": "...", "result": "pass|fail"}]',
    )

    # Disposition
    disposition: Optional[str] = None  # accept | reject | rework | scrap
    corrective_action: Optional[str] = Field(None, max_length=2000)

    notes: Optional[str] = Field(None, max_length=2000)
    attachments: List[str] = Field(default_factory=list)

    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("pending", "passed", "failed", "conditional")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    @field_validator("inspection_type")
    @classmethod
    def validate_inspection_type(cls, v):
        valid = ("incoming", "in_process", "final", "random")
        if v not in valid:
            raise ValueError(f"inspection_type must be one of: {', '.join(valid)}")
        return v

    @field_validator("disposition")
    @classmethod
    def validate_disposition(cls, v):
        valid = ("accept", "reject", "rework", "scrap")
        if v is not None and v not in valid:
            raise ValueError(f"disposition must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "manufacturing_quality_inspections"
        indexes = [
            [(("tenant_id", 1), ("deleted_at", 1), ("created_at", -1))],
            [(("tenant_id", 1), ("status", 1))],
            [(("tenant_id", 1), ("product_id", 1))],
        ]
