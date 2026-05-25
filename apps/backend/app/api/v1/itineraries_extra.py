"""
Phase 5 — Itinerary engine extension router (Travel-industry module).

Mirrors old Laravel:
  Days/schedule/categories/sub-categories
  Hotels (CRUD + search + b64), Flights (CRUD + search + modify), Tour engine
  Inclusions / user-inclusions / header-footer / banner
  PDF pipeline (request/status/callback)
  Proforma invoices
  Itinerary copy / delete / opportunity attach

All routes are guarded by ``require_module("itineraries")``.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.itinerary import Itinerary, ItineraryDay, ItineraryOpportunity
from app.models.itinerary_extras import (
    ItineraryCategory, ItinerarySubCategory,
    ItineraryScheduleItem, ItineraryHotel, ItineraryFlight,
    ItineraryInclusion, UserItineraryInclusion,
    ItineraryHeaderFooter, ProformaInvoice, TourItinerary,
    ItineraryPDFJob,
)
from app.middleware.industry_guard import require_module

router = APIRouter(dependencies=[Depends(require_module("itineraries"))])


# ============== ITINERARY UTILITY (copy / delete) ==============

@router.post("/{itinerary_id}/copy")
async def copy_itinerary(
    itinerary_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_itineraries_copy`."""
    src = await Itinerary.get(itinerary_id)
    if not src or src.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Itinerary not found")
    data = src.model_dump(exclude={"id", "_id", "created_at", "updated_at"})
    data["name"] = f"{src.name} (copy)"
    data["created_by"] = current_user.id
    data["owner_id"] = current_user.id
    new_obj = Itinerary(**data)
    await new_obj.insert()
    # copy days
    days = await ItineraryDay.find(ItineraryDay.itinerary_id == itinerary_id).to_list()
    for d in days:
        ddict = d.model_dump(exclude={"id", "_id", "created_at", "updated_at"})
        ddict["itinerary_id"] = new_obj.id
        await ItineraryDay(**ddict).insert()
    return {"id": str(new_obj.id), "name": new_obj.name}


