"""Bill of Materials schemas for manufacturing CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, Field, field_validator


_VALID_STATUSES = ("draft", "active", "obsolete")


def _check_status(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(_VALID_STATUSES)}")
    return v


class BOMBase(BaseModel):
    bom_number: str
    product_id: PydanticObjectId
    name: str = Field(..., max_length=200)
    version: str = Field("1.0", max_length=20)
    revision_date: Optional[datetime] = None
    status: str = "draft"
    total_material_cost: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)


class BOMCreate(BOMBase):
    pass


class BOMUpdate(BaseModel):
    bom_number: Optional[str] = None
    product_id: Optional[PydanticObjectId] = None
    name: Optional[str] = Field(None, max_length=200)
    version: Optional[str] = Field(None, max_length=20)
    revision_date: Optional[datetime] = None
    status: Optional[str] = None
    total_material_cost: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)


class BOMResponse(BOMBase):
    id: str
    tenant_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
