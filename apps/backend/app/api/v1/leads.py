"""
Lead API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional
from bson import ObjectId
from io import BytesIO
from datetime import datetime, timedelta

from app.models.user import User
from app.models.lead import Lead
from app.models.lead_picklists import LeadStatus, Source, SourceMedium
from app.models.lead_custom_fields import UserLeadView
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse, LeadConvert
)
from app.services.lead_service import LeadService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

def lead_to_response(lead: Lead) -> LeadResponse:
    """Convert Lead model to LeadResponse with proper string conversion"""
    return LeadResponse(
        id=str(lead.id),
        salutation=lead.salutation,
        first_name=lead.first_name,
        middle_name=lead.middle_name,
        last_name=lead.last_name,
        email=lead.email,
        phone=lead.phone,
        mobile=lead.mobile,
        company=lead.company,
        title=lead.title,
        no_employees=lead.no_employees,
        website=lead.website,
        street=lead.street,
        city=lead.city,
        state=lead.state,
        zip=lead.zip,
        country=lead.country,
        lead_status_id=str(lead.lead_status_id) if lead.lead_status_id else None,
        rating_id=str(lead.rating_id) if lead.rating_id else None,
        industry_id=str(lead.industry_id) if lead.industry_id else None,
        source_id=str(lead.source_id) if lead.source_id else None,
        source_medium_id=str(lead.source_medium_id) if lead.source_medium_id else None,
        is_converted=lead.is_converted,
        opportunity_id=str(lead.opportunity_id) if lead.opportunity_id else None,
        converted_at=lead.converted_at,
        tenant_id=str(lead.tenant_id),
        owner_id=str(lead.owner_id),
        created_by=str(lead.created_by),
        last_modified_by_id=str(lead.last_modified_by_id) if lead.last_modified_by_id else None,
        destination_ids=[str(dest_id) for dest_id in lead.destination_ids],
        custom_fields=lead.custom_fields,
        view_count=lead.view_count,
        is_favorite=lead.is_favorite,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        deleted_at=lead.deleted_at,
        full_name=lead.full_name  # Add the computed full_name property
    )

@router.post("/", response_model=LeadResponse, status_code=201)
async def create_lead(
    lead_data: LeadCreate,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Create a new lead with comprehensive activity logging"""
    service = LeadService()
    
    # Set request context for activity logging
    service.set_request_context(request, current_user)
    
    lead = await service.create_lead(
        lead_data=lead_data,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_name=current_user.name or current_user.email,
        custom_fields=lead_data.custom_fields if hasattr(lead_data, 'custom_fields') else None,
        destination_ids=lead_data.destination_ids if hasattr(lead_data, 'destination_ids') else None
    )
    
    # Convert ObjectId to string for response
    lead_dict = lead.model_dump()
    lead_dict['id'] = str(lead.id)
    lead_dict['tenant_id'] = str(lead.tenant_id)
    lead_dict['owner_id'] = str(lead.owner_id)
    lead_dict['created_by'] = str(lead.created_by)
    lead_dict['full_name'] = f"{lead.first_name} {lead.last_name}".strip()
    
    return LeadResponse(**lead_dict)


