"""
Phase 16 — Mobile API thin shim.

Mirrors old Laravel `*_m` mobile variants. Endpoints delegate to existing
desktop services with mobile-shaped (lighter) responses.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.account import Account
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.opportunity import Opportunity

router = APIRouter()


async def _validate_owner_in_tenant(new_owner_id: PydanticObjectId, tenant_id: PydanticObjectId) -> None:
    """Raise 400 if new_owner_id does not belong to an active user in this tenant."""
    owner = await User.find_one(
        {
            "_id": new_owner_id,
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_active": True,
        }
    )
    if not owner:
        raise HTTPException(
            status_code=400,
            detail="new_owner_id must reference an active user in this tenant",
        )


async def _bulk_change_owner(
    model,
    record_ids: List[PydanticObjectId],
    new_owner_id: PydanticObjectId,
    tenant_id: PydanticObjectId,
    modifier_id: PydanticObjectId,
) -> int:
    """Atomic, tenant-scoped bulk owner reassignment.

    A single `update_many` filtered on tenant_id replaces the previous
    per-record fetch/check/save loop. Closes both the cross-tenant IDOR risk
    (records from other tenants are excluded by the filter) and the TOCTOU
    race between the tenant check and the save.
    """
    if not record_ids:
        return 0
    update_set: Dict[str, Any] = {
        "owner_id": new_owner_id,
        "updated_at": datetime.now(timezone.utc),
    }
    if "last_modified_by_id" in model.model_fields:
        update_set["last_modified_by_id"] = modifier_id
    filter_query: Dict[str, Any] = {
        "_id": {"$in": list(record_ids)},
        "tenant_id": tenant_id,
    }
    if "deleted_at" in model.model_fields:
        filter_query["deleted_at"] = None
    result = await model.find(filter_query).update({"$set": update_set})
    # Beanie returns a Mongo UpdateResult-like object
    return getattr(result, "modified_count", 0) or 0


# ============== DASHBOARD ==============

@router.get("/dashboard")
async def mobile_dashboard(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_dashboard_m`."""
    leads = await Lead.find({"tenant_id": current_user.tenant_id}).count()
    opps = await Opportunity.find({"tenant_id": current_user.tenant_id}).count()
    accts = await Account.find({"tenant_id": current_user.tenant_id}).count()
    return {
        "leads": leads,
        "opportunities": opps,
        "accounts": accts,
    }


