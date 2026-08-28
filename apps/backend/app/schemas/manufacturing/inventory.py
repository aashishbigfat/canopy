"""Inventory schemas for manufacturing CRM."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, Field


class InventoryItemBase(BaseModel):
    product_id: PydanticObjectId
    warehouse_id: PydanticObjectId
    quantity_on_hand: int = Field(0, ge=0)
    quantity_reserved: int = Field(0, ge=0)
    quantity_available: int = Field(0, ge=0)
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    location_in_warehouse: Optional[str] = None
    last_count_date: Optional[datetime] = None
    last_count_quantity: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[float] = Field(None, ge=0)


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    product_id: Optional[PydanticObjectId] = None
    warehouse_id: Optional[PydanticObjectId] = None
    quantity_on_hand: Optional[int] = Field(None, ge=0)
    quantity_reserved: Optional[int] = Field(None, ge=0)
    quantity_available: Optional[int] = Field(None, ge=0)
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    location_in_warehouse: Optional[str] = None
    last_count_date: Optional[datetime] = None
    last_count_quantity: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[float] = Field(None, ge=0)


class InventoryItemResponse(InventoryItemBase):
    id: str
    tenant_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
