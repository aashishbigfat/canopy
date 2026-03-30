"""
Opportunity Financial models - Costing, Payment Schedule
"""
from beanie import Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument


class CostingLineItem(BaseModel):
    """A single costing line item (embedded in OpportunityCosting)"""
    item_type: str  # "Land Package", "Visa", "Tax", "Miscellaneous", etc.
    supplier_id: Optional[str] = None  # Supplier ObjectId as string
    supplier_name: Optional[str] = None  # Denormalized for display
    destination_ids: List[str] = Field(default_factory=list)  # Destination ObjectIds
    destination_names: List[str] = Field(default_factory=list)  # Denormalized for display
    amount: float = 0.0  # Sell amount (what customer pays)
    cost_amount: float = 0.0  # Cost amount (what we pay supplier)


class OpportunityCosting(BaseDocument):
    """Costing sheet for an opportunity - stores line items and summary"""

    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    # Selected item types (e.g. ["Land Package", "Visa", "Tax", "Miscellaneous"])
    selected_item_types: List[str] = Field(default_factory=list)

    # Line items
    items: List[CostingLineItem] = Field(default_factory=list)

    # Summary (auto-calculated on save)
    total_amount: float = 0.0   # Sum of sell amounts
    total_cost: float = 0.0     # Sum of cost amounts
    profit: float = 0.0          # total_amount - total_cost
    profit_percent: float = 0.0  # (profit / total_amount) * 100

    class Settings:
        name = "opportunity_costings"
        indexes = [
            [("opportunity_id", 1), ("tenant_id", 1)],
        ]


# Available item types for costing
# Tax and Miscellaneous are fixed rows (always present, not user-removable)
COSTING_ITEM_TYPES = [
    "Air Ticket",
    "Visa",
    "Accommodation",
    "Site Seeing",
    "Airport Transfer",
    "Transport",
    "Package",
    "Land Package",
    "Meal",
    "Courier Charges",
    "Insurance",
    "Departure",
]

# Fixed row types (always present, cannot be added/removed by user)
FIXED_ITEM_TYPES = ["Tax", "Miscellaneous"]


class PaymentScheduleItem(BaseDocument):
    """A single payment milestone for an opportunity"""

    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    # Payment details
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    amount: float = 0.0
    status: str = "Pending"  # "Pending", "Paid"
    payment_method: Optional[str] = None  # Cash, Card, Bank Transfer, UPI, etc.
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None

    # Audit
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    class Settings:
        name = "payment_schedule_items"
        indexes = [
            [("opportunity_id", 1), ("tenant_id", 1)],
        ]
