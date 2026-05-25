"""Enrollments API — education CRM vertical."""
from app.api.factories.crud_router import make_crud_router
from app.models.education.enrollment import Enrollment
from app.schemas.education.enrollment import (
    EnrollmentCreate,
    EnrollmentResponse,
    EnrollmentUpdate,
)

# Enrollment has no owner_id field — institutional resource.
router = make_crud_router(
    model=Enrollment,
    create_schema=EnrollmentCreate,
    update_schema=EnrollmentUpdate,
    response_schema=EnrollmentResponse,
    module_name="enrollments",
    permission_prefix="enrollment",
    ownership=False,
)
