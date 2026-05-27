"""
Standalone Departure Report API — Travel industry module.

Exposes tour-slot departures (opportunity_id = None) as a first-class
resource for the Departure Report page. All routes are gated by the
"departures" module flag so only travel tenants can access them.
"""
from __future__ import annotations
from datetime import datetime
from math import ceil
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.middleware.industry_guard import require_module
from app.models.user import User
from app.models.opportunity_workflow import Departure

router = APIRouter(dependencies=[Depends(require_module("departures"))])


# ── Schemas ──────────────────────────────────────────────────────────────────

class DepartureCreate(BaseModel):
    name: str
    destination: Optional[str] = None
    departure_date: datetime
    return_date: Optional[datetime] = None
    departure_city: Optional[str] = None
    return_city: Optional[str] = None
    total_seats: int = 0
    price_b2b: Optional[float] = None
    price_b2c: Optional[float] = None
    has_flight: bool = True
    status: str = "active"
    notes: Optional[str] = None


class DepartureUpdate(BaseModel):
    name: Optional[str] = None
    destination: Optional[str] = None
    departure_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    departure_city: Optional[str] = None
    return_city: Optional[str] = None
    total_seats: Optional[int] = None
    booked_seats: Optional[int] = None
    held_seats: Optional[int] = None
    price_b2b: Optional[float] = None
    price_b2c: Optional[float] = None
    has_flight: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _enrich(dep: Departure) -> Dict[str, Any]:
    """Serialize a Departure document and add computed fields."""
    d = dep.model_dump()
    d["id"] = str(dep.id)
    d["opportunity_id"] = str(dep.opportunity_id) if dep.opportunity_id else None
    d["tenant_id"] = str(dep.tenant_id)
    d["created_by"] = str(dep.created_by)
    d["booked_by"] = str(dep.booked_by) if dep.booked_by else None
    d["agent_id"] = str(dep.agent_id) if dep.agent_id else None

    # Available seats (computed)
    d["available_seats"] = max(0, dep.total_seats - dep.booked_seats - dep.held_seats)

    # Number of nights (computed from dates)
    if dep.departure_date and dep.return_date:
        delta = dep.return_date - dep.departure_date
        nights = delta.days
        days = nights + 1
        d["nights"] = nights
        d["nights_label"] = f"{days}D/{nights}N"
    else:
        d["nights"] = None
        d["nights_label"] = None

    return d


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_departure_stats(
    current_user: User = Depends(get_current_user),
):
    """Aggregate stats for the Departure Report header."""
    departures = await Departure.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": None}
    ).to_list()

    total_departures = len(departures)
    total_seats = sum(d.total_seats for d in departures)
    available_seats = sum(
        max(0, d.total_seats - d.booked_seats - d.held_seats) for d in departures
    )

    return {
        "total_departures": total_departures,
        "total_seats": total_seats,
        "available_seats": available_seats,
    }


@router.get("/destinations")
async def get_destinations(
    current_user: User = Depends(get_current_user),
):
    """Distinct destinations for the filter dropdown."""
    departures = await Departure.find(
        {"tenant_id": current_user.tenant_id, "opportunity_id": None}
    ).to_list()

    destinations = sorted({d.destination for d in departures if d.destination})
    return {"destinations": destinations}


@router.get("/")
async def list_departures(
    destination: Optional[str] = None,
    has_flight: Optional[bool] = None,
    status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    """List standalone tour departures with optional filters."""
    query: Dict[str, Any] = {
        "tenant_id": current_user.tenant_id,
        "opportunity_id": None,
    }

    if destination:
        query["destination"] = destination
    if has_flight is not None:
        query["has_flight"] = has_flight
    if status:
        query["status"] = status
    if date_from or date_to:
        date_filter: Dict[str, Any] = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to
        query["departure_date"] = date_filter

    all_deps = await Departure.find(query).sort("-departure_date").to_list()

    # Text search on name/destination (MongoDB $regex via Python-side filter
    # avoids needing a text index on small collections)
    if search:
        term = search.lower()
        all_deps = [
            d for d in all_deps
            if (d.name and term in d.name.lower())
            or (d.destination and term in d.destination.lower())
            or (d.departure_city and term in d.departure_city.lower())
        ]

    total = len(all_deps)
    start = (page - 1) * page_size
    page_items = all_deps[start: start + page_size]

    return {
        "departures": [_enrich(d) for d in page_items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total else 1,
    }


@router.post("/", status_code=201)
async def create_departure(
    payload: DepartureCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a standalone tour departure."""
    obj = Departure(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        opportunity_id=None,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return _enrich(obj)


@router.get("/{departure_id}")
async def get_departure(
    departure_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await Departure.get(departure_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Departure not found")
    return _enrich(obj)


@router.put("/{departure_id}")
async def update_departure(
    departure_id: PydanticObjectId,
    payload: DepartureUpdate,
    current_user: User = Depends(get_current_user),
):
    obj = await Departure.get(departure_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Departure not found")

    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return _enrich(obj)


@router.delete("/{departure_id}", status_code=204)
async def delete_departure(
    departure_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await Departure.get(departure_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Departure not found")
    # Only standalone departures can be deleted from this endpoint
    if obj.opportunity_id is not None:
        raise HTTPException(400, "Use the opportunity workflow endpoint to delete opportunity-linked departures")
    await obj.delete()
