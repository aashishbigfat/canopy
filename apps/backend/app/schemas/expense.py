"""Pydantic schemas for the Expense API."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    category_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    incurred_at: datetime
    bd_visit_id: Optional[str] = None
    bd_visitable_type: Optional[str] = None  # only if no bd_visit_id
    bd_visitable_id: Optional[str] = None
    industry_data: Optional[Dict[str, Any]] = None


class ExpenseUpdate(BaseModel):
    category_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    incurred_at: Optional[datetime] = None
    bd_visit_id: Optional[str] = None
    industry_data: Optional[Dict[str, Any]] = None


class ExpenseApprove(BaseModel):
    notes: Optional[str] = None


class ExpenseReject(BaseModel):
    reason: str = Field(..., min_length=1)


class ExpenseReimburse(BaseModel):
    reference: Optional[str] = None


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    amount: float
    currency: str
    incurred_at: datetime
    bd_visit_id: Optional[str] = None
    bd_visit_title: Optional[str] = None
    bd_visitable_type: Optional[str] = None
    bd_visitable_id: Optional[str] = None
    receipt_file_ids: List[str] = []
    status: str
    submitted_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    reimbursed_at: Optional[datetime] = None
    reimbursed_by: Optional[str] = None
    reimbursement_reference: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    owner_id: str
    owner_name: Optional[str] = None
    industry_data: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class ExpenseListResponse(BaseModel):
    expenses: List[ExpenseResponse]
    total: int
    page: int
    per_page: int


class ExpenseSummary(BaseModel):
    """Summary by status / category for the current user."""
    total_amount: float
    by_status: Dict[str, float]
    by_category: Dict[str, float]
    count_pending_approval: int
