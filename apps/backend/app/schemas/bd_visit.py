"""Pydantic schemas for the BD Visit API."""
from datetime import datetime
from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


class BDVisitCreate(BaseModel):
    bd_visitable_type: Literal["Lead", "Opportunity", "Account", "Contact"]
    bd_visitable_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_date: datetime
    scheduled_duration_min: int = 30
    activity_type_id: Optional[str] = None
    owner_id: Optional[str] = None  # defaults to parent's bd_owner_id, else current_user
    reporting_manager_id: Optional[str] = None
    industry_data: Optional[Dict[str, Any]] = None


class BDVisitUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    scheduled_duration_min: Optional[int] = None
    activity_type_id: Optional[str] = None
    owner_id: Optional[str] = None
    industry_data: Optional[Dict[str, Any]] = None


class BDVisitApprove(BaseModel):
    notes: Optional[str] = None


class BDVisitReject(BaseModel):
    reason: str = Field(..., min_length=1)


class BDVisitCheckIn(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    accuracy_m: Optional[float] = None


class BDVisitCheckOut(BaseModel):
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_at: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class BDVisitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    bd_visitable_type: str
    bd_visitable_id: str
    activity_type_id: Optional[str] = None
    activity_type_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    scheduled_date: datetime
    scheduled_duration_min: int = 30
    status: str
    approval_status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    check_in_at: Optional[datetime] = None
    check_in_lat: Optional[float] = None
    check_in_lng: Optional[float] = None
    check_in_accuracy_m: Optional[float] = None
    check_out_at: Optional[datetime] = None
    check_out_lat: Optional[float] = None
    check_out_lng: Optional[float] = None
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_at: Optional[datetime] = None
    companion_task_id: Optional[str] = None
    expense_ids: List[str] = []
    photo_file_ids: List[str] = []
    address_snapshot: Optional[Dict[str, Any]] = None
    territory_id: Optional[str] = None
    region_id: Optional[str] = None
    owner_id: str
    owner_name: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    parent_name: Optional[str] = None
    industry_data: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class BDVisitListResponse(BaseModel):
    visits: List[BDVisitResponse]
    total: int
    page: int
    per_page: int
