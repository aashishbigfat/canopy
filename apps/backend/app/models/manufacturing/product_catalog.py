"""
ManufacturingProduct model — Manufacturing CRM vertical.
"""

from beanie import Indexed
from pydantic import Field, field_validator
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class ManufacturingProduct(BaseDocument):
    """Product catalog model for manufacturing CRM."""

    sku: Indexed(str)  # Unique per tenant
    name: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    category: Optional[str] = Field(None, max_length=200)
    sub_category: Optional[str] = Field(None, max_length=200)

    # Pricing
    unit_of_measure: str = "piece"
    base_price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    currency: str = "USD"

    # Production
    lead_time_days: Optional[int] = Field(None, ge=0, description="Manufacturing lead time in days")
    min_order_quantity: Optional[int] = Field(None, ge=1)
    max_order_quantity: Optional[int] = None

    # Physical
    weight: Optional[float] = Field(None, ge=0)
    dimensions: Optional[Dict[str, Any]] = Field(None, description='{"length": ..., "width": ..., "height": ..., "unit": "cm"}')

    # Inventory
    safety_stock_level: Optional[int] = Field(None, ge=0)
    reorder_point: Optional[int] = Field(None, ge=0)

    # Status
    is_configurable: bool = False  # Custom-built products
    is_active: bool = True
    is_discontinued: bool = False

    # Certifications
    certifications: List[str] = Field(default_factory=list, description='e.g. ["ISO 9001", "CE"]')

    # BOM link
    bom_id: Optional[PydanticObjectId] = None  # → BillOfMaterials

    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("unit_of_measure")
    @classmethod
    def validate_uom(cls, v):
        valid = ("piece", "kg", "liter", "meter", "box", "ton", "set")
        if v.lower() not in valid:
            raise ValueError(f"unit_of_measure must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "manufacturing_products"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("sku", 1)],
            [("tenant_id", 1), ("category", 1)],
        ]
