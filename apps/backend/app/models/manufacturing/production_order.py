"""
ProductionOrder + WorkOrder models — Manufacturing CRM vertical.
"""

from beanie import Indexed
from pydantic import Field, field_validator, model_validator
from typing import Optional, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class ProductionOrder(BaseDocument):
    """Production order model — tracks what to manufacture."""

    order_number: Indexed(str)  # Auto-generated
    product_id: Indexed(PydanticObjectId)  # → ManufacturingProduct
    bom_id: Optional[PydanticObjectId] = None  # → BillOfMaterials
    opportunity_id: Optional[PydanticObjectId] = None  # → Opportunity (CRM deal)

    # Quantities
    quantity_ordered: int = Field(..., ge=1, description="Quantity ordered (≥ 1)")
    quantity_produced: int = Field(0, ge=0)
    quantity_rejected: int = Field(0, ge=0)

    # Status & Priority
    status: str = "planned"  # planned | in_progress | on_hold | completed | cancelled
    priority: str = "normal"  # low | normal | high | critical

    # Schedule
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None

    # Location
    production_line: Optional[str] = Field(None, max_length=200)
    plant_location: Optional[str] = Field(None, max_length=200)

    # Assignment
    assigned_to: Optional[PydanticObjectId] = None  # → User

    notes: Optional[str] = Field(None, max_length=2000)

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
        valid = ("planned", "in_progress", "on_hold", "completed", "cancelled")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v):
        valid = ("low", "normal", "high", "critical")
        if v not in valid:
            raise ValueError(f"priority must be one of: {', '.join(valid)}")
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.planned_start and self.planned_end and self.planned_end <= self.planned_start:
            raise ValueError("planned_end must be after planned_start")
        return self

    class Settings:
        name = "manufacturing_production_orders"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("status", 1)],
            [("tenant_id", 1), ("order_number", 1)],
        ]


class WorkOrder(BaseDocument):
    """Work order — an individual operation within a production order."""

    work_order_number: Indexed(str)  # Auto-generated
    production_order_id: Indexed(PydanticObjectId)  # → ProductionOrder

    operation_name: str = Field(..., max_length=200)
    operation_sequence: int = Field(..., ge=1, description="Sequence (≥ 1)")
    workstation: Optional[str] = Field(None, max_length=200)
    machine_id: Optional[str] = None

    # Assignment
    assigned_to: Optional[PydanticObjectId] = None  # → User

    # Status
    status: str = "pending"  # pending | in_progress | completed | failed | rework

    # Hours
    planned_hours: Optional[float] = Field(None, gt=0, description="Planned hours (> 0)")
    actual_hours: Optional[float] = Field(None, ge=0)

    # Schedule
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None

    # Quantities
    quantity_input: Optional[int] = Field(None, ge=0)
    quantity_output: Optional[int] = Field(None, ge=0)
    quantity_scrap: Optional[int] = Field(None, ge=0)

    instructions: Optional[str] = Field(None, max_length=2000)
    notes: Optional[str] = Field(None, max_length=2000)

    tenant_id: Indexed(PydanticObjectId)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("pending", "in_progress", "completed", "failed", "rework")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "manufacturing_work_orders"
        indexes = [
            [("tenant_id", 1), ("production_order_id", 1)],
            [("tenant_id", 1), ("status", 1)],
        ]