@router.get("/", response_model=dict)
async def get_leads(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    owner_id: Optional[str] = None,
    is_converted: Optional[bool] = None,
    view: Optional[str] = Query(
        None,
        description="Predefined view filter: today, yesterday, last_week, recent, whatsapp, all, etc.",
    ),
    current_user: User = Depends(get_current_user),
):
    """Get all leads with pagination and optional predefined views."""
    try:
        service = LeadService()

        # Initialize lists
        all_leads: list[Lead] = []
        lead_statuses = []
        sources = []
        users = []

        # 1. Build base query / special view queries
        print("DEBUG: Fetching leads...")
        try:
            # Normal query: by tenant, optional owner / conversion / date filters
            if view in (None, "", "all", "lead_check_count"):
                filters = [
                    Lead.tenant_id == current_user.tenant_id,
                    Lead.deleted_at == None,  # noqa: E711
                ]

                if owner_id:
                    filters.append(Lead.owner_id == ObjectId(owner_id))

                if is_converted is not None:
                    filters.append(Lead.is_converted == is_converted)

                # Date-based views
                now = datetime.utcnow()
                today_start = datetime(now.year, now.month, now.day)
                tomorrow_start = today_start + timedelta(days=1)
                yesterday_start = today_start - timedelta(days=1)
                last_week_start = today_start - timedelta(days=7)

                if view in ("today", "todays_lead", "todays"):
                    filters.append(Lead.created_at >= today_start)
                    filters.append(Lead.created_at < tomorrow_start)
                elif view == "yesterday":
                    filters.append(Lead.created_at >= yesterday_start)
                    filters.append(Lead.created_at < today_start)
                elif view == "last_week":
                    filters.append(Lead.created_at >= last_week_start)
                    filters.append(Lead.created_at < tomorrow_start)

                # Channel-based views
                if view == "whatsapp":
                    whatsapp_mediums = await SourceMedium.find(
                        SourceMedium.tenant_id == current_user.tenant_id,
                        SourceMedium.is_active == True,  # noqa: E712
                        SourceMedium.name.regex("(?i)^whatsapp"),
                    ).to_list()
                    medium_ids = [m.id for m in whatsapp_mediums]
                    if medium_ids:
                        filters.append(Lead.source_medium_id.in_(medium_ids))

                all_leads = (
                    await Lead.find(*filters).sort("-created_at").to_list()
                )

            # Recently viewed: use UserLeadView ordering
            elif view in ("recent", "recently_viewed"):
                recent_views = (
                    await UserLeadView.find(
                        UserLeadView.user_id == current_user.id,
                        UserLeadView.tenant_id == current_user.tenant_id,
                    )
                    .sort("-updated_at")
                    .limit(200)
                    .to_list()
                )
                lead_ids = [rv.lead_id for rv in recent_views]
                if lead_ids:
                    leads = await Lead.find(
                        Lead.id.in_(lead_ids),
                        Lead.deleted_at == None,  # noqa: E711
                    ).to_list()
                    lead_map = {l.id: l for l in leads}
                    all_leads = [lead_map[lid] for lid in lead_ids if lid in lead_map]
                else:
                    all_leads = []

            print(f"DEBUG: Found {len(all_leads)} leads for view={view}")
        except Exception as e:  # pragma: no cover - debug logging
            print(f"ERROR: Failed to fetch leads: {e}")

        # Paginate
        total = len(all_leads)
        skip = (page - 1) * per_page
        leads = all_leads[skip : skip + per_page]
        pages = (total + per_page - 1) // per_page if per_page > 0 else 0

        # 2. Get lead statuses
        print("DEBUG: Fetching lead statuses...")
        try:
            lead_statuses = await LeadStatus.find(
                LeadStatus.is_active == True  # noqa: E712
            ).sort("+sorting").to_list()
        except Exception as e:  # pragma: no cover - debug logging
            print(f"ERROR: Failed to fetch lead statuses: {e}")

        # 3. Get sources
        print("DEBUG: Fetching sources...")
        try:
            sources = await Source.find(
                Source.tenant_id == current_user.tenant_id,
                Source.is_active == True,  # noqa: E712
            ).sort("+sorting").to_list()
        except Exception as e:  # pragma: no cover - debug logging
            print(f"ERROR: Failed to fetch sources: {e}")

        # 4. Get users
        print("DEBUG: Fetching users...")
        try:
            users = await User.find(
                User.tenant_id == current_user.tenant_id,
                User.is_active == True,  # noqa: E712
            ).sort("+name").to_list()
        except Exception as e:  # pragma: no cover - debug logging
            print(f"ERROR: Failed to fetch users: {e}")

        return {
            "leads": [
                {
                    "id": str(l.id),
                    "salutation": l.salutation,
                    "first_name": l.first_name,
                    "middle_name": l.middle_name,
                    "last_name": l.last_name,
                    "full_name": l.full_name,
                    "email": l.email,
                    "phone": l.phone,
                    "mobile": l.mobile,
                    "company": l.company,
                    "title": l.title,
                    "no_employees": l.no_employees,
                    "website": l.website,
                    "street": l.street,
                    "city": l.city,
                    "state": l.state,
                    "zip": l.zip,
                    "country": l.country,
                    "lead_status_id": str(l.lead_status_id) if l.lead_status_id else None,
                    "rating_id": str(l.rating_id) if l.rating_id else None,
                    "industry_id": str(l.industry_id) if l.industry_id else None,
                    "source_id": str(l.source_id) if l.source_id else None,
                    "source_medium_id": str(l.source_medium_id) if l.source_medium_id else None,
                    "is_converted": l.is_converted,
                    "opportunity_id": str(l.opportunity_id) if l.opportunity_id else None,
                    "tenant_id": str(l.tenant_id),
                    "owner_id": str(l.owner_id),
                    "created_by": str(l.created_by) if l.created_by else "",
                    "view_count": l.view_count,
                    "created_at": l.created_at,
                    "updated_at": l.updated_at,
                }
                for l in leads
            ],
            "pagination": {
                "current_page": page,
                "total": total,
                "per_page": per_page,
                "pages": pages,
            },
            "lead_statuses": [
                {"id": str(ls.id), "name": ls.name, "color": ls.color}
                for ls in lead_statuses
            ],
            "sources": [
                {"id": str(s.id), "name": s.name}
                for s in sources
            ],
            "users": [
                {"id": str(u.id), "name": u.name, "email": u.email}
                for u in users
            ],
        }
    except Exception as e:
        import traceback

        print(f"Error in get_leads: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching leads: {str(e)}")


