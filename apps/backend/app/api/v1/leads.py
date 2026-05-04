"""
Lead API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from bson import ObjectId
from io import BytesIO
from datetime import datetime, timedelta
import logging

from app.models.user import User
from app.models.lead import Lead
from app.models.tenant import Tenant
from app.models.lead_picklists import LeadStatus, Source, SourceMedium
from app.models.lead_custom_fields import UserLeadView
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse, LeadConvert,
    LeadOwnerChange
)
from app.schemas.industry_data import validate_industry_data
from app.services.lead_service import LeadService
from app.api.deps import get_current_user, check_permission

logger = logging.getLogger(__name__)

router = APIRouter()

def get_lead_service():
    return LeadService()

# Helper function is no longer needed as we use LeadResponse.model_validate via response_model

async def _resolve_destinations(industry_data: dict) -> dict:
    if not industry_data or "destination_ids" not in industry_data:
        return industry_data
    
    dest_ids = industry_data.get("destination_ids", [])
    if not dest_ids:
        industry_data["destination_names"] = []
        return industry_data
        
    from app.models.destination import Destination
    from bson import ObjectId
    
    valid_ids = []
    for d_id in dest_ids:
        try:
            valid_ids.append(ObjectId(d_id))
        except:
            pass
            
    if valid_ids:
        dests = await Destination.find({"_id": {"$in": valid_ids}}).to_list()
        name_map = {str(d.id): d.name for d in dests}
        industry_data["destination_names"] = [name_map[str(d_id)] for d_id in dest_ids if str(d_id) in name_map]
    else:
        industry_data["destination_names"] = []
        
    return industry_data

@router.post("/", response_model=LeadResponse, status_code=201)
async def create_lead(
    request: Request,
    current_user: User = Depends(check_permission("create_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Create a new lead -- unified schema for all industries"""
    service.set_request_context(request, current_user)
    body = await request.json()
    
    # Determine tenant industry
    tenant = await Tenant.get(current_user.tenant_id)
    industry = tenant.industry if tenant else "travel"
    
    try:
        # Unified schema -- no more dual routing
        lead_data = LeadCreate(**body)
        
        # Validate industry_data block if present
        if lead_data.industry_data:
            lead_data.industry_data = validate_industry_data(
                industry, lead_data.industry_data, mode="lead"
            )
            # Resolve destination IDs to names
            lead_data.industry_data = await _resolve_destinations(lead_data.industry_data)
        
        lead = await service.create_lead(
            lead_data=lead_data,
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            user_name=current_user.name or current_user.email,
            custom_fields=lead_data.custom_fields if hasattr(lead_data, 'custom_fields') else None
        )
        return lead
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during lead creation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=LeadListResponse)
async def get_leads(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    owner_id: Optional[str] = None,
    is_converted: Optional[bool] = None,
    view: Optional[str] = Query(
        None,
        description="Predefined view filter: today, yesterday, last_week, recent, whatsapp, all, etc.",
    ),
    current_user: User = Depends(check_permission("view_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Get all leads with pagination and optional predefined views."""
    from app.services.visibility_scope import get_visible_owner_ids
    
    visible_owner_ids = await get_visible_owner_ids(current_user)
    
    result = await service.get_leads_with_metadata(
        tenant_id=current_user.tenant_id,
        page=page,
        per_page=per_page,
        owner_id=owner_id,
        is_converted=is_converted,
        view=view,
        current_user_id=current_user.id,
        visible_owner_ids=visible_owner_ids
    )
    
    # Resolve destinations for each lead
    for lead in result["leads"]:
        if lead.industry_data and "destination_ids" in lead.industry_data:
            lead.industry_data = await _resolve_destinations(lead.industry_data)
            
    return result


@router.get("/search")
async def search_leads(
    query: Optional[str] = None,
    lead_status_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(check_permission("view_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Search leads"""
    from app.services.visibility_scope import get_visible_owner_ids
    skip = (page - 1) * per_page
    visible_owner_ids = await get_visible_owner_ids(current_user)
    leads, total = await service.search_leads(
        query,
        current_user.tenant_id,
        lead_status_id=lead_status_id,
        skip=skip,
        limit=per_page,
        visible_owner_ids=visible_owner_ids
    )
    
    return {
        "leads": leads,
        "total": total
    }


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(check_permission("view_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Get lead by ID"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    lead = await service.get_lead(lead_id, current_user.tenant_id)
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Visibility check: user must have scope to see this owner's records
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_record_visible(lead.owner_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Increment view count
    await lead.increment_view_count()
    
    # Resolve creator and modifier names for the response
    creator = await User.get(lead.created_by)
    modifier = await User.get(lead.last_modified_by_id) if lead.last_modified_by_id else None
    
    lead_response = LeadResponse.model_validate(lead)

    # Sprint D — populate custom_fields via bulk read helper
    try:
        from app.services import field_registry_service
        lead_response.custom_fields = await field_registry_service.read_custom_field_values(
            "lead", lead.id, current_user.tenant_id,
        )
    except Exception:
        lead_response.custom_fields = {}

    # Resolve destinations if in travel industry
    if lead_response.industry_data and "destination_ids" in lead_response.industry_data:
        lead_response.industry_data = await _resolve_destinations(lead_response.industry_data)

    lead_response.created_by_name = creator.name if creator else "Unknown"
    lead_response.last_modified_by_name = modifier.name if modifier else None
    
    # Populate owner_name
    owner = await User.get(lead.owner_id)
    lead_response.owner_name = owner.name if owner else "Unknown"
    
    return lead_response


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    request: Request,
    current_user: User = Depends(check_permission("edit_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Update a lead -- unified schema for all industries"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    service.set_request_context(request, current_user)
    body = await request.json()
    
    # Determine tenant industry
    tenant = await Tenant.get(current_user.tenant_id)
    industry = tenant.industry if tenant else "travel"
    
    # Visibility pre-check
    existing = await service.get_lead(lead_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_record_visible(existing.owner_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Lead not found")
    
    try:
        lead_data = LeadUpdate(**body)
        if lead_data.industry_data:
            lead_data.industry_data = validate_industry_data(
                industry, lead_data.industry_data, mode="lead"
            )
            # Resolve destination IDs to names
            lead_data.industry_data = await _resolve_destinations(lead_data.industry_data)
        
        lead = await service.update_lead(
            lead_id=lead_id,
            lead_data=lead_data,
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            user_name=current_user.name.strip() or current_user.email,
            custom_fields=lead_data.custom_fields if hasattr(lead_data, 'custom_fields') else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during lead update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return lead


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    request: Request,
    current_user: User = Depends(check_permission("delete_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Delete a lead with comprehensive activity logging"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    # Set request context for activity logging
    service.set_request_context(request, current_user)
    
    # Visibility pre-check
    existing = await service.get_lead(lead_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_record_visible(existing.owner_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Lead not found")
    
    success = await service.delete_lead(
        lead_id=lead_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        user_name=current_user.name.strip() or current_user.email
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"error": False, "message": "Lead deleted successfully"}


@router.post("/{lead_id}/convert")
async def convert_lead(
    lead_id: str,
    request: Request,
    current_user: User = Depends(check_permission("edit_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Convert lead to opportunity -- unified schema for all industries"""
    body = await request.json()
    
    # Determine tenant industry
    tenant = await Tenant.get(current_user.tenant_id)
    industry = tenant.industry if tenant else "travel"
    
    try:
        conversion_data = LeadConvert(**body)
        if conversion_data.industry_data:
            conversion_data.industry_data = validate_industry_data(
                industry, conversion_data.industry_data, mode="opportunity"
            )
        
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
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during lead conversion: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{lead_id}/conversion-suggestions")
async def get_conversion_suggestions(
    lead_id: str,
    current_user: User = Depends(check_permission("view_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Get potential duplicate accounts and contacts for a lead"""
    try:
        suggestions = await service.get_conversion_suggestions(lead_id, current_user.tenant_id)
        return suggestions
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{lead_id}/change-owner", response_model=Dict[str, Any])
async def change_lead_owner(
    lead_id: str,
    owner_change: LeadOwnerChange,
    current_user: User = Depends(check_permission("edit_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Change lead owner"""
    lead = await service.change_owner(
        lead_id,
        ObjectId(owner_change.new_owner_id),
        current_user.id,
        current_user.tenant_id
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Resolve creator, modifier and owner names for the response
    creator = await User.get(lead.created_by)
    modifier = await User.get(lead.last_modified_by_id) if lead.last_modified_by_id else None
    owner = await User.get(lead.owner_id)
    
    lead_response = LeadResponse.model_validate(lead)
    lead_response.created_by_name = creator.name if creator else "Unknown"
    lead_response.last_modified_by_name = modifier.name if modifier else None
    lead_response.owner_name = owner.name if owner else "Unknown"
    
    return {
        "error": False,
        "message": "Lead ownership updated successfully",
        "lead": lead_response
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
        {"tenant_id": current_user.tenant_id, "deleted_at": None}
    ).to_list()
    
    # TODO: Implement export_leads_to_excel method
    
    return {
        "error": False,
        "message": "Export functionality coming soon"
    }


@router.post("/bulk-delete")
async def bulk_delete_leads(
    lead_ids: List[str],
    current_user: User = Depends(check_permission("delete_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Bulk delete leads"""
    result = await service.bulk_delete(lead_ids, current_user.tenant_id, current_user.id)
    return result


@router.post("/bulk-change-owner")
async def bulk_change_lead_owner(
    lead_ids: List[str],
    new_owner_id: str,
    current_user: User = Depends(check_permission("edit_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Bulk change lead owner"""
    result = await service.bulk_change_owner(
        lead_ids, 
        new_owner_id, 
        current_user.tenant_id, 
        current_user.id
    )
    return result