@router.get("/user-activities")
async def mobile_user_activities(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_user_activities_m`."""
    return {"activities": []}


# ============== ACCOUNTS ==============

@router.get("/accounts")
async def mobile_list_accounts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    rows = await Account.find(
        {"tenant_id": current_user.tenant_id, "deleted_at": None},
    ).skip(skip).limit(per_page).to_list() if hasattr(Account, "deleted_at") else []
    return {
        "accounts": [
            {"id": str(a.id), "name": a.name, "email": getattr(a, "email", None)}
            for a in rows
        ],
        "page": page,
        "per_page": per_page,
    }


@router.get("/accounts/search")
async def mobile_search_accounts(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
):
    rows = await Account.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list() if hasattr(Account, "tenant_id") else []
    needle = q.lower()
    out = [a for a in rows if needle in (a.name or "").lower()]
    return [{"id": str(a.id), "name": a.name} for a in out[:50]]


class OwnerChangeIn(BaseModel):
    record_ids: List[PydanticObjectId]
    new_owner_id: PydanticObjectId


@router.post("/accounts/change-owner")
async def mobile_account_change_owner(
    payload: OwnerChangeIn,
    current_user: User = Depends(get_current_user),
):
    await _validate_owner_in_tenant(payload.new_owner_id, current_user.tenant_id)
    updated = await _bulk_change_owner(
        Account,
        payload.record_ids,
        payload.new_owner_id,
        current_user.tenant_id,
        current_user.id,
    )
    return {"updated": updated}


# ============== CONTACTS ==============

@router.get("/contacts")
async def mobile_list_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    rows = await Contact.find(
        {"tenant_id": current_user.tenant_id},
    ).skip(skip).limit(per_page).to_list() if hasattr(Contact, "tenant_id") else []
    return {
        "contacts": [
            {
                "id": str(c.id),
                "first_name": getattr(c, "first_name", None),
                "last_name": getattr(c, "last_name", None),
                "email": getattr(c, "email", None),
                "phone": getattr(c, "phone", None),
            }
            for c in rows
        ],
        "page": page,
        "per_page": per_page,
    }


@router.post("/contacts/change-owner")
async def mobile_contact_change_owner(
    payload: OwnerChangeIn,
    current_user: User = Depends(get_current_user),
):
    await _validate_owner_in_tenant(payload.new_owner_id, current_user.tenant_id)
    updated = await _bulk_change_owner(
        Contact,
        payload.record_ids,
        payload.new_owner_id,
        current_user.tenant_id,
        current_user.id,
    )
    return {"updated": updated}


# ============== OPPORTUNITIES ==============

@router.get("/opportunities")
async def mobile_list_opportunities(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    rows = await Opportunity.find(
        {"tenant_id": current_user.tenant_id},
    ).skip(skip).limit(per_page).to_list()
    return {
        "opportunities": [
            {
                "id": str(o.id),
                "name": o.name,
                "amount": getattr(o, "amount", None),
                "sales_stage_id": str(getattr(o, "sales_stage_id", "") or "") or None,
                "close_date": getattr(o, "close_date", None),
            }
            for o in rows
        ],
        "page": page,
        "per_page": per_page,
    }


@router.post("/opportunities/change-owner")
async def mobile_opp_change_owner(
    payload: OwnerChangeIn,
    current_user: User = Depends(get_current_user),
):
    await _validate_owner_in_tenant(payload.new_owner_id, current_user.tenant_id)
    updated = await _bulk_change_owner(
        Opportunity,
        payload.record_ids,
        payload.new_owner_id,
        current_user.tenant_id,
        current_user.id,
    )
    return {"updated": updated}


class StageChangeIn(BaseModel):
    opportunity_id: PydanticObjectId
    sales_stage_id: PydanticObjectId


@router.post("/opportunities/change-stage")
async def mobile_opp_change_stage(
    payload: StageChangeIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_opportunities_sales_stages_m`."""
    o = await Opportunity.find_one(
        {
            "_id": payload.opportunity_id,
            "tenant_id": current_user.tenant_id,
            "deleted_at": None,
        }
    )
    if not o:
        raise HTTPException(404, "Opportunity not found")
    o.sales_stage_id = payload.sales_stage_id
    await o.save()
    return {"updated": True, "opportunity_id": str(payload.opportunity_id)}


# ============== LEADS ==============

@router.get("/leads")
async def mobile_list_leads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    rows = await Lead.find(
        {"tenant_id": current_user.tenant_id},
    ).skip(skip).limit(per_page).to_list()
    return {
        "leads": [
            {
                "id": str(l.id),
                "first_name": getattr(l, "first_name", None),
                "last_name": getattr(l, "last_name", None),
                "email": getattr(l, "email", None),
                "mobile": getattr(l, "mobile", None),
                "lead_status_id": str(getattr(l, "lead_status_id", "") or "") or None,
            }
            for l in rows
        ],
        "page": page,
        "per_page": per_page,
    }


@router.post("/leads/change-owner")
async def mobile_lead_change_owner(
    payload: OwnerChangeIn,
    current_user: User = Depends(get_current_user),
):
    await _validate_owner_in_tenant(payload.new_owner_id, current_user.tenant_id)
    updated = await _bulk_change_owner(
        Lead,
        payload.record_ids,
        payload.new_owner_id,
        current_user.tenant_id,
        current_user.id,
    )
    return {"updated": updated}


# ============== PERSONAL ACCOUNTS ==============

@router.get("/personal-accounts")
async def mobile_list_personal_accounts(
    current_user: User = Depends(get_current_user),
):
    rows = await Account.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list() if hasattr(Account, "tenant_id") else []
    pa = [a for a in rows if getattr(a, "is_person_account", False)]
    return [
        {
            "id": str(a.id),
            "name": a.name,
            "email": getattr(a, "email", None),
        }
        for a in pa
    ]


# ============== FILE FOLDERS (mobile alias) ==============

@router.get("/file-folders")
async def mobile_list_file_folders(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_file_folders_m`."""
    from app.models.file_extras import FileFolder
    rows = await FileFolder.find(
        {"tenant_id": current_user.tenant_id, "deleted_at": None},
    ).to_list()
    return [
        {
            "id": str(f.id),
            "name": f.name,
            "parent_id": str(f.parent_id) if f.parent_id else None,
        }
        for f in rows
    ]
