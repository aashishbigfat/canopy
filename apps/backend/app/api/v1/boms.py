"""BOM API — manufacturing CRM vertical."""
from app.api.factories.crud_router import make_crud_router
from app.models.manufacturing.bom import BillOfMaterials
from app.schemas.manufacturing.bom import BOMCreate, BOMResponse, BOMUpdate

# BillOfMaterials has no owner_id field, so disable ownership.
router = make_crud_router(
    model=BillOfMaterials,
    create_schema=BOMCreate,
    update_schema=BOMUpdate,
    response_schema=BOMResponse,
    module_name="bom",
    permission_prefix="bom",
    ownership=False,
)
