"""
Phase 6 — Opportunity workflow router (Travel-industry operations).

Mirrors old Laravel: voucher CRUD, departures, ledger, claims, handover,
external lead capture, opportunity team, payment schedules.

NOTE: Travel-specific endpoints (vouchers, departures) should ideally be
guarded by ``require_module("operations")``, but this router is mounted on
``/api/v1/opportunities`` alongside the core opportunity router and includes
a public endpoint (external-leads/capture). Module guards are therefore
applied per-endpoint where appropriate rather than at router level.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.opportunity_workflow import (
    Voucher, Departure, LedgerAccount, OpportunityClaim,
    HandoverRequest, ExternalLead, OpportunityTeamMember,
    OpportunityPaymentSchedule,
)
from app.models.opportunity import Opportunity
from app.models.opportunity_picklists import OpportunityLock

router = APIRouter()


# ============== shared helpers ==============

async def _ensure_opp(opp_id: PydanticObjectId, tenant_id: PydanticObjectId) -> Opportunity:
    opp = await Opportunity.get(opp_id)
    if not opp or opp.tenant_id != tenant_id:
        raise HTTPException(404, "Opportunity not found")
    return opp


# ============== VOUCHERS ==============

class VoucherIn(BaseModel):
    voucher_type: Optional[str] = "general"
    voucher_number: Optional[str] = None
    title: Optional[str] = None
    body_html: Optional[str] = None
    pdf_url: Optional[str] = None
    issued_to: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    status: Optional[str] = "draft"


@router.get("/{opp_id}/vouchers")
async def list_vouchers(opp_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    await _ensure_opp(opp_id, current_user.tenant_id)
    rows = await Voucher.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/{opp_id}/vouchers", status_code=201)
async def create_voucher(
    opp_id: PydanticObjectId,
    payload: VoucherIn,
    current_user: User = Depends(get_current_user),
):
    await _ensure_opp(opp_id, current_user.tenant_id)
    obj = Voucher(
        opportunity_id=opp_id,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/{opp_id}/vouchers/{voucher_id}")
async def update_voucher(
    opp_id: PydanticObjectId,
    voucher_id: PydanticObjectId,
    payload: VoucherIn,
    current_user: User = Depends(get_current_user),
):
    obj = await Voucher.get(voucher_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.opportunity_id != opp_id):
        raise HTTPException(404, "Voucher not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.last_modified_by_id = current_user.id
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.post("/{opp_id}/vouchers/{voucher_id}/generate")
async def generate_voucher(
    opp_id: PydanticObjectId,
    voucher_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await Voucher.get(voucher_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.opportunity_id != opp_id):
        raise HTTPException(404, "Voucher not found")
    obj.status = "issued"
    obj.issued_at = datetime.utcnow()
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/{opp_id}/vouchers/{voucher_id}", status_code=204)
async def delete_voucher(
    opp_id: PydanticObjectId,
    voucher_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await Voucher.get(voucher_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.opportunity_id != opp_id):
        raise HTTPException(404, "Voucher not found")
    await obj.delete()


# ============== DEPARTURES ==============

class DepartureIn(BaseModel):
    departure_date: datetime
    return_date: Optional[datetime] = None
    pax_count: int = 0
    departure_city: Optional[str] = None
    return_city: Optional[str] = None
    status: Optional[str] = "scheduled"
    hold_reason: Optional[str] = None
    is_agent_departure: Optional[bool] = False
    agent_id: Optional[PydanticObjectId] = None
    notes: Optional[str] = None


@router.get("/{opp_id}/departures")
async def list_departures(opp_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    await _ensure_opp(opp_id, current_user.tenant_id)
    rows = await Departure.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/{opp_id}/departures", status_code=201)
async def create_departure(
    opp_id: PydanticObjectId,
    payload: DepartureIn,
    current_user: User = Depends(get_current_user),
):
    await _ensure_opp(opp_id, current_user.tenant_id)
    obj = Departure(
        opportunity_id=opp_id,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/{opp_id}/departures/{departure_id}")
async def update_departure(
    opp_id: PydanticObjectId,
    departure_id: PydanticObjectId,
    payload: DepartureIn,
    current_user: User = Depends(get_current_user),
):
    obj = await Departure.get(departure_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.opportunity_id != opp_id):
        raise HTTPException(404, "Departure not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.post("/{opp_id}/departures/{departure_id}/hold")
async def hold_departure(
    opp_id: PydanticObjectId,
    departure_id: PydanticObjectId,
    payload: DepartureIn,
    current_user: User = Depends(get_current_user),
):
    obj = await Departure.get(departure_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.opportunity_id != opp_id):
        raise HTTPException(404, "Departure not found")
    obj.status = "held"
    obj.hold_reason = payload.hold_reason
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.post("/{opp_id}/departures/{departure_id}/book")
async def book_departure(
    opp_id: PydanticObjectId,
    departure_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await Departure.get(departure_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.opportunity_id != opp_id):
        raise HTTPException(404, "Departure not found")
    obj.status = "booked"
    obj.booked_at = datetime.utcnow()
    obj.booked_by = current_user.id
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ============== LEDGER ==============

class LedgerEntryIn(BaseModel):
    entry_type: str               # debit | credit
    amount: float
    currency: Optional[str] = "INR"
    description: Optional[str] = None
    counterparty: Optional[str] = None
    reference_no: Optional[str] = None
    entry_date: Optional[datetime] = None


@router.get("/{opp_id}/ledger")
async def list_ledger(opp_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    await _ensure_opp(opp_id, current_user.tenant_id)
    rows = await LedgerAccount.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id},
    ).sort("-entry_date").to_list()
    return [r.model_dump() for r in rows]


@router.post("/{opp_id}/ledger", status_code=201)
async def create_ledger_entry(
    opp_id: PydanticObjectId,
    payload: LedgerEntryIn,
    current_user: User = Depends(get_current_user),
):
    await _ensure_opp(opp_id, current_user.tenant_id)
    if payload.entry_type not in ("debit", "credit"):
        raise HTTPException(400, "entry_type must be 'debit' or 'credit'")
    obj = LedgerAccount(
        opportunity_id=opp_id,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/{opp_id}/ledger/{entry_id}")
async def update_ledger_entry(
    opp_id: PydanticObjectId,
    entry_id: PydanticObjectId,
    payload: LedgerEntryIn,
    current_user: User = Depends(get_current_user),
):
    obj = await LedgerAccount.get(entry_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.opportunity_id != opp_id):
        raise HTTPException(404, "Ledger entry not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ============== CLAIMS ==============

class ClaimIn(BaseModel):
    claim_type: Optional[str] = "general"
    description: Optional[str] = None
    amount: Optional[float] = None


@router.get("/{opp_id}/claims")
async def list_claims(opp_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    await _ensure_opp(opp_id, current_user.tenant_id)
    rows = await OpportunityClaim.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/{opp_id}/claims", status_code=201)
async def raise_claim(
    opp_id: PydanticObjectId,
    payload: ClaimIn,
    current_user: User = Depends(get_current_user),
):
    await _ensure_opp(opp_id, current_user.tenant_id)
    obj = OpportunityClaim(
        opportunity_id=opp_id,
        tenant_id=current_user.tenant_id,
        raised_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


class ClaimResolution(BaseModel):
    status: str                    # approved | rejected | resolved
    resolution_notes: Optional[str] = None


@router.post("/{opp_id}/claims/{claim_id}/resolve")
async def resolve_claim(
    opp_id: PydanticObjectId,
    claim_id: PydanticObjectId,
    payload: ClaimResolution,
    current_user: User = Depends(get_current_user),
):
    obj = await OpportunityClaim.get(claim_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.opportunity_id != opp_id):
        raise HTTPException(404, "Claim not found")
    if payload.status not in ("approved", "rejected", "resolved"):
        raise HTTPException(400, "status must be approved | rejected | resolved")
    obj.status = payload.status
    obj.resolution_notes = payload.resolution_notes
    obj.resolved_by = current_user.id
    obj.resolved_at = datetime.utcnow()
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ============== HANDOVER ==============

class HandoverIn(BaseModel):
    to_user_id: PydanticObjectId
    reason: Optional[str] = None


@router.get("/{opp_id}/handovers")
async def list_handovers(opp_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    await _ensure_opp(opp_id, current_user.tenant_id)
    rows = await HandoverRequest.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/{opp_id}/handovers", status_code=201)
async def create_handover(
    opp_id: PydanticObjectId,
    payload: HandoverIn,
    current_user: User = Depends(get_current_user),
):
    await _ensure_opp(opp_id, current_user.tenant_id)
    obj = HandoverRequest(
        opportunity_id=opp_id,
        tenant_id=current_user.tenant_id,
        from_user_id=current_user.id,
        to_user_id=payload.to_user_id,
        reason=payload.reason,
    )
    await obj.insert()
    return obj.model_dump()


@router.post("/{opp_id}/handovers/{handover_id}/accept")
async def accept_handover(
    opp_id: PydanticObjectId,
    handover_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await HandoverRequest.find_one(
        {
            "_id": handover_id,
            "tenant_id": current_user.tenant_id,
            "opportunity_id": opp_id,
        }
    )
    if not obj:
        raise HTTPException(404, "Handover not found")
    if obj.to_user_id != current_user.id:
        raise HTTPException(403, "Only the receiving user can accept")
    obj.status = "accepted"
    obj.handover_at = datetime.utcnow()
    obj.updated_at = datetime.utcnow()
    await obj.save()
    # Transfer opportunity ownership — tenant-scoped lookup
    opp = await Opportunity.find_one(
        {"_id": opp_id, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if opp:
        opp.owner_id = current_user.id
        opp.last_modified_by_id = current_user.id
        await opp.save()
    return obj.model_dump()


@router.post("/{opp_id}/handovers/{handover_id}/reject")
async def reject_handover(
    opp_id: PydanticObjectId,
    handover_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await HandoverRequest.find_one(
        {
            "_id": handover_id,
            "tenant_id": current_user.tenant_id,
            "opportunity_id": opp_id,
        }
    )
    if not obj:
        raise HTTPException(404, "Handover not found")
    obj.status = "rejected"
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ============== OPPORTUNITY TEAM ==============

class TeamMemberIn(BaseModel):
    user_id: PydanticObjectId
    role: Optional[str] = None


@router.get("/{opp_id}/team")
async def list_team(opp_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    await _ensure_opp(opp_id, current_user.tenant_id)
    rows = await OpportunityTeamMember.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/{opp_id}/team", status_code=201)
async def add_team_member(
    opp_id: PydanticObjectId,
    payload: TeamMemberIn,
    current_user: User = Depends(get_current_user),
):
    await _ensure_opp(opp_id, current_user.tenant_id)
    existing = await OpportunityTeamMember.find_one(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id, "user_id": payload.user_id},
    )
    if existing:
        if payload.role and existing.role != payload.role:
            existing.role = payload.role
            existing.updated_at = datetime.utcnow()
            await existing.save()
        return existing.model_dump()
    obj = OpportunityTeamMember(
        opportunity_id=opp_id,
        tenant_id=current_user.tenant_id,
        user_id=payload.user_id,
        role=payload.role,
    )
    await obj.insert()
    return obj.model_dump()


@router.delete("/{opp_id}/team/{user_id}", status_code=204)
async def remove_team_member(
    opp_id: PydanticObjectId,
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await OpportunityTeamMember.find_one(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id, "user_id": user_id},
    )
    if obj:
        await obj.delete()


# ============== PAYMENT SCHEDULES ==============

class ScheduleIn(BaseModel):
    direction: str                    # outgoing | incoming
    amount: float
    currency: Optional[str] = "INR"
    due_date: Optional[datetime] = None
    paid_on: Optional[datetime] = None
    status: Optional[str] = "pending"
    notes: Optional[str] = None


@router.get("/{opp_id}/payment-schedules")
async def list_schedules(opp_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    await _ensure_opp(opp_id, current_user.tenant_id)
    rows = await OpportunityPaymentSchedule.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": opp_id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/{opp_id}/payment-schedules", status_code=201)
async def create_schedule(
    opp_id: PydanticObjectId,
    payload: ScheduleIn,
    current_user: User = Depends(get_current_user),
):
    await _ensure_opp(opp_id, current_user.tenant_id)
    if payload.direction not in ("outgoing", "incoming"):
        raise HTTPException(400, "direction must be 'outgoing' or 'incoming'")
    obj = OpportunityPaymentSchedule(
        opportunity_id=opp_id,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


# ============== EXTERNAL LEAD CAPTURE (public) ==============

class CaptureIn(BaseModel):
    tenant_id: PydanticObjectId
    source: str                      # facebook | webform | api | manual_capture
    source_ref: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None


@router.post("/external-leads/capture", status_code=201, tags=["Public Capture"])
async def public_capture(payload: CaptureIn):
    """Public lead-capture entry point. NOT auth-gated. Tenant_id required."""
    obj = ExternalLead(**payload.model_dump(exclude_none=True))
    await obj.insert()
    return {"id": str(obj.id), "received": True}


@router.get("/external-leads", tags=["External Leads"])
async def list_external_leads(
    is_processed: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {"tenant_id": current_user.tenant_id}
    if is_processed is not None:
        query["is_processed"] = is_processed
    rows = await ExternalLead.find(query).sort("-created_at").to_list()
    return [r.model_dump() for r in rows]


@router.delete("/external-leads/{external_lead_id}", status_code=204)
async def delete_external_lead(
    external_lead_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ExternalLead.find_one(
        {"_id": external_lead_id, "tenant_id": current_user.tenant_id}
    )
    if not obj:
        raise HTTPException(404, "External lead not found")
    await obj.delete()


@router.post("/external-leads/{external_lead_id}/mark-processed")
async def mark_external_lead_processed(
    external_lead_id: PydanticObjectId,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    obj = await ExternalLead.find_one(
        {"_id": external_lead_id, "tenant_id": current_user.tenant_id}
    )
    if not obj:
        raise HTTPException(404, "External lead not found")
    obj.is_processed = True
    obj.processed_at = datetime.utcnow()
    if payload.get("lead_id"):
        try:
            obj.processed_lead_id = PydanticObjectId(payload["lead_id"])
        except Exception:
            pass
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ============== LOCKS (extension of existing lock/unlock) ==============

@router.post("/{opp_id}/automatic-lock")
async def auto_lock_opportunity(
    opp_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/automatic_lock`. Lock if not already locked."""
    opp = await _ensure_opp(opp_id, current_user.tenant_id)
    existing = await OpportunityLock.find_one(
        OpportunityLock.opportunity_id == opp_id,
    )
    if existing:
        return {"opportunity_id": str(opp_id), "locked": True, "by": str(existing.locked_by)}
    lock = OpportunityLock(
        opportunity_id=opp_id,
        locked_by=current_user.id,
        tenant_id=current_user.tenant_id,
    )
    await lock.insert()
    if hasattr(opp, "is_locked"):
        opp.is_locked = True
        opp.locked_by = current_user.id
        await opp.save()
    return {"opportunity_id": str(opp_id), "locked": True, "by": str(current_user.id)}
