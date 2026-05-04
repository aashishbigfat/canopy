"""
Supplier API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from bson import ObjectId

from app.models.user import User
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse
)
from app.services.supplier_service import SupplierService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

@router.get("/form-data")
async def get_supplier_form_data(current_user: User = Depends(get_current_user)):
    """Get metadata for supplier creation/editing forms (industry-aware)"""
    import logging
    logger = logging.getLogger(__name__)
    # Use alias to avoid shadowing the SupplierService class imported from services
    from app.models.picklists import SupplierService as SupplierServicePicklist
    from app.models.tenant import Tenant

    # Determine industry for this tenant
    tenant = await Tenant.get(current_user.tenant_id)
    industry = tenant.industry if tenant else "travel"

    # Industry-specific default services to auto-seed
    INDUSTRY_SERVICES = {
        "travel": [
            "Accommodation", "Air Tickets", "Amusement Park", "Angling", "Biking", "Bungee Jumping",
            "Camping", "Casino", "Chopper Ride", "Currency Exchange", "Cycling",
            "Desert Safari", "Escorting", "Event Management", "Fixed Departures",
            "Food and Beverages", "Golf", "Guiding", "Hiking", "Horse Riding",
            "Hot Air Ballooning", "Kayaking", "Marketing and Promotion", "Microlight Flying",
            "Mountaineering", "Packaged Tours", "Paragliding", "Paramotoring", "Parasailing",
            "Pilgrimage", "Rafting", "Sea Plane", "Self Drive", "Sim Cards", "Skiing",
            "Skydiving", "Snorkeling and Scuba Diving", "Souvenirs", "Surfing",
            "Transportation", "Travel Accessories", "Travel Insurance", "Travel Publication",
            "Travel Technology", "Trekking", "Visa", "Wild Life Safari", "Zip-lining", "Yacht Rental"
        ],
        "healthcare": [
            "Lab Services", "Radiology", "Pharmacy", "Surgery Center", "Consultation",
            "Physical Therapy", "Home Care", "Medical Devices", "Ambulance Service",
            "Medical Supplies", "Pathology", "Nursing Services", "Rehabilitation",
            "Mental Health Services", "Dental Services", "Optometry",
        ],
        "education": [
            "Tutoring", "Counseling", "Test Prep", "Placement Services", "Library Services",
            "Lab Access", "Campus Housing", "Certification", "Student Transport",
            "E-Learning Platform", "Publishing", "Career Guidance", "Scholarship Admin",
        ],
        "manufacturing": [
            "Raw Materials", "Machining", "Casting", "Tooling", "Logistics",
            "Quality Testing", "Assembly", "Packaging", "Warehousing",
            "Surface Treatment", "Welding", "CNC Services", "3D Printing",
        ],
    }

    # Industry-specific supplier types
    INDUSTRY_SUPPLIER_TYPES = {
        "travel": [
            "DMC", "Airlines", "Hotel", "Tour Operator", "Visa Facilitator",
            "Transporters", "Embassy", "Travel Insurance", "Miscellaneous",
        ],
        "healthcare": [
            "Hospital", "Clinic", "Laboratory", "Pharmacy", "Medical Device Supplier",
            "Insurance Company", "Ambulance Service", "Specialist Practice", "Miscellaneous",
        ],
        "education": [
            "University", "College", "Coaching Center", "Testing Agency",
            "Publisher", "Ed-Tech Platform", "Placement Agency", "Miscellaneous",
        ],
        "manufacturing": [
            "Raw Material Supplier", "Component Vendor", "OEM", "Contract Manufacturer",
            "Logistics Provider", "Quality Lab", "Tooling Supplier", "Miscellaneous",
        ],
    }

    DEFAULT_SERVICES = INDUSTRY_SERVICES.get(industry, INDUSTRY_SERVICES["travel"])

    # Auto-seed logic for dynamic picklists
    service_count = await SupplierServicePicklist.find({"tenant_id": current_user.tenant_id}).count()
    if service_count == 0:
        services_to_insert = [
            SupplierServicePicklist(
                name=service,
                tenant_id=current_user.tenant_id,
                sorting=i
            ) for i, service in enumerate(DEFAULT_SERVICES)
        ]
        try:
            await SupplierServicePicklist.insert_many(services_to_insert)
        except Exception as e:
            logger.error("Error seeding supplier services: %s", e)

    users = await User.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+name").to_list()

    services = await SupplierServicePicklist.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+sorting").to_list()

    return {
        "users": [{"id": str(u.id), "name": u.name} for u in users],
        "services": [{"id": str(s.id), "name": s.name} for s in services],
        "current_user_name": current_user.name,
        "supplier_types": INDUSTRY_SUPPLIER_TYPES.get(industry, INDUSTRY_SUPPLIER_TYPES["travel"]),
        "industry": industry,
    }

@router.post("/", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(check_permission("create_supplier"))
):
    """Create a new supplier"""
    service = SupplierService()
    supplier = await service.create_supplier(
        supplier_data,
        current_user.id,
        current_user.tenant_id,
        custom_fields=getattr(supplier_data, "custom_fields", None),
    )

    return SupplierResponse.from_orm(supplier)


@router.get("/", response_model=SupplierListResponse)
async def get_suppliers(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    supplier_type: Optional[str] = None,
    is_preferred: Optional[bool] = None,
    current_user: User = Depends(check_permission("view_supplier"))
):
    """Get all suppliers with pagination"""
    service = SupplierService()
    
    skip = (page - 1) * per_page
    suppliers, total = await service.get_suppliers_by_tenant(
        current_user.tenant_id,
        skip=skip,
        limit=per_page,
        supplier_type=supplier_type,
        is_preferred=is_preferred
    )
    
    pages = (total + per_page - 1) // per_page
    
    return SupplierListResponse(
        suppliers=[SupplierResponse.from_orm(s) for s in suppliers],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )


@router.get("/search")
async def search_suppliers(
    query: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(check_permission("view_supplier"))
):
    """Search suppliers"""
    service = SupplierService()
    
    skip = (page - 1) * per_page
    suppliers, total = await service.search_suppliers(
        query,
        current_user.tenant_id,
        skip=skip,
        limit=per_page
    )
    
    return {
        "suppliers": [SupplierResponse.from_orm(s) for s in suppliers],
        "total": total
    }


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: str,
    current_user: User = Depends(check_permission("view_supplier"))
):
    """Get supplier by ID"""
    service = SupplierService()
    supplier = await service.get_supplier(supplier_id, current_user.tenant_id)

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    resp = SupplierResponse.from_orm(supplier)
    # Sprint D — populate custom_fields
    try:
        from app.services import field_registry_service
        resp.custom_fields = await field_registry_service.read_custom_field_values(
            "supplier", supplier.id, current_user.tenant_id,
        )
    except Exception:
        resp.custom_fields = {}
    return resp


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    supplier_data: SupplierUpdate,
    current_user: User = Depends(check_permission("edit_supplier"))
):
    """Update a supplier"""
    service = SupplierService()
    supplier = await service.update_supplier(
        supplier_id,
        supplier_data,
        current_user.id,
        current_user.tenant_id,
        custom_fields=getattr(supplier_data, "custom_fields", None),
    )
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return SupplierResponse.from_orm(supplier)


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    current_user: User = Depends(check_permission("delete_supplier"))
):
    """Delete a supplier (soft delete)"""
    service = SupplierService()
    success = await service.delete_supplier(supplier_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return {
        "error": False,
        "message": "Supplier deleted successfully"
    }


@router.post("/opportunity/{opportunity_id}/link")
async def link_supplier_to_opportunity(
    opportunity_id: str,
    supplier_id: str = Query(...),
    cost: Optional[float] = None,
    notes: Optional[str] = None,
    email_subject: Optional[str] = None,
    email_body: Optional[str] = None,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Link supplier to opportunity"""
    service = SupplierService()
    
    await service.link_to_opportunity(
        opportunity_id,
        supplier_id,
        current_user.tenant_id,
        cost=cost,
        notes=notes,
        email_subject=email_subject,
        email_body=email_body
    )
    
    return {
        "error": False,
        "message": "Supplier linked to opportunity successfully"
    }


