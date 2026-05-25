"""Programs API — education CRM vertical."""
from app.api.factories.crud_router import make_crud_router
from app.models.education.program import Program
from app.schemas.education.program import (
    ProgramCreate,
    ProgramResponse,
    ProgramUpdate,
)

# Program has no owner_id field (institution-level resource), so disable ownership.
router = make_crud_router(
    model=Program,
    create_schema=ProgramCreate,
    update_schema=ProgramUpdate,
    response_schema=ProgramResponse,
    module_name="programs",
    permission_prefix="program",
    ownership=False,
)
