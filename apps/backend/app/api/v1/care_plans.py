"""Care Plans API — healthcare CRM vertical."""
from app.api.factories.crud_router import make_crud_router
from app.models.healthcare.care_plan import CarePlan
from app.schemas.healthcare.care_plan import (
    CarePlanCreate,
    CarePlanResponse,
    CarePlanUpdate,
)

router = make_crud_router(
    model=CarePlan,
    create_schema=CarePlanCreate,
    update_schema=CarePlanUpdate,
    response_schema=CarePlanResponse,
    module_name="care_plans",
    permission_prefix="care_plan",
)