@router.delete("/opportunity/{opportunity_id}/unlink")
async def unlink_supplier_from_opportunity(
    opportunity_id: str,
    supplier_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Unlink supplier from opportunity"""
    service = SupplierService()
    
    success = await service.unlink_from_opportunity(opportunity_id, supplier_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {
        "error": False,
        "message": "Supplier unlinked from opportunity successfully"
    }


@router.get("/opportunity/{opportunity_id}")
async def get_opportunity_suppliers(
    opportunity_id: str,
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """Get all suppliers for an opportunity"""
    service = SupplierService()
    
    suppliers = await service.get_suppliers_for_opportunity(
        opportunity_id,
        current_user.tenant_id
    )
    
    return {
        "suppliers": [
            {
                "supplier": SupplierResponse.from_orm(s["supplier"]),
                "cost": s["cost"],
                "notes": s["notes"],
                "email_subject": s.get("email_subject"),
                "email_body": s.get("email_body")
            }
            for s in suppliers
        ],
        "total": len(suppliers)
    }


# ==================== Supplier Contacts (Standalone Collection) ====================

from app.models.supplier_contact import SupplierContact
from app.schemas.supplier_contact import (
    SupplierContactCreate, SupplierContactUpdate, SupplierContactResponse
)
from datetime import datetime


@router.get("/{supplier_id}/contacts")
async def get_supplier_contacts(
    supplier_id: str,
    current_user: User = Depends(check_permission("view_supplier"))
):
    """Get all contacts for a supplier"""
    service = SupplierService()
    supplier = await service.get_supplier(supplier_id, current_user.tenant_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    contacts = await SupplierContact.find(
        SupplierContact.supplier_id == ObjectId(supplier_id),
        SupplierContact.tenant_id == current_user.tenant_id,
        SupplierContact.deleted_at == None,
    ).sort([("is_primary", -1), ("name", 1)]).to_list()

    return {
        "contacts": [SupplierContactResponse.from_doc(c) for c in contacts],
        "total": len(contacts)
    }


@router.post("/{supplier_id}/contacts", status_code=201)
async def create_supplier_contact(
    supplier_id: str,
    data: SupplierContactCreate,
    current_user: User = Depends(check_permission("edit_supplier"))
):
    """Add a new contact to a supplier"""
    service = SupplierService()
    supplier = await service.get_supplier(supplier_id, current_user.tenant_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # If this is marked primary, unset existing primary contacts
    if data.is_primary:
        existing_primaries = await SupplierContact.find(
            SupplierContact.supplier_id == ObjectId(supplier_id),
            SupplierContact.tenant_id == current_user.tenant_id,
            SupplierContact.is_primary == True,
            SupplierContact.deleted_at == None,
        ).to_list()
        for c in existing_primaries:
            c.is_primary = False
            await c.save()

    contact = SupplierContact(
        **data.model_dump(),
        supplier_id=ObjectId(supplier_id),
        tenant_id=current_user.tenant_id,
    )
    await contact.insert()

    return SupplierContactResponse.from_doc(contact)


@router.put("/{supplier_id}/contacts/{contact_id}")
async def update_supplier_contact(
    supplier_id: str,
    contact_id: str,
    data: SupplierContactUpdate,
    current_user: User = Depends(check_permission("edit_supplier"))
):
    """Update a supplier contact"""
    contact = await SupplierContact.get(ObjectId(contact_id))
    if not contact or contact.supplier_id != ObjectId(supplier_id) or contact.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Contact not found")

    update_data = data.model_dump(exclude_unset=True)

    # If setting as primary, unset others
    if update_data.get("is_primary"):
        existing_primaries = await SupplierContact.find(
            SupplierContact.supplier_id == ObjectId(supplier_id),
            SupplierContact.tenant_id == current_user.tenant_id,
            SupplierContact.is_primary == True,
            SupplierContact.deleted_at == None,
        ).to_list()
        for c in existing_primaries:
            if str(c.id) != contact_id:
                c.is_primary = False
                await c.save()

    for key, value in update_data.items():
        setattr(contact, key, value)

    await contact.save()

    return SupplierContactResponse.from_doc(contact)


@router.delete("/{supplier_id}/contacts/{contact_id}")
async def delete_supplier_contact(
    supplier_id: str,
    contact_id: str,
    current_user: User = Depends(check_permission("edit_supplier"))
):
    """Delete a supplier contact"""
    contact = await SupplierContact.get(ObjectId(contact_id))
    if not contact or contact.supplier_id != ObjectId(supplier_id) or contact.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Contact not found")

    await contact.delete()

    return {"error": False, "message": "Supplier contact deleted successfully"}