@router.post("/{itinerary_id}/attach-opportunity")
async def attach_to_opportunity(
    itinerary_id: PydanticObjectId,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_opp_itinerary_attach`."""
    opp_id = payload.get("opportunity_id")
    if not opp_id:
        raise HTTPException(400, "opportunity_id required")
    pivot = ItineraryOpportunity(
        itinerary_id=itinerary_id,
        opportunity_id=PydanticObjectId(opp_id),
        tenant_id=current_user.tenant_id,
        notes=payload.get("notes"),
    )
    await pivot.insert()
    return {"attached": True}


# ============== CATEGORIES ==============

class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = None
    sorting: Optional[int] = 0


@router.get("/categories")
async def list_categories(current_user: User = Depends(get_current_user)):
    rows = await ItineraryCategory.find(
        {"tenant_id": current_user.tenant_id}
    ).sort("+sorting").to_list()
    return [r.model_dump() for r in rows]


@router.post("/categories", status_code=201)
async def create_category(
    payload: CategoryIn,
    current_user: User = Depends(get_current_user),
):
    obj = ItineraryCategory(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/categories/{cid}")
async def update_category(
    cid: PydanticObjectId,
    payload: CategoryIn,
    current_user: User = Depends(get_current_user),
):
    obj = await ItineraryCategory.get(cid)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Category not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/categories/{cid}", status_code=204)
async def delete_category(
    cid: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ItineraryCategory.get(cid)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Category not found")
    await obj.delete()


# ============== SUB-CATEGORIES ==============

class SubCategoryIn(BaseModel):
    category_id: PydanticObjectId
    name: str
    sorting: Optional[int] = 0


@router.get("/sub-categories")
async def list_sub_categories(
    category_id: Optional[PydanticObjectId] = None,
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {"tenant_id": current_user.tenant_id}
    if category_id:
        query["category_id"] = category_id
    rows = await ItinerarySubCategory.find(query).sort("+sorting").to_list()
    return [r.model_dump() for r in rows]


@router.post("/sub-categories", status_code=201)
async def create_sub_category(
    payload: SubCategoryIn,
    current_user: User = Depends(get_current_user),
):
    obj = ItinerarySubCategory(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(),
    )
    await obj.insert()
    return obj.model_dump()


# ============== SCHEDULE ITEMS ==============

class ScheduleIn(BaseModel):
    itinerary_id: PydanticObjectId
    day_id: PydanticObjectId
    sequence: Optional[int] = 0
    title: str
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category_id: Optional[PydanticObjectId] = None
    sub_category_id: Optional[PydanticObjectId] = None
    location: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    transfer_type: Optional[str] = None
    notes: Optional[str] = None


@router.get("/schedule")
async def list_schedule_items(
    itinerary_id: Optional[PydanticObjectId] = None,
    day_id: Optional[PydanticObjectId] = None,
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {"tenant_id": current_user.tenant_id}
    if itinerary_id:
        query["itinerary_id"] = itinerary_id
    if day_id:
        query["day_id"] = day_id
    rows = await ItineraryScheduleItem.find(query).sort("+sequence").to_list()
    return [r.model_dump() for r in rows]


@router.post("/schedule", status_code=201)
async def create_schedule_item(
    payload: ScheduleIn,
    current_user: User = Depends(get_current_user),
):
    obj = ItineraryScheduleItem(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/schedule/{schedule_id}")
async def update_schedule_item(
    schedule_id: PydanticObjectId,
    payload: ScheduleIn,
    current_user: User = Depends(get_current_user),
):
    obj = await ItineraryScheduleItem.get(schedule_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Schedule item not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/schedule/{schedule_id}", status_code=204)
async def delete_schedule_item(
    schedule_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ItineraryScheduleItem.get(schedule_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Schedule item not found")
    await obj.delete()


@router.post("/schedule/{schedule_id}/transfer")
async def update_transfer(
    schedule_id: PydanticObjectId,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/updateTransfer`."""
    obj = await ItineraryScheduleItem.get(schedule_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Schedule item not found")
    obj.transfer_type = payload.get("transfer_type")
    obj.notes = payload.get("notes") or obj.notes
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ============== HOTELS ==============

class HotelIn(BaseModel):
    itinerary_id: PydanticObjectId
    day_id: Optional[PydanticObjectId] = None
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    nights: Optional[int] = None
    rooms: Optional[int] = None
    pax: Optional[int] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    star_rating: Optional[int] = None
    confirmation_no: Optional[str] = None
    notes: Optional[str] = None
    image_b64: Optional[str] = None


@router.get("/hotels")
async def list_hotels(
    itinerary_id: Optional[PydanticObjectId] = None,
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {"tenant_id": current_user.tenant_id}
    if itinerary_id:
        query["itinerary_id"] = itinerary_id
    rows = await ItineraryHotel.find(query).to_list()
    return [r.model_dump() for r in rows]


@router.post("/hotels", status_code=201)
async def create_hotel(
    payload: HotelIn,
    current_user: User = Depends(get_current_user),
):
    obj = ItineraryHotel(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.post("/hotels/search")
async def search_hotels(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/search_hotel_tour`. Returns supplier-side results stub."""
    return {"query": payload, "results": []}


@router.post("/hotels/image-to-b64")
async def hotel_image_to_b64(payload: Dict[str, Any]):
    """Mirror old `/image_to_b64`. Returns base64 placeholder."""
    return {"data_url": payload.get("url"), "b64": ""}


# ============== FLIGHTS ==============

class FlightIn(BaseModel):
    itinerary_id: PydanticObjectId
    day_id: Optional[PydanticObjectId] = None
    airline: Optional[str] = None
    flight_no: Optional[str] = None
    cabin_class: Optional[str] = None
    from_city: Optional[str] = None
    to_city: Optional[str] = None
    depart_at: Optional[datetime] = None
    arrive_at: Optional[datetime] = None
    pax: Optional[int] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    pnr: Optional[str] = None
    notes: Optional[str] = None


@router.get("/flights")
async def list_flights(
    itinerary_id: Optional[PydanticObjectId] = None,
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {"tenant_id": current_user.tenant_id}
    if itinerary_id:
        query["itinerary_id"] = itinerary_id
    rows = await ItineraryFlight.find(query).to_list()
    return [r.model_dump() for r in rows]


@router.post("/flights", status_code=201)
async def create_flight(
    payload: FlightIn,
    current_user: User = Depends(get_current_user),
):
    obj = ItineraryFlight(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/flights/{flight_id}")
async def update_flight(
    flight_id: PydanticObjectId,
    payload: FlightIn,
    current_user: User = Depends(get_current_user),
):
    obj = await ItineraryFlight.get(flight_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Flight not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/flights/{flight_id}", status_code=204)
async def delete_flight(
    flight_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ItineraryFlight.get(flight_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Flight not found")
    await obj.delete()


@router.post("/flights/search")
async def search_flights(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/search_flight` and `/search_flight_tour`."""
    return {"query": payload, "results": []}


@router.post("/flights/{flight_id}/modify")
async def modify_flight(
    flight_id: PydanticObjectId,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_itinerary_flights_modify`."""
    obj = await ItineraryFlight.get(flight_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Flight not found")
    for k, v in payload.items():
        if hasattr(obj, k):
            setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ============== INCLUSIONS ==============

class InclusionIn(BaseModel):
    name: str
    description: Optional[str] = None
    sorting: Optional[int] = 0


@router.get("/inclusions")
async def list_inclusions(current_user: User = Depends(get_current_user)):
    rows = await ItineraryInclusion.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).sort("+sorting").to_list()
    return [r.model_dump() for r in rows]


@router.post("/inclusions", status_code=201)
async def create_inclusion(
    payload: InclusionIn,
    current_user: User = Depends(get_current_user),
):
    obj = ItineraryInclusion(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.delete("/inclusions/{inclusion_id}", status_code=204)
async def delete_inclusion(
    inclusion_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ItineraryInclusion.get(inclusion_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Inclusion not found")
    await obj.delete()


class UserInclusionIn(BaseModel):
    name: str
    body_html: Optional[str] = None
    is_active: Optional[bool] = True


@router.get("/user-inclusions")
async def list_user_inclusions(current_user: User = Depends(get_current_user)):
    rows = await UserItineraryInclusion.find(
        {"tenant_id": current_user.tenant_id, "user_id": current_user.id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/user-inclusions", status_code=201)
async def create_user_inclusion(
    payload: UserInclusionIn,
    current_user: User = Depends(get_current_user),
):
    obj = UserItineraryInclusion(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


# ============== HEADER / FOOTER / BANNER ==============

class HeaderFooterIn(BaseModel):
    type: str                        # header | footer | banner
    name: str
    body_html: Optional[str] = None
    image_url: Optional[str] = None
    is_default: Optional[bool] = False


@router.get("/header-footers")
async def list_header_footers(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {"tenant_id": current_user.tenant_id}
    if type:
        query["type"] = type
    rows = await ItineraryHeaderFooter.find(query).to_list()
    return [r.model_dump() for r in rows]


@router.post("/header-footers", status_code=201)
async def create_header_footer(
    payload: HeaderFooterIn,
    current_user: User = Depends(get_current_user),
):
    obj = ItineraryHeaderFooter(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


# ============== TOUR ITINERARIES (legacy parallel engine) ==============

class TourItineraryIn(BaseModel):
    name: str
    description: Optional[str] = None
    total_days: int
    total_nights: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    departure_dates: Optional[List[datetime]] = None
    base_price: Optional[float] = None
    currency: Optional[str] = "INR"
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None


@router.get("/tour")
async def list_tour_itineraries(current_user: User = Depends(get_current_user)):
    rows = await TourItinerary.find(
        {"tenant_id": current_user.tenant_id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/tour", status_code=201)
async def create_tour_itinerary(
    payload: TourItineraryIn,
    current_user: User = Depends(get_current_user),
):
    obj = TourItinerary(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.post("/tour/{tour_id}/copy")
async def copy_tour_itinerary(
    tour_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/copyTourItinerary`."""
    src = await TourItinerary.get(tour_id)
    if not src or src.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Tour not found")
    data = src.model_dump(exclude={"id", "_id", "created_at", "updated_at"})
    data["name"] = f"{src.name} (copy)"
    data["created_by"] = current_user.id
    obj = TourItinerary(**data)
    await obj.insert()
    return obj.model_dump()


# ============== PROFORMA INVOICES ==============

class ProformaIn(BaseModel):
    opportunity_id: Optional[PydanticObjectId] = None
    itinerary_id: Optional[PydanticObjectId] = None
    invoice_no: Optional[str] = None
    issued_to_name: Optional[str] = None
    issued_to_email: Optional[str] = None
    issued_to_address: Optional[str] = None
    line_items: List[Dict[str, Any]] = []
    sub_total: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total: float = 0
    currency: str = "INR"


@router.get("/proforma")
async def list_proforma(current_user: User = Depends(get_current_user)):
    rows = await ProformaInvoice.find(
        {"tenant_id": current_user.tenant_id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/proforma", status_code=201)
async def create_proforma(
    payload: ProformaIn,
    current_user: User = Depends(get_current_user),
):
    obj = ProformaInvoice(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.post("/proforma/{proforma_id}/generate")
async def generate_proforma(
    proforma_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/gen_proforma_invoices/{id}`."""
    obj = await ProformaInvoice.get(proforma_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Proforma not found")
    obj.status = "sent"
    obj.sent_at = datetime.utcnow()
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.get("/proforma/{proforma_id}/download")
async def download_proforma(
    proforma_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_profinvoice_download`."""
    obj = await ProformaInvoice.get(proforma_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Proforma not found")
    return {"id": str(obj.id), "pdf_url": obj.pdf_url}


@router.post("/proforma/{proforma_id}/email")
async def email_proforma(
    proforma_id: PydanticObjectId,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_profinvoice_email`."""
    obj = await ProformaInvoice.get(proforma_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Proforma not found")
    obj.status = "sent"
    obj.sent_at = datetime.utcnow()
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return {"sent": True, "to": payload.get("to")}


# ============== DAY-LEVEL MUTATIONS (Sprint A2) ==============

class DayDestinationsIn(BaseModel):
    destination_ids: List[PydanticObjectId]


@router.post("/{itinerary_id}/days/{day_id}/destinations")
async def update_day_destinations(
    itinerary_id: PydanticObjectId,
    day_id: PydanticObjectId,
    payload: DayDestinationsIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/update_day_destinations`."""
    day = await ItineraryDay.get(day_id)
    if not day or day.itinerary_id != itinerary_id:
        raise HTTPException(404, "Day not found")
    # First destination becomes primary
    if payload.destination_ids:
        day.destination_id = payload.destination_ids[0]
    await day.save()
    return {"updated": True, "day_id": str(day_id), "destinations": [str(x) for x in payload.destination_ids]}


class DayDescriptionsIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


@router.post("/{itinerary_id}/days/{day_id}/descriptions")
async def update_day_descriptions(
    itinerary_id: PydanticObjectId,
    day_id: PydanticObjectId,
    payload: DayDescriptionsIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/update_day_descriptions`."""
    day = await ItineraryDay.get(day_id)
    if not day or day.itinerary_id != itinerary_id:
        raise HTTPException(404, "Day not found")
    if payload.title is not None:
        day.title = payload.title
    if payload.description is not None:
        day.description = payload.description
    await day.save()
    return day.model_dump()


class DayInclusionsIn(BaseModel):
    inclusion_ids: List[PydanticObjectId]


@router.post("/{itinerary_id}/days/{day_id}/inclusions")
async def update_day_inclusions(
    itinerary_id: PydanticObjectId,
    day_id: PydanticObjectId,
    payload: DayInclusionsIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/update_day_inclusions`."""
    day = await ItineraryDay.get(day_id)
    if not day or day.itinerary_id != itinerary_id:
        raise HTTPException(404, "Day not found")
    return {
        "day_id": str(day_id),
        "inclusion_ids": [str(x) for x in payload.inclusion_ids],
    }


# ============== PUBLISH HTML + TOUR DEEP (Sprint A3) ==============

@router.get("/{itinerary_id}/publish-html")
async def publish_itinerary_html(
    itinerary_id: PydanticObjectId,
    template_id: Optional[PydanticObjectId] = None,
    template_type_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/itinerary_publish_html`. Returns publishable HTML snapshot."""
    it = await Itinerary.get(itinerary_id)
    if not it or it.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Itinerary not found")
    days = await ItineraryDay.find(ItineraryDay.itinerary_id == itinerary_id).sort("+day_number").to_list()
    return {
        "itinerary_id": str(itinerary_id),
        "name": it.name,
        "template_id": str(template_id) if template_id else None,
        "template_type_id": template_type_id,
        "days": [d.model_dump() for d in days],
        "html": f"<h1>{it.name}</h1><p>Day count: {len(days)}</p>",
    }


class TourInclusionExclusionIn(BaseModel):
    inclusions: List[str] = []
    exclusions: List[str] = []


@router.post("/tour/{tour_id}/inclusions-exclusions")
async def add_tour_inclusion_exclusion(
    tour_id: PydanticObjectId,
    payload: TourInclusionExclusionIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/add_inclision_exclusion_tour`."""
    tour = await TourItinerary.get(tour_id)
    if not tour or tour.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Tour not found")
    tour.inclusions = payload.inclusions
    tour.exclusions = payload.exclusions
    tour.updated_at = datetime.utcnow()
    await tour.save()
    return tour.model_dump()


@router.post("/tour/{tour_id}/settings")
async def add_tour_settings(
    tour_id: PydanticObjectId,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/add_itinerary_setting_tour`."""
    tour = await TourItinerary.get(tour_id)
    if not tour or tour.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Tour not found")
    tour.settings = {**(tour.settings or {}), **payload}
    tour.updated_at = datetime.utcnow()
    await tour.save()
    return tour.model_dump()


@router.get("/tour/{tour_id}/flights/details")
async def tour_flights_details(
    tour_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/itinerary_flights_details_tour/{id}`."""
    rows = await ItineraryFlight.find(
        {"tenant_id": current_user.tenant_id, "itinerary_id": tour_id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/tour/{tour_id}/email")
async def send_tour_email(
    tour_id: PydanticObjectId,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/send_itinerary_email_tour`."""
    tour = await TourItinerary.get(tour_id)
    if not tour or tour.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Tour not found")
    return {
        "tour_id": str(tour_id),
        "to": payload.get("to"),
        "subject": payload.get("subject", f"Tour: {tour.name}"),
        "queued": True,
    }


# ============== PDF PIPELINE ==============

class PDFRequestIn(BaseModel):
    itinerary_id: PydanticObjectId
    template_id: Optional[PydanticObjectId] = None
    template_type_id: Optional[int] = None


@router.post("/pdf/request")
async def request_pdf(
    payload: PDFRequestIn,
    current_user: User = Depends(get_current_user),
):
    """Queue PDF rendering job. Mirror old `/itinerary_pdf_new/...` GET."""
    obj = ItineraryPDFJob(
        tenant_id=current_user.tenant_id,
        itinerary_id=payload.itinerary_id,
        template_id=payload.template_id,
        template_type_id=payload.template_type_id,
        requested_by=current_user.id,
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/pdf/{job_id}/status")
async def get_pdf_status(
    job_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/check_pdf_status`."""
    obj = await ItineraryPDFJob.get(job_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Job not found")
    return obj.model_dump()


class PDFCallbackIn(BaseModel):
    job_id: PydanticObjectId
    status: str
    pdf_url: Optional[str] = None
    error: Optional[str] = None


@router.post("/pdf/callback", tags=["Public"])
async def pdf_callback(payload: PDFCallbackIn):
    """Mirror old `/pdf_response`. Public callback from Azure renderer."""
    obj = await ItineraryPDFJob.get(payload.job_id)
    if not obj:
        raise HTTPException(404, "Job not found")
    obj.status = payload.status
    obj.pdf_url = payload.pdf_url
    obj.error = payload.error
    obj.completed_at = datetime.utcnow()
    await obj.save()
    return {"received": True}
