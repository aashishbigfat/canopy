"""
Lead API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
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

def get_lead_service():
    return LeadService()

# Helper function is no longer needed as we use LeadResponse.model_validate via response_model

@router.post("/", response_model=LeadResponse, status_code=201)
async def create_lead(
    lead_data: LeadCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: LeadService = Depends(get_lead_service)
):
    """Create a new lead with comprehensive activity logging"""
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
    
    return lead


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
    current_user: User = Depends(get_current_user),
    service: LeadService = Depends(get_lead_service)
):
    """Get all leads with pagination and optional predefined views."""
    result = await service.get_leads_with_metadata(
        tenant_id=current_user.tenant_id,
        page=page,
        per_page=per_page,
        owner_id=owner_id,
        is_converted=is_converted,
        view=view,
        current_user_id=current_user.id
    )
    
    # The service returns lead models, we need to convert them to Pydantic responses
    # but LeadResponse.model_validate will handle it due to response_model=LeadListResponse
    return result


@router.get("/search")
async def search_leads(
    query: Optional[str] = None,
    lead_status_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: LeadService = Depends(get_lead_service)
):
    """Search leads"""
    skip = (page - 1) * per_page
    leads, total = await service.search_leads(
        query,
        current_user.tenant_id,
        lead_status_id=lead_status_id,
        skip=skip,
        limit=per_page
    )
    
    return {
        "leads": leads,
        "total": total
    }


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    service: LeadService = Depends(get_lead_service)
):
    """Get lead by ID"""
    lead = await service.get_lead(lead_id, current_user.tenant_id)
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Increment view count
    await lead.increment_view_count()
    
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: LeadService = Depends(get_lead_service)
):
    """Update a lead with comprehensive activity logging"""
    # Set request context for activity logging
    service.set_request_context(request, current_user)
    
    lead = await service.update_lead(
        lead_id=lead_id,
        lead_data=lead_data,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_name=current_user.name.strip() or current_user.email
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return lead


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: LeadService = Depends(get_lead_service)
):
    """Delete a lead with comprehensive activity logging"""
    # Set request context for activity logging
    service.set_request_context(request, current_user)
    
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
    conversion_data: LeadConvert,
    current_user: User = Depends(get_current_user),
    service: LeadService = Depends(get_lead_service)
):
    """Convert lead to opportunity"""
    try:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{lead_id}/conversion-suggestions")
async def get_conversion_suggestions(
    lead_id: str,
    current_user: User = Depends(get_current_user),
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


@router.post("/change-owner", response_model=Dict[str, Any])
async def change_lead_owner(
    lead_id: str = Query(...),
    new_owner_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_lead")),
    service: LeadService = Depends(get_lead_service)
):
    """Change lead owner"""
    lead = await service.change_owner(
        lead_id,
        ObjectId(new_owner_id),
        current_user.id,
        current_user.tenant_id
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {
        "error": False,
        "message": "Lead ownership updated successfully",
        "lead": lead
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
