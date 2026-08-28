"""
Warehouse, InventoryItem, InventoryTransaction models — Manufacturing CRM vertical.
"""

from beanie import Indexed
from pydantic import Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Warehouse(BaseDocument):
    """Warehouse / storage location model."""

    name: str = Field(..., max_length=200)
    code: Indexed(str)  # Unique per tenant

    # Location
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

    # Type & Capacity
    warehouse_type: str = "finished_goods"  # raw_materials | finished_goods | wip | rejection | transit
    capacity: Optional[int] = Field(None, gt=0, description="Max capacity (> 0)")
    current_utilization: int = Field(0, ge=0)

    # Management
    manager_id: Optional[PydanticObjectId] = None  # → User
    is_active: bool = True

    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId

    @field_validator("warehouse_type")
    @classmethod
    def validate_warehouse_type(cls, v):
        valid = ("raw_materials", "finished_goods", "wip", "rejection", "transit")
        if v not in valid:
            raise ValueError(f"warehouse_type must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "manufacturing_warehouses"
        indexes = [
            [("tenant_id", 1), ("code", 1)],
        ]


class InventoryItem(BaseDocument):
    """Current stock level for a product in a warehouse."""

    product_id: Indexed(PydanticObjectId)  # → ManufacturingProduct
    warehouse_id: Indexed(PydanticObjectId)  # → Warehouse

    # Quantities
    quantity_on_hand: int = Field(0, ge=0)
    quantity_reserved: int = Field(0, ge=0)
    quantity_available: int = Field(0, ge=0)

    # Lot/Batch
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None

    # Location within warehouse
    location_in_warehouse: Optional[str] = Field(None, description="Aisle/Rack/Bin")

    # Audit
    last_count_date: Optional[datetime] = None
    last_count_quantity: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[float] = Field(None, ge=0)

    tenant_id: Indexed(PydanticObjectId)

    class Settings:
        name = "manufacturing_inventory"
        indexes = [
            [("tenant_id", 1), ("product_id", 1), ("warehouse_id", 1)],
        ]


class InventoryTransaction(BaseDocument):
    """Record of stock movement (receipt, issue, transfer, adjustment)."""

    product_id: Indexed(PydanticObjectId)  # → ManufacturingProduct
    warehouse_id: Indexed(PydanticObjectId)  # → Warehouse

    transaction_type: str  # receipt | issue | transfer | adjustment | return
    quantity: int = Field(..., gt=0, description="Quantity (> 0)")
    unit_cost: Optional[float] = Field(None, ge=0)
    total_value: Optional[float] = Field(None, ge=0)

    # Reference
    reference_type: Optional[str] = None  # production_order | purchase_order | sales_order
    reference_id: Optional[str] = None

    # Transfer-specific
    from_warehouse_id: Optional[PydanticObjectId] = None  # → Warehouse
    to_warehouse_id: Optional[PydanticObjectId] = None  # → Warehouse

    transaction_date: datetime = Field(default_factory=datetime.utcnow)
    recorded_by: Optional[PydanticObjectId] = None  # → User
    notes: Optional[str] = Field(None, max_length=1000)

    tenant_id: Indexed(PydanticObjectId)

    @field_validator("transaction_type")
    @classmethod
    def validate_transaction_type(cls, v):
        valid = ("receipt", "issue", "transfer", "adjustment", "return")
        if v not in valid:
            raise ValueError(f"transaction_type must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "manufacturing_inventory_transactions"
        indexes = [
            [("tenant_id", 1), ("transaction_date", -1)],
            [("tenant_id", 1), ("product_id", 1)],
        ]
