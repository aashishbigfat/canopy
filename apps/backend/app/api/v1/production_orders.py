"""Production Order API — manufacturing CRM vertical."""
from app.api.factories.crud_router import make_crud_router
from app.models.manufacturing.production_order import ProductionOrder
from app.schemas.manufacturing.production_order import (
    ProductionOrderCreate,
    ProductionOrderResponse,
    ProductionOrderUpdate,
)

router = make_crud_router(
    model=ProductionOrder,
    create_schema=ProductionOrderCreate,
    update_schema=ProductionOrderUpdate,
    response_schema=ProductionOrderResponse,
    module_name="production_orders",
    permission_prefix="production_order",
)
