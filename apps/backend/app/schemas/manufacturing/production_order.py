"""Production order schemas for manufacturing CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, Field, field_validator, model_validator


_VALID_STATUSES = ("planned", "in_progress", "on_hold", "completed", "cancelled")
_VALID_PRIORITIES = ("low", "normal", "high", "critical")


def _check_status(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(_VALID_STATUSES)}")
    return v


def _check_priority(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_PRIORITIES:
        raise ValueError(f"priority must be one of: {', '.join(_VALID_PRIORITIES)}")
    return v


class ProductionOrderBase(BaseModel):
    order_number: str
    product_id: PydanticObjectId
    bom_id: Optional[PydanticObjectId] = None
    opportunity_id: Optional[PydanticObjectId] = None

    quantity_ordered: int = Field(..., ge=1)
    quantity_produced: int = Field(0, ge=0)
    quantity_rejected: int = Field(0, ge=0)

    status: str = "planned"
    priority: str = "normal"

    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None

    production_line: Optional[str] = Field(None, max_length=200)
    plant_location: Optional[str] = Field(None, max_length=200)
    assigned_to: Optional[PydanticObjectId] = None
    notes: Optional[str] = Field(None, max_length=2000)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)

    @field_validator("priority")
    @classmethod
    def _priority(cls, v):
        return _check_priority(v)

    @model_validator(mode="after")
    def _dates(self):
        if self.planned_start and self.planned_end and self.planned_end <= self.planned_start:
            raise ValueError("planned_end must be after planned_start")
        return self


class ProductionOrderCreate(ProductionOrderBase):
    pass


class ProductionOrderUpdate(BaseModel):
    order_number: Optional[str] = None
    product_id: Optional[PydanticObjectId] = None
    bom_id: Optional[PydanticObjectId] = None
    opportunity_id: Optional[PydanticObjectId] = None
    quantity_ordered: Optional[int] = Field(None, ge=1)
    quantity_produced: Optional[int] = Field(None, ge=0)
    quantity_rejected: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    priority: Optional[str] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    production_line: Optional[str] = Field(None, max_length=200)
    plant_location: Optional[str] = Field(None, max_length=200)
    assigned_to: Optional[PydanticObjectId] = None
    notes: Optional[str] = Field(None, max_length=2000)
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)

    @field_validator("priority")
    @classmethod
    def _priority(cls, v):
        return _check_priority(v)


class ProductionOrderResponse(ProductionOrderBase):
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
