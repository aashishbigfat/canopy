"""
Phase 6 — Opportunity workflow Beanie documents.

Vouchers, Departures, Ledger accounts, Claims, Handover, External lead capture.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class Voucher(Document):
    """Voucher tied to opportunity (booking confirmation, hotel voucher, etc.)."""
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    voucher_type: str = "general"   # general | hotel | flight | activity | transfer
    voucher_number: Optional[str] = None
    title: Optional[str] = None
    body_html: Optional[str] = None
    pdf_url: Optional[str] = None

    issued_to: Optional[str] = None  # supplier name / customer name
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None

    status: str = "draft"           # draft | issued | redeemed | cancelled

    created_by: Indexed(PydanticObjectId)
    last_modified_by_id: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "vouchers"


class Departure(Document):
    """Departure event for an opportunity (travel-vertical)."""
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    departure_date: datetime
    return_date: Optional[datetime] = None
    pax_count: int = 0
    departure_city: Optional[str] = None
    return_city: Optional[str] = None

    status: str = "scheduled"        # scheduled | held | held_book | booked | cancelled
    hold_reason: Optional[str] = None
    booked_at: Optional[datetime] = None
    booked_by: Optional[PydanticObjectId] = None

    is_agent_departure: bool = False
    agent_id: Optional[PydanticObjectId] = None

    notes: Optional[str] = None

    created_by: Indexed(PydanticObjectId)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "departures"


class LedgerAccount(Document):
    """Ledger account/transaction tied to opportunity (debit/credit, supplier payments)."""
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    entry_type: str                   # debit | credit
    amount: float
    currency: str = "INR"
    description: Optional[str] = None
    counterparty: Optional[str] = None
    reference_no: Optional[str] = None
    entry_date: datetime = Field(default_factory=datetime.utcnow)

    created_by: Indexed(PydanticObjectId)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "ledger_accounts"


class OpportunityClaim(Document):
    """Claim raised against an opportunity (cancellation/refund/dispute)."""
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    claim_type: str = "general"
    description: Optional[str] = None
    amount: Optional[float] = None
    status: str = "open"              # open | approved | rejected | resolved

    raised_by: Indexed(PydanticObjectId)
    resolved_by: Optional[PydanticObjectId] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "opportunity_claims"


class HandoverRequest(Document):
    """Hand off opportunity from one user (BD) to another (Operations)."""
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    from_user_id: Indexed(PydanticObjectId)
    to_user_id: Indexed(PydanticObjectId)
    reason: Optional[str] = None
    status: str = "pending"           # pending | accepted | rejected
    handover_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "handover_requests"


class ExternalLead(Document):
    """Inbound external lead (Facebook, web form, public capture)."""
    tenant_id: Indexed(PydanticObjectId)
    source: Indexed(str)              # facebook | webform | api | manual_capture
    source_ref: Optional[str] = None  # external id (FB lead id etc.)

    raw_payload: Dict[str, Any] = Field(default_factory=dict)

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None

    is_processed: bool = False
    processed_lead_id: Optional[PydanticObjectId] = None
    processed_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "external_leads"


class OpportunityTeamMember(Document):
    """Per-opportunity team membership."""
    opportunity_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)
    role: Optional[str] = None        # support | bd | ops | other
    tenant_id: Indexed(PydanticObjectId)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "opportunity_team_members"


class OpportunityPaymentSchedule(Document):
    """Payment schedule line tied to opportunity (sent/received splits)."""
    opportunity_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    direction: str                    # outgoing | incoming
    amount: float
    currency: str = "INR"
    due_date: Optional[datetime] = None
    paid_on: Optional[datetime] = None
    status: str = "pending"           # pending | paid | overdue
    notes: Optional[str] = None

    created_by: Indexed(PydanticObjectId)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "opportunity_payment_schedules"
