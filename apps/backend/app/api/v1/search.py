"""
Global Search API endpoint - Cross-module search with category filtering
"""
from fastapi import APIRouter, Depends, Query, Request, Response
from typing import Optional, List, Dict, Any
from bson import ObjectId
import re
import asyncio

from app.models.user import User
from app.models.lead import Lead
from app.models.account import Account
from app.models.contact import Contact
from app.models.opportunity import Opportunity
from app.models.supplier import Supplier
from app.models.file import File
from app.api.deps import get_current_user
from app.core.rate_limiter import limiter

router = APIRouter()

VALID_MODULES = [
    "accounts", "contacts", "files", "leads",
    "opportunities", "person_accounts", "suppliers"
]


async def _get_owner_map(owner_ids: List[ObjectId], tenant_id) -> Dict[str, str]:
    """Bulk-fetch user names for a list of owner IDs."""
    if not owner_ids:
        return {}
    unique_ids = list({str(oid): oid for oid in owner_ids if oid}.values())
    users = await User.find(
        {"_id": {"$in": unique_ids}, "tenant_id": tenant_id}
    ).to_list()
    result = {}
    for u in users:
        name = (
            getattr(u, "full_name", None)
            or getattr(u, "name", None)
            or str(u.id)
        )
        result[str(u.id)] = name
    return result


def _make_pattern(q: str) -> re.Pattern:
    return re.compile(f".*{re.escape(q)}.*", re.IGNORECASE)


def _relevance_sort(docs: list, q: str, name_fields: List[str]) -> list:
    """Rank matched documents by how well they match the query.

    Exact name match > name starts-with query > query appears in name >
    everything else (matched only via secondary fields like email/phone).
    Ties keep their original order (stable sort). This keeps the most
    relevant rows at the top instead of surfacing incidental substring hits
    on hidden fields.
    """
    ql = q.strip().lower()

    def best_name(d) -> str:
        for f in name_fields:
            val = getattr(d, f, None)
            if val:
                return str(val).lower()
        return ""

    def rank(d) -> int:
        name = best_name(d)
        if not name:
            return 3
        if name == ql:
            return 0
        if name.startswith(ql):
            return 1
        if ql in name:
            return 2
        return 3

    return sorted(docs, key=rank)