@router.get("/search")
async def search_leads(
    query: Optional[str] = None,
    lead_status_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Search leads"""
    service = LeadService()
    
    skip = (page - 1) * per_page
    leads, total = await service.search_leads(
        query,
        current_user.tenant_id,
        lead_status_id=lead_status_id,
        skip=skip,
        limit=per_page
    )
    
    return {
        "leads": [lead_to_response(l) for l in leads],
        "total": total
    }


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get lead by ID"""
    service = LeadService()
    lead = await service.get_lead(lead_id, current_user.tenant_id)
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Increment view count
    await lead.increment_view_count()
    
    return lead_to_response(lead)


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Update a lead with comprehensive activity logging"""
    service = LeadService()
    
    # Set request context for activity logging
    service.set_request_context(request, current_user)
    
    lead = await service.update_lead(
        lead_id=lead_id,
        lead_data=lead_data,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_name=f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Convert ObjectId to string for response
    lead_dict = lead.model_dump()
    lead_dict['id'] = str(lead.id)
    lead_dict['tenant_id'] = str(lead.tenant_id)
    lead_dict['owner_id'] = str(lead.owner_id)
    lead_dict['created_by'] = str(lead.created_by)
    lead_dict['full_name'] = f"{lead.first_name} {lead.last_name}".strip()
    
    return LeadResponse(**lead_dict)


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Delete a lead with comprehensive activity logging"""
    service = LeadService()
    
    # Set request context for activity logging
    service.set_request_context(request, current_user)
    
    success = await service.delete_lead(
        lead_id=lead_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        user_name=f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"error": False, "message": "Lead deleted successfully"}


@router.post("/{lead_id}/convert")
async def convert_lead(
    lead_id: str,
    conversion_data: LeadConvert,
    current_user: User = Depends(get_current_user)
):
    """Convert lead to opportunity"""
    service = LeadService()
    
    try:
        print(f"DEBUG: Converting lead {lead_id}")
        print(f"DEBUG: Conversion data: {conversion_data}")
        print(f"DEBUG: User: {current_user.id}, Tenant: {current_user.tenant_id}")
        
        result = await service.convert_lead(
            lead_id,
            conversion_data,
            current_user.id,
            current_user.tenant_id
        )
        
        return {
            "error": False,
            "message": "Lead converted successfully",
            **result
        }
    except ValueError as e:
        print(f"DEBUG: ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"DEBUG: Unexpected error: {e}")
        print(f"DEBUG: Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/change-owner")
async def change_lead_owner(
    lead_id: str = Query(...),
    new_owner_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_lead"))
):
    """Change lead owner"""
    service = LeadService()
    
    lead = await service.change_owner(
        lead_id,
        ObjectId(new_owner_id),
        current_user.id,
        current_user.tenant_id
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Convert ObjectId to string for response
    lead_dict = lead.model_dump()
    lead_dict['id'] = str(lead.id)
    lead_dict['tenant_id'] = str(lead.tenant_id)
    lead_dict['owner_id'] = str(lead.owner_id)
    lead_dict['created_by'] = str(lead.created_by)
    lead_dict['full_name'] = f"{lead.first_name} {lead.last_name}".strip()
    
    return {
        "error": False,
        "message": "Lead ownership updated successfully",
        "lead": LeadResponse(**lead_dict)
    }


@router.post("/single-column")
async def update_single_column(
    lead_id: str = Query(...),
    field_name: str = Query(...),
    field_value: str = Query(...),
    current_user: User = Depends(check_permission("edit_lead"))
):
    """Update a single column of a lead"""
    lead = await Lead.get(ObjectId(lead_id))
    
    if not lead or lead.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Update the field
    if hasattr(lead, field_name):
        setattr(lead, field_name, field_value)
        lead.last_modified_by_id = current_user.id
        await lead.save()
        
        # Convert ObjectId to string for response
        lead_dict = lead.model_dump()
        lead_dict['id'] = str(lead.id)
        lead_dict['tenant_id'] = str(lead.tenant_id)
        lead_dict['owner_id'] = str(lead.owner_id)
        lead_dict['created_by'] = str(lead.created_by)
        lead_dict['full_name'] = f"{lead.first_name} {lead.last_name}".strip()
        
        return {
            "error": False,
            "message": f"{field_name} updated successfully",
            "lead": LeadResponse(**lead_dict)
        }
    else:
        raise HTTPException(status_code=400, detail=f"Invalid field: {field_name}")


@router.post("/import")
async def import_leads(
    file: UploadFile = File(...),
    current_user: User = Depends(check_permission("create_lead"))
):
    """Import leads from CSV or Excel file"""
    from app.services.import_export_service import ImportExportService
    
    service = ImportExportService()
    # TODO: Implement import_leads_from_file method
    
    return {
        "error": False,
        "message": "Import functionality coming soon"
    }


@router.get("/export/{format}")
async def export_leads(
    format: str,
    current_user: User = Depends(check_permission("view_lead"))
):
    """Export leads to CSV or Excel"""
    from app.services.import_export_service import ImportExportService
    
    # Get all leads for export
    leads = await Lead.find(
        Lead.tenant_id == current_user.tenant_id,
        Lead.deleted_at == None
    ).to_list()
    
    # TODO: Implement export_leads_to_excel method
    
    return {
        "error": False,
        "message": "Export functionality coming soon"
    }
