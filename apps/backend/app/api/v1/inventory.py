"""Inventory API — manufacturing CRM vertical (stock-on-hand per warehouse)."""
from app.api.factories.crud_router import make_crud_router
from app.models.manufacturing.inventory import InventoryItem
from app.schemas.manufacturing.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
)

# InventoryItem has no owner_id / created_by — warehouse-level resource.
router = make_crud_router(
    model=InventoryItem,
    create_schema=InventoryItemCreate,
    update_schema=InventoryItemUpdate,
    response_schema=InventoryItemResponse,
    module_name="inventory",
    permission_prefix="inventory",
    ownership=False,
)