@router.get("/by-module")
@limiter.limit("60/minute")
async def search_by_module(
    request: Request,
    response: Response,
    module: str = Query(..., description="Module to search: accounts|contacts|files|leads|opportunities|person_accounts|suppliers"),
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    current_user: User = Depends(get_current_user),
):
    """
    Search a specific module with pagination and full detail fields.
    Returns module-specific columns matching the CRM search result pages.
    """
    if module not in VALID_MODULES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid module. Choose from: {', '.join(VALID_MODULES)}")

    tenant_id = current_user.tenant_id
    pattern = _make_pattern(q)
    
    from app.services.visibility_scope import get_visible_owner_ids
    visible_owner_ids = await get_visible_owner_ids(current_user)

    # ── Accounts ──────────────────────────────────────────────────────────────
    if module == "accounts":
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_person_account": False,
            "$or": [
                {"name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}},
            ]
        }
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}
            
        docs = await Account.find(query).sort("name").skip(skip).limit(limit).to_list()
        docs = _relevance_sort(docs, q, ["name"])

        owner_map = await _get_owner_map([d.owner_id for d in docs], tenant_id)

        items = [
            {
                "id": str(d.id),
                "account_name": d.name or "",
                "phone": d.phone or "",
                "billing_street": d.billing_street or "",
                "billing_city": d.billing_city or "",
                "owner": owner_map.get(str(d.owner_id), ""),
                "account_id": str(d.id),
                "url": f"/accounts/{d.id}",
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in docs
        ]
        return {"module": "accounts", "label": "Accounts", "query": q, "items": items, "skip": skip, "limit": limit}

    # ── Person Accounts ───────────────────────────────────────────────────────
    if module == "person_accounts":
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_person_account": True,
            "$or": [
                {"first_name": {"$regex": pattern}},
                {"last_name": {"$regex": pattern}},
                {"name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}},
            ]
        }
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}
            
        docs = await Account.find(query).sort("name").skip(skip).limit(limit).to_list()
        docs = _relevance_sort(docs, q, ["first_name", "last_name", "name"])

        owner_map = await _get_owner_map([d.owner_id for d in docs], tenant_id)

        items = [
            {
                "id": str(d.id),
                "first_name": d.first_name or "",
                "last_name": d.last_name or "",
                "email": d.email or "",
                "phone": d.phone or "",
                "mobile": d.mobile or "",
                "owner": owner_map.get(str(d.owner_id), ""),
                "p_account_id": str(d.id),
                "url": f"/person-accounts/{d.id}",
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in docs
        ]
        return {"module": "person_accounts", "label": "Person Accounts", "query": q, "items": items, "skip": skip, "limit": limit}

    # ── Contacts ──────────────────────────────────────────────────────────────
    if module == "contacts":
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"first_name": {"$regex": pattern}},
                {"last_name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}},
                {"mobile": {"$regex": pattern}},
            ]
        }
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}
            
        docs = await Contact.find(query).skip(skip).limit(limit).to_list()
        docs = _relevance_sort(docs, q, ["first_name", "last_name", "email"])

        owner_map = await _get_owner_map([d.owner_id for d in docs], tenant_id)

        items = [
            {
                "id": str(d.id),
                "first_name": d.first_name or "",
                "last_name": d.last_name or "",
                "email": d.email or "",
                "phone": d.phone or "",
                "mobile": d.mobile or "",
                "owner": owner_map.get(str(d.owner_id), ""),
                "contact_id": str(d.id),
                "url": f"/contacts/{d.id}",
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in docs
        ]
        return {"module": "contacts", "label": "Contacts", "query": q, "items": items, "skip": skip, "limit": limit}

    # ── Leads ─────────────────────────────────────────────────────────────────
    if module == "leads":
        from app.models.lead_picklists import Source
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"first_name": {"$regex": pattern}},
                {"last_name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}},
                {"company": {"$regex": pattern}},
            ]
        }
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}
            
        docs = await Lead.find(query).skip(skip).limit(limit).to_list()
        docs = _relevance_sort(docs, q, ["first_name", "last_name", "company", "email"])

        owner_map = await _get_owner_map([d.owner_id for d in docs], tenant_id)

        # Resolve source names
        source_ids = list({str(d.source_id): d.source_id for d in docs if d.source_id}.values())
        source_map: Dict[str, str] = {}
        if source_ids:
            sources = await Source.find({"_id": {"$in": source_ids}}).to_list()
            source_map = {str(s.id): s.name for s in sources}

        items = [
            {
                "id": str(d.id),
                "lead_id": str(d.id),
                "first_name": d.first_name or "",
                "last_name": d.last_name or "",
                "email": d.email or "",
                "phone": d.phone or "",
                "company": d.company or "",
                "city_of_origin": d.city or "",
                "source": source_map.get(str(d.source_id), "") if d.source_id else "",
                "create_date": d.created_at.isoformat() if d.created_at else None,
                "is_converted": d.is_converted,
                "url": f"/leads/{d.id}",
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in docs
        ]
        return {"module": "leads", "label": "Leads", "query": q, "items": items, "skip": skip, "limit": limit}

    # ── Opportunities ─────────────────────────────────────────────────────────
    if module == "opportunities":
        from app.models.opportunity_picklists import SalesStage, Experience
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "name": {"$regex": pattern}
        }
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}
            
        docs = await Opportunity.find(query).sort("name").skip(skip).limit(limit).to_list()
        docs = _relevance_sort(docs, q, ["name"])

        owner_map = await _get_owner_map([d.owner_id for d in docs], tenant_id)

        # Resolve sales stages
        stage_ids = list({str(d.sales_stage_id): d.sales_stage_id for d in docs if d.sales_stage_id}.values())
        stage_map: Dict[str, str] = {}
        if stage_ids:
            stages = await SalesStage.find({"_id": {"$in": stage_ids}}).to_list()
            stage_map = {str(s.id): s.name for s in stages}

        # Resolve account names
        account_ids = list({str(d.account_id): d.account_id for d in docs if d.account_id}.values())
        account_map: Dict[str, str] = {}
        if account_ids:
            accounts = await Account.find(
                {"_id": {"$in": account_ids}, "tenant_id": tenant_id, "deleted_at": None}
            ).to_list()
            account_map = {str(a.id): a.name or "" for a in accounts}

        # Resolve experience names (travel-specific, only when data exists)
        exp_ids = list({str(d.experience_id): d.experience_id for d in docs if getattr(d, "experience_id", None)}.values())
        exp_map: Dict[str, str] = {}
        if exp_ids:
            try:
                exps = await Experience.find({"_id": {"$in": exp_ids}}).to_list()
                exp_map = {str(e.id): e.name for e in exps}
            except Exception:
                pass

        items = [
            {
                "id": str(d.id),
                "opportunity_name": d.name or "",
                "experience": exp_map.get(str(d.experience_id), "") if getattr(d, "experience_id", None) else "",
                "account_name": account_map.get(str(d.account_id), "") if d.account_id else "",
                "sales_stage": stage_map.get(str(d.sales_stage_id), "") if d.sales_stage_id else "",
                # travel_date now lives in industry_data (migrated from top-level)
                "travel_date": (d.industry_data or {}).get("travel_date") if getattr(d, "industry_data", None) else None,
                "close_date": d.close_date.isoformat() if d.close_date else None,
                "owner": owner_map.get(str(d.owner_id), ""),
                "create_date": d.created_at.isoformat() if d.created_at else None,
                "url": f"/opportunities/{d.id}",
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in docs
        ]
        return {"module": "opportunities", "label": "Opportunities", "query": q, "items": items, "skip": skip, "limit": limit}

    # ── Suppliers ─────────────────────────────────────────────────────────────
    if module == "suppliers":
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": pattern}},
                {"company_name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}},
            ]
        }
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}
            
        docs = await Supplier.find(query).sort("name").skip(skip).limit(limit).to_list()
        docs = _relevance_sort(docs, q, ["name", "company_name", "email"])

        items = [
            {
                "id": str(d.id),
                "supplier_name": d.name or "",
                "supplier_type": d.supplier_type or "",
                "phone": d.phone or "",
                "email": str(d.email) if d.email else "",
                "supplier_id": str(d.id),
                "url": f"/suppliers/{d.id}",
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in docs
        ]
        return {"module": "suppliers", "label": "Suppliers", "query": q, "items": items, "skip": skip, "limit": limit}

    # ── Files ─────────────────────────────────────────────────────────────────
    if module == "files":
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"original_filename": {"$regex": pattern}},
                {"filename": {"$regex": pattern}},
            ]
        }
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}
            
        docs = await File.find(query).skip(skip).limit(limit).to_list()

        owner_map = await _get_owner_map([d.owner_id for d in docs], tenant_id)

        items = [
            {
                "id": str(d.id),
                "title": d.original_filename or d.filename or "",
                "owner": owner_map.get(str(d.owner_id), ""),
                "last_modified_date": d.updated_at.isoformat() if d.updated_at else (
                    d.created_at.isoformat() if d.created_at else None
                ),
                "url": f"/files/{d.id}",
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in docs
        ]
        return {"module": "files", "label": "Files", "query": q, "items": items, "skip": skip, "limit": limit}


# ── Legacy endpoint (kept for CommandPalette) ─────────────────────────────────
@router.get("/")
@limiter.limit("30/minute")
async def global_search(
    request: Request,
    response: Response,
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(5, ge=1, le=20, description="Results per module"),
    current_user: User = Depends(get_current_user)
):
    """
    Cross-module search for the command palette (Ctrl+K).
    Returns top results grouped by module.
    """
    tenant_id = current_user.tenant_id
    results = {"query": q, "results": []}
    pattern = _make_pattern(q)
    
    from app.services.visibility_scope import get_visible_owner_ids
    visible_owner_ids = await get_visible_owner_ids(current_user)
    owner_match = {"$in": visible_owner_ids} if visible_owner_ids is not None else {"$exists": True}

    leads, accounts, person_accounts, contacts, opportunities, suppliers, files = await asyncio.gather(
        Lead.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "owner_id": owner_match,
            "$or": [
                {"first_name": {"$regex": pattern}},
                {"last_name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"company": {"$regex": pattern}},
            ]
        }).limit(limit).to_list(),

        Account.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_person_account": False,
            "owner_id": owner_match,
            "$or": [
                {"name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}},
            ]
        }).limit(limit).to_list(),
        
        Account.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_person_account": True,
            "owner_id": owner_match,
            "$or": [
                {"first_name": {"$regex": pattern}},
                {"last_name": {"$regex": pattern}},
                {"name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}},
            ]
        }).limit(limit).to_list(),

        Contact.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "owner_id": owner_match,
            "$or": [
                {"first_name": {"$regex": pattern}},
                {"last_name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
            ]
        }).limit(limit).to_list(),

        Opportunity.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "owner_id": owner_match,
            "name": {"$regex": pattern}
        }).limit(limit).to_list(),
        
        Supplier.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "owner_id": owner_match,
            "$or": [
                {"name": {"$regex": pattern}},
                {"company_name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}},
            ]
        }).limit(limit).to_list(),
        
        File.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "owner_id": owner_match,
            "$or": [
                {"original_filename": {"$regex": pattern}},
                {"filename": {"$regex": pattern}},
            ]
        }).limit(limit).to_list(),
    )

    if leads:
        results["results"].append({
            "module": "leads",
            "label": "Leads",
            "items": [
                {
                    "id": str(l.id),
                    "title": f"{l.first_name or ''} {l.last_name or ''}".strip() or l.email or "Unnamed Lead",
                    "subtitle": l.company,
                    "url": f"/leads/{l.id}",
                }
                for l in leads
            ]
        })

    if accounts:
        results["results"].append({
            "module": "accounts",
            "label": "Accounts",
            "items": [
                {
                    "id": str(a.id),
                    "title": a.name or a.email or "Unnamed Account",
                    "subtitle": a.billing_city,
                    "url": f"/accounts/{a.id}",
                }
                for a in accounts
            ]
        })

    if contacts:
        results["results"].append({
            "module": "contacts",
            "label": "Contacts",
            "items": [
                {
                    "id": str(c.id),
                    "title": f"{c.first_name or ''} {c.last_name or ''}".strip() or c.email or "Unnamed Contact",
                    "subtitle": c.email,
                    "url": f"/contacts/{c.id}",
                }
                for c in contacts
            ]
        })

    if opportunities:
        results["results"].append({
            "module": "opportunities",
            "label": "Opportunities",
            "items": [
                {
                    "id": str(o.id),
                    "title": o.name,
                    "subtitle": f"₹{o.amount:,.0f}" if o.amount else None,
                    "url": f"/opportunities/{o.id}",
                }
                for o in opportunities
            ]
        })

    if person_accounts:
        results["results"].append({
            "module": "person_accounts",
            "label": "Person Accounts",
            "items": [
                {
                    "id": str(p.id),
                    "title": f"{p.first_name or ''} {p.last_name or ''}".strip() or p.name or p.email or "Unnamed Person",
                    "subtitle": p.email or p.phone,
                    "url": f"/person-accounts/{p.id}",
                }
                for p in person_accounts
            ]
        })

    if suppliers:
        results["results"].append({
            "module": "suppliers",
            "label": "Suppliers",
            "items": [
                {
                    "id": str(s.id),
                    "title": s.name or s.company_name or "Unnamed Supplier",
                    "subtitle": s.supplier_type,
                    "url": f"/suppliers/{s.id}",
                }
                for s in suppliers
            ]
        })

    if files:
        results["results"].append({
            "module": "files",
            "label": "Files",
            "items": [
                {
                    "id": str(f.id),
                    "title": f.original_filename or f.filename or "Unnamed File",
                    "subtitle": f.mime_type,
                    "url": f"/files/{f.id}",
                }
                for f in files
            ]
        })

    return results
