"""Appointment API — healthcare CRM vertical."""
from app.api.factories.crud_router import make_crud_router
from app.models.healthcare.appointment import Appointment
from app.schemas.healthcare.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)

# Appointment has no owner_id field (only created_by + tenant_id), so disable ownership.
router = make_crud_router(
    model=Appointment,
    create_schema=AppointmentCreate,
    update_schema=AppointmentUpdate,
    response_schema=AppointmentResponse,
    module_name="appointments",
    permission_prefix="appointment",
    ownership=False,
)
