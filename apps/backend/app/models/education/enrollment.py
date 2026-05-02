"""
Enrollment, Course, Faculty, AcademicTerm, Scholarship models — Education CRM vertical.
"""

from beanie import Indexed
from pydantic import Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Course(BaseDocument):
    """Academic course model."""

    name: str = Field(..., max_length=200)
    code: Indexed(str)  # e.g. "CS101"
    program_id: Indexed(PydanticObjectId)  # → Program
    credits: int = Field(..., ge=1, description="Credits (≥ 1)")
    contact_hours: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=5000)
    syllabus_url: Optional[str] = None
    course_type: str = "core"  # core | elective | lab | seminar | online
    max_capacity: Optional[int] = Field(None, ge=1)
    current_enrollment: int = Field(0, ge=0)
    prerequisites: List[str] = Field(default_factory=list)
    is_active: bool = True

    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("course_type")
    @classmethod
    def validate_course_type(cls, v):
        valid = ("core", "elective", "lab", "seminar", "online")
        if v not in valid:
            raise ValueError(f"course_type must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "education_courses"
        indexes = [
            [(("tenant_id", 1), ("code", 1))],
            [(("tenant_id", 1), ("program_id", 1))],
        ]


class Enrollment(BaseDocument):
    """Student enrollment in a course."""

    student_contact_id: Indexed(PydanticObjectId)  # → Contact
    course_id: Indexed(PydanticObjectId)  # → Course
    academic_term_id: Optional[PydanticObjectId] = None  # → AcademicTerm

    enrollment_date: datetime = Field(default_factory=datetime.utcnow)
    drop_date: Optional[datetime] = None

    status: str = "enrolled"  # enrolled | dropped | completed | failed | withdrawn | auditing
    grade: Optional[str] = None  # A | B | C | D | F | I | W
    grade_points: Optional[float] = Field(None, ge=0.0, le=4.0)
    attendance_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)

    # Financial
    tuition_status: str = "unpaid"  # paid | partial | unpaid | waived
    tuition_amount: Optional[float] = Field(None, ge=0)
    amount_paid: Optional[float] = Field(None, ge=0)
    balance_due: Optional[float] = Field(None, ge=0)

    faculty_id: Optional[PydanticObjectId] = None  # → Faculty
    section: Optional[str] = None  # A, B, C

    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("enrolled", "dropped", "completed", "failed", "withdrawn", "auditing")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    @field_validator("grade")
    @classmethod
    def validate_grade(cls, v):
        valid = ("A", "B", "C", "D", "F", "I", "W")
        if v is not None and v not in valid:
            raise ValueError(f"grade must be one of: {', '.join(valid)}")
        return v

    @field_validator("tuition_status")
    @classmethod
    def validate_tuition_status(cls, v):
        valid = ("paid", "partial", "unpaid", "waived")
        if v not in valid:
            raise ValueError(f"tuition_status must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "education_enrollments"
        indexes = [
            [(("tenant_id", 1), ("student_contact_id", 1))],
            [(("tenant_id", 1), ("course_id", 1))],
            [(("tenant_id", 1), ("status", 1))],
        ]


class Faculty(BaseDocument):
    """Faculty / instructor model."""

    name: str = Field(..., max_length=200)
    employee_id: Indexed(str)
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = Field(None, max_length=200)
    designation: Optional[str] = Field(None, max_length=200)
    specialization: List[str] = Field(default_factory=list)
    qualification: Optional[str] = Field(None, max_length=200)
    experience_years: Optional[int] = Field(None, ge=0)
    joining_date: Optional[datetime] = None
    is_active: bool = True
    is_hod: bool = False  # Head of Department
    contact_id: Optional[PydanticObjectId] = None  # → Contact (CRM link)

    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    class Settings:
        name = "education_faculty"
        indexes = [
            [(("tenant_id", 1), ("employee_id", 1))],
            [(("tenant_id", 1), ("department", 1))],
        ]


class AcademicTerm(BaseDocument):
    """Academic term / semester model."""

    name: str = Field(..., max_length=100)  # "Fall 2026", "Spring 2027"
    term_type: str = "semester"  # semester | trimester | quarter | annual
    start_date: datetime
    end_date: datetime
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    is_current: bool = False
    notes: Optional[str] = Field(None, max_length=500)

    tenant_id: Indexed(PydanticObjectId)

    @field_validator("term_type")
    @classmethod
    def validate_term_type(cls, v):
        valid = ("semester", "trimester", "quarter", "annual")
        if v not in valid:
            raise ValueError(f"term_type must be one of: {', '.join(valid)}")
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        if self.registration_start and self.registration_end:
            if self.registration_end <= self.registration_start:
                raise ValueError("registration_end must be after registration_start")
        return self

    class Settings:
        name = "education_academic_terms"
        indexes = [
            [(("tenant_id", 1), ("is_current", 1))],
        ]


class Scholarship(BaseDocument):
    """Scholarship model."""

    name: str = Field(..., max_length=200)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=2000)
    eligibility_criteria: Optional[str] = Field(None, max_length=2000)

    scholarship_type: str  # merit | need | athletic | departmental
    amount: float = Field(..., ge=0)
    currency: str = "USD"
    is_recurring: bool = False

    max_recipients: Optional[int] = Field(None, ge=1)
    min_gpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    min_test_score: Optional[float] = None
    application_deadline: Optional[datetime] = None

    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    program_ids: List[PydanticObjectId] = Field(default_factory=list)
    is_active: bool = True

    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("scholarship_type")
    @classmethod
    def validate_scholarship_type(cls, v):
        valid = ("merit", "need", "athletic", "departmental")
        if v not in valid:
            raise ValueError(f"scholarship_type must be one of: {', '.join(valid)}")
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.valid_from and self.valid_to and self.valid_to <= self.valid_from:
            raise ValueError("valid_to must be after valid_from")
        return self

    class Settings:
        name = "education_scholarships"
        indexes = [
            [(("tenant_id", 1), ("scholarship_type", 1))],
            [(("tenant_id", 1), ("is_active", 1))],
        ]
