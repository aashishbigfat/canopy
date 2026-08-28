"""Enrollment schemas for education CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, Field, field_validator


_VALID_STATUSES = ("enrolled", "dropped", "completed", "failed", "withdrawn", "auditing")
_VALID_GRADES = ("A", "B", "C", "D", "F", "I", "W")
_VALID_TUITION = ("paid", "partial", "unpaid", "waived")


def _check_status(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(_VALID_STATUSES)}")
    return v


def _check_grade(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_GRADES:
        raise ValueError(f"grade must be one of: {', '.join(_VALID_GRADES)}")
    return v


def _check_tuition(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in _VALID_TUITION:
        raise ValueError(f"tuition_status must be one of: {', '.join(_VALID_TUITION)}")
    return v


class EnrollmentBase(BaseModel):
    student_contact_id: PydanticObjectId
    course_id: PydanticObjectId
    academic_term_id: Optional[PydanticObjectId] = None
    enrollment_date: datetime
    drop_date: Optional[datetime] = None
    status: str = "enrolled"
    grade: Optional[str] = None
    grade_points: Optional[float] = Field(None, ge=0.0, le=4.0)
    attendance_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    tuition_status: str = "unpaid"
    tuition_amount: Optional[float] = Field(None, ge=0)
    amount_paid: Optional[float] = Field(None, ge=0)
    balance_due: Optional[float] = Field(None, ge=0)
    faculty_id: Optional[PydanticObjectId] = None
    section: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)

    @field_validator("grade")
    @classmethod
    def _grade(cls, v):
        return _check_grade(v)

    @field_validator("tuition_status")
    @classmethod
    def _tuition(cls, v):
        return _check_tuition(v)


class EnrollmentCreate(EnrollmentBase):
    pass


class EnrollmentUpdate(BaseModel):
    student_contact_id: Optional[PydanticObjectId] = None
    course_id: Optional[PydanticObjectId] = None
    academic_term_id: Optional[PydanticObjectId] = None
    enrollment_date: Optional[datetime] = None
    drop_date: Optional[datetime] = None
    status: Optional[str] = None
    grade: Optional[str] = None
    grade_points: Optional[float] = Field(None, ge=0.0, le=4.0)
    attendance_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    tuition_status: Optional[str] = None
    tuition_amount: Optional[float] = Field(None, ge=0)
    amount_paid: Optional[float] = Field(None, ge=0)
    balance_due: Optional[float] = Field(None, ge=0)
    faculty_id: Optional[PydanticObjectId] = None
    section: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        return _check_status(v)

    @field_validator("grade")
    @classmethod
    def _grade(cls, v):
        return _check_grade(v)

    @field_validator("tuition_status")
    @classmethod
    def _tuition(cls, v):
        return _check_tuition(v)


class EnrollmentResponse(EnrollmentBase):
    id: str
    tenant_id: str
    created_by: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
