"""
BD Visit model — the central object of the BD field-ops workflow.

A BDVisit is created by a salesperson (or auto-created by an automation rule)
and assigned to a BD owner. It moves through:

  planned  → (manager approves) approved → (BD checks in) in_progress
                                          ↓
                                       (BD checks out) completed
                                          ↓
                                       cancelled / rejected

A companion Task is auto-created so the visit shows up in the unified
/tasks inbox; closing the visit auto-completes the task.

Polymorphic: a visit attaches to a Lead, Opportunity, Account, or Contact.
"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from beanie import Indexed, PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


BDVisitableType = Literal["Lead", "Opportunity", "Account", "Contact"]
BDVisitStatus = Literal[
    "planned", "approved", "in_progress", "completed", "cancelled", "no_show"
]
BDVisitApprovalStatus = Literal[
    "pending", "approved", "rejected", "not_required"
]


class BDVisit(BaseDocument):
    # Polymorphic target
    bd_visitable_type: str = Field(..., description="Lead|Opportunity|Account|Contact")
    bd_visitable_id: PydanticObjectId

    # Classification (FK to BDActivityType picklist)
    activity_type_id: Optional[PydanticObjectId] = None
    activity_type_name: Optional[str] = None  # denormalized for fast list display

    title: str
    description: Optional[str] = None

    # Scheduling
    scheduled_date: datetime
    scheduled_duration_min: int = 30

    # Lifecycle
    status: str = "planned"
    approval_status: str = "pending"
    approved_by: Optional[PydanticObjectId] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    # Check-in (Phase 5 fills GPS; Phase 4 stubs)
    check_in_at: Optional[datetime] = None
    check_in_lat: Optional[float] = None
    check_in_lng: Optional[float] = None
    check_in_accuracy_m: Optional[float] = None

    # Check-out
    check_out_at: Optional[datetime] = None
    check_out_lat: Optional[float] = None
    check_out_lng: Optional[float] = None

    # Outcome
    outcome: Optional[str] = None  # successful|no_show|rescheduled|lead_not_interested|deal_progressed
    outcome_notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_at: Optional[datetime] = None

    # Linked entities
    companion_task_id: Optional[PydanticObjectId] = None
    expense_ids: List[PydanticObjectId] = Field(default_factory=list)  # populated by Phase 6
    photo_file_ids: List[PydanticObjectId] = Field(default_factory=list)  # populated by Phase 5

    # Address snapshot — preserves where the visit was scheduled even if the
    # parent record's address changes later.
    address_snapshot: Optional[Dict[str, Any]] = None

    # Territory context (denormalized; resolved at create time)
    territory_id: Optional[PydanticObjectId] = None
    region_id: Optional[PydanticObjectId] = None

    # Assignment & approval routing
    owner_id: PydanticObjectId  # the BD user (indexed via Settings)
    reporting_manager_id: Optional[PydanticObjectId] = None

    # Tenant + audit
    created_by: PydanticObjectId
    tenant_id: PydanticObjectId  # indexed via Settings
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Industry-specific extensions (e.g. travel may store room counts on a
    # hotel inspection, healthcare may store compliance scores). All
    # industries put their extras here; core schema stays clean.
    industry_data: Dict[str, Any] = Field(default_factory=dict)

    class Settings:
        name = "bd_visits"
        indexes = [
            [("tenant_id", 1), ("owner_id", 1), ("scheduled_date", -1)],
            [("tenant_id", 1), ("status", 1)],
            [("tenant_id", 1), ("reporting_manager_id", 1), ("approval_status", 1)],
            [("tenant_id", 1), ("territory_id", 1)],
            [("bd_visitable_type", 1), ("bd_visitable_id", 1)],
        ]
