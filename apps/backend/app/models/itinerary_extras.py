"""
Phase 5 — Itinerary engine extension models.

Augments existing Itinerary / ItineraryDay with: schedule items, hotels, flights,
categories, sub-categories, inclusions, header/footer templates,
proforma invoices, and tour itineraries (separate parallel collection for the
legacy 'tour' engine).
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ItineraryCategory(Document):
    tenant_id: Indexed(PydanticObjectId)
    name: Indexed(str)
    description: Optional[str] = None
    sorting: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "itinerary_categories"


class ItinerarySubCategory(Document):
    tenant_id: Indexed(PydanticObjectId)
    category_id: Indexed(PydanticObjectId)
    name: Indexed(str)
    sorting: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "itinerary_sub_categories"


class ItineraryScheduleItem(Document):
    """Time-slotted activity inside an itinerary day."""
    tenant_id: Indexed(PydanticObjectId)
    itinerary_id: Indexed(PydanticObjectId)
    day_id: Indexed(PydanticObjectId)
    sequence: int = 0
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "itinerary_schedule_items"


class ItineraryHotel(Document):
    tenant_id: Indexed(PydanticObjectId)
    itinerary_id: Indexed(PydanticObjectId)
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "itinerary_hotels"


class ItineraryFlight(Document):
    tenant_id: Indexed(PydanticObjectId)
    itinerary_id: Indexed(PydanticObjectId)
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "itinerary_flights"


class ItineraryInclusion(Document):
    tenant_id: Indexed(PydanticObjectId)
    name: str
    description: Optional[str] = None
    is_active: bool = True
    sorting: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "itinerary_inclusions"


class UserItineraryInclusion(Document):
    """Per-user/tenant custom inclusion overrides used in builder."""
    tenant_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)
    name: str
    body_html: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "user_itinerary_inclusions"


class ItineraryHeaderFooter(Document):
    """Reusable header/footer/banner blocks for PDF rendering."""
    tenant_id: Indexed(PydanticObjectId)
    type: Indexed(str)               # header | footer | banner
    name: str
    body_html: Optional[str] = None
    image_url: Optional[str] = None
    is_default: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "itinerary_header_footers"


class ProformaInvoice(Document):
    tenant_id: Indexed(PydanticObjectId)
    opportunity_id: Optional[PydanticObjectId] = None
    itinerary_id: Optional[PydanticObjectId] = None
    invoice_no: Optional[str] = None

    issued_to_name: Optional[str] = None
    issued_to_email: Optional[str] = None
    issued_to_address: Optional[str] = None

    line_items: List[Dict[str, Any]] = Field(default_factory=list)
    sub_total: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total: float = 0
    currency: str = "INR"

    status: str = "draft"            # draft | sent | paid | cancelled
    pdf_url: Optional[str] = None
    sent_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    created_by: Indexed(PydanticObjectId)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "proforma_invoices"


class TourItinerary(Document):
    """Parallel 'tour' itinerary engine — preserves legacy data shape."""
    tenant_id: Indexed(PydanticObjectId)
    name: Indexed(str)
    description: Optional[str] = None
    total_days: int
    total_nights: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    departure_dates: List[datetime] = Field(default_factory=list)
    base_price: Optional[float] = None
    currency: Optional[str] = "INR"
    inclusions: List[str] = Field(default_factory=list)
    exclusions: List[str] = Field(default_factory=list)
    settings: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    created_by: Indexed(PydanticObjectId)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tour_itineraries"


class ItineraryPDFJob(Document):
    """Async PDF generation job tracking (Azure renderer callback target)."""
    tenant_id: Indexed(PydanticObjectId)
    itinerary_id: Indexed(PydanticObjectId)
    template_id: Optional[PydanticObjectId] = None
    template_type_id: Optional[int] = None
    status: str = "pending"          # pending | rendering | done | failed
    pdf_url: Optional[str] = None
    error: Optional[str] = None
    requested_by: Indexed(PydanticObjectId)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    class Settings:
        name = "itinerary_pdf_jobs"
