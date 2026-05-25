"""Program schemas for education CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


_VALID_DEGREES = ("certificate", "diploma", "bachelors", "masters", "doctorate", "professional")


def _check_degree(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_DEGREES:
        raise ValueError(f"degree_type must be one of: {', '.join(_VALID_DEGREES)}")
    return v


class ProgramBase(BaseModel):
    name: str = Field(..., max_length=200)
    code: str
    department: Optional[str] = Field(None, max_length=200)
    school: Optional[str] = Field(None, max_length=200)
    degree_type: str
    duration_months: int = Field(..., ge=1)
    credits_required: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=5000)
    learning_outcomes: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    tuition_fee: Optional[float] = Field(None, ge=0)
    currency: str = "USD"
    intake_capacity: Optional[int] = Field(None, ge=1)
    is_active: bool = True
    is_online: bool = False
    accreditation_body: Optional[str] = None
    accreditation_status: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("degree_type")
    @classmethod
    def _degree(cls, v):
        return _check_degree(v)


class ProgramCreate(ProgramBase):
    pass


class ProgramUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    code: Optional[str] = None
    department: Optional[str] = Field(None, max_length=200)
    school: Optional[str] = Field(None, max_length=200)
    degree_type: Optional[str] = None
    duration_months: Optional[int] = Field(None, ge=1)
    credits_required: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=5000)
    learning_outcomes: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    tuition_fee: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    intake_capacity: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    is_online: Optional[bool] = None
    accreditation_body: Optional[str] = None
    accreditation_status: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("degree_type")
    @classmethod
    def _degree(cls, v):
        return _check_degree(v)


class ProgramResponse(ProgramBase):
    id: str
    tenant_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
