"""
BillOfMaterials + BOMItem models — Manufacturing CRM vertical.
"""

from beanie import Indexed
from pydantic import Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class BOMItem(BaseDocument):
    """Individual component line in a Bill of Materials."""

    bom_id: Indexed(PydanticObjectId)  # → BillOfMaterials
    component_product_id: Indexed(PydanticObjectId)  # → ManufacturingProduct

    quantity_required: float = Field(..., gt=0, description="Quantity required (> 0)")
    unit_of_measure: str = "piece"
    unit_cost: Optional[float] = Field(None, ge=0)
    total_cost: Optional[float] = Field(None, ge=0)
    is_critical: bool = False
    supplier_id: Optional[PydanticObjectId] = None  # Preferred supplier
    sort_order: int = Field(0, ge=0)
    notes: Optional[str] = Field(None, max_length=500)

    tenant_id: Indexed(PydanticObjectId)

    class Settings:
        name = "manufacturing_bom_items"
        indexes = [
            [("tenant_id", 1), ("bom_id", 1)],
        ]


class BillOfMaterials(BaseDocument):
    """Bill of Materials (BOM) for a manufactured product."""

    bom_number: Indexed(str)  # Auto-generated
    product_id: Indexed(PydanticObjectId)  # → ManufacturingProduct

    name: str = Field(..., max_length=200)
    version: str = Field("1.0", max_length=20)
    revision_date: Optional[datetime] = None
    status: str = "draft"  # draft | active | obsolete

    total_material_cost: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)

    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("draft", "active", "obsolete")
        if v not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v

    class Settings:
        name = "manufacturing_boms"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("bom_number", 1)],
            [("tenant_id", 1), ("product_id", 1)],
        ]
