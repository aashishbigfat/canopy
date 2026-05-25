"""
Expense model — BD field-cost claims.

Lifecycle:
    draft → (submit) submitted → (manager approves) approved → (finance) reimbursed
                                       ↓
                                    rejected

If the expense category's `auto_approve_under` covers the amount, the service
short-circuits straight to `approved` on submit (no manager queue).

Polymorphic linkage:
- bd_visit_id: optional — the visit this expense was incurred during
- bd_visitable_type / bd_visitable_id: denormalized parent for reporting
  (e.g. an expense linked to a Lead even if there's no specific visit yet)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class Expense(BaseDocument):
    # Classification
    category_id: Optional[PydanticObjectId] = None  # → ExpenseCategory picklist
    category_name: Optional[str] = None  # denormalized for fast list display

    title: str
    description: Optional[str] = None
    amount: float
    currency: str = "INR"
    incurred_at: datetime

    # Linked visit (optional — standalone expenses are allowed)
    bd_visit_id: Optional[PydanticObjectId] = None
    # Denormalized parent for cross-entity reporting
    bd_visitable_type: Optional[str] = None
    bd_visitable_id: Optional[PydanticObjectId] = None

    # Receipts (File model ids; uploaded via the same FileService as visit photos)
    receipt_file_ids: List[PydanticObjectId] = Field(default_factory=list)

    # Lifecycle
    status: str = "draft"  # draft|submitted|approved|rejected|reimbursed
    submitted_at: Optional[datetime] = None
    approved_by: Optional[PydanticObjectId] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    reimbursed_at: Optional[datetime] = None
    reimbursed_by: Optional[PydanticObjectId] = None
    reimbursement_reference: Optional[str] = None

    # Approval routing (denormalized so the queue query is one indexed lookup)
    reporting_manager_id: Optional[PydanticObjectId] = None

    # Ownership
    owner_id: PydanticObjectId
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    tenant_id: PydanticObjectId

    # Industry-specific extras
    industry_data: Dict[str, Any] = Field(default_factory=dict)

    class Settings:
        name = "expenses"
        indexes = [
            [("tenant_id", 1), ("owner_id", 1), ("incurred_at", -1)],
            [("tenant_id", 1), ("reporting_manager_id", 1), ("status", 1)],
            [("tenant_id", 1), ("bd_visit_id", 1)],
            [("tenant_id", 1), ("status", 1)],
        ]
