"""Care Plan schemas for healthcare CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, Field, field_validator


_VALID_STATUSES = ("active", "completed", "on_hold", "discontinued")


def _check_status(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(_VALID_STATUSES)}")
    return v


class CarePlanBase(BaseModel):
    patient_id: PydanticObjectId
    provider_id: Optional[PydanticObjectId] = None
    plan_name: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: str = "active"
    start_date: datetime
    target_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    diagnosis_codes: List[str] = Field(default_factory=list)
    goals: List[Dict[str, Any]] = Field(default_factory=list)
    interventions: List[Dict[str, Any]] = Field(default_factory=list)
    medications: List[Dict[str, Any]] = Field(default_factory=list)
    follow_up_schedule: List[Dict[str, Any]] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)


class CarePlanCreate(CarePlanBase):
    pass


class CarePlanUpdate(BaseModel):
    patient_id: Optional[PydanticObjectId] = None
    provider_id: Optional[PydanticObjectId] = None
    plan_name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    target_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    diagnosis_codes: Optional[List[str]] = None
    goals: Optional[List[Dict[str, Any]]] = None
    interventions: Optional[List[Dict[str, Any]]] = None
    medications: Optional[List[Dict[str, Any]]] = None
    follow_up_schedule: Optional[List[Dict[str, Any]]] = None
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)


class CarePlanResponse(CarePlanBase):
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
