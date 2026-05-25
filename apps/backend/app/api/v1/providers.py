"""Provider API — healthcare CRM vertical."""
from app.api.factories.crud_router import make_crud_router
from app.models.healthcare.provider import Provider
from app.schemas.healthcare.provider import (
    ProviderCreate,
    ProviderResponse,
    ProviderUpdate,
)

router = make_crud_router(
    model=Provider,
    create_schema=ProviderCreate,
    update_schema=ProviderUpdate,
    response_schema=ProviderResponse,
    module_name="providers",
    permission_prefix="provider",
)
