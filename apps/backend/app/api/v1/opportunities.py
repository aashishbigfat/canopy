"""
Opportunity API endpoints - Sales Pipeline Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
import asyncio
from bson import ObjectId

from app.models.user import User
from app.models.tenant import Tenant
from app.models.opportunity import Opportunity
from app.models.opportunity_picklists import SalesStage, Experience
from app.schemas.opportunity import (
    OpportunityCreate, OpportunityUpdate, OpportunityResponse,
    OpportunityListResponse, OpportunityStageChange, ExperienceResponse,
    OpportunityHistoryResponse, OpportunityOwnerChange
)
from app.schemas.industry_data import validate_industry_data
from app.services.opportunity_service import OpportunityService
from app.api.deps import get_current_user, check_permission

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/sales-stages")
async def get_sales_stages(
    current_user: User = Depends(get_current_user)
):
    """
    Get all active sales stages for the tenant's pipeline/kanban view.

    Each tenant has their own industry-specific stage set. If a tenant has
    no stages yet (e.g. newly created), they are auto-seeded from the
    industry defaults and returned immediately.
    """
    tenant_stages = await SalesStage.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).sort("+sorting").to_list()

    # Auto-seed industry-specific stages for this tenant if none exist
    if not tenant_stages:
        tenant = await Tenant.get(current_user.tenant_id)
        industry = tenant.industry if tenant else "travel"
        service = OpportunityService()
        await service.seed_standard_stages(current_user.tenant_id, industry)
        # Re-fetch after seeding
        tenant_stages = await SalesStage.find(
            {"tenant_id": current_user.tenant_id, "is_active": True}
        ).sort("+sorting").to_list()

    return [
        {
            "id": str(stage.id),
            "name": stage.name,
            "color": stage.color,
            "probability": stage.probability,
            "is_won": stage.is_won,
            "is_lost": stage.is_lost,
            "is_default": stage.is_default,
            "sorting": stage.sorting,
        }
        for stage in tenant_stages
    ]



@router.get("/experiences", response_model=List[ExperienceResponse])
async def get_experiences(
    current_user: User = Depends(get_current_user)
):
    """
    Get all travel experiences for the opportunity form.
    Uses multi-tenant SaaS query: platform defaults + tenant overrides.
    """
    from app.core.picklist_query import build_picklist_query
    from app.models.tenant import Tenant
    
    tenant = await Tenant.get(current_user.tenant_id)
    tenant_industry = tenant.industry if tenant else None
    pq = build_picklist_query(current_user.tenant_id, industry=tenant_industry)
    
    experiences = await Experience.find(pq).sort("+sorting").to_list()
    
    return [
        {
            "id": str(exp.id),
            "name": exp.name,
            "description": exp.description,
            "sorting": exp.sorting,
        }
        for exp in experiences
    ]

@router.get("/search-opportunity")
async def search_opportunity_autocomplete(
    s: str = Query(..., description="Search term"),
    current_user: User = Depends(get_current_user)
):
    """
    Autocomplete search for opportunity name.
    Used by the Task form's Related To > Opportunity field.
    """
    from app.models.opportunity import Opportunity as OppDoc
    opps = await OppDoc.find({
        "tenant_id": current_user.tenant_id,
        "name": {"$regex": s, "$options": "i"},
        "deleted_at": None
    }).limit(15).to_list()
    return {
        "error": False,
        "opportunities": [{"id": str(o.id), "name": o.name} for o in opps]
    }


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


@router.post("/", response_model=OpportunityResponse, status_code=201)
async def create_opportunity(
    request: Request,
    current_user: User = Depends(check_permission("create_opportunity"))
):
    """
    Create a new opportunity -- unified schema for all industries
    """
    service = OpportunityService()
    service.set_request_context(request, current_user)
    body = await request.json()
    
    # Determine tenant industry
    tenant = await Tenant.get(current_user.tenant_id)
    industry = tenant.industry if tenant else "travel"
    
    try:
        opp_data = OpportunityCreate(**body)
        if opp_data.industry_data:
            opp_data.industry_data = validate_industry_data(
                industry, opp_data.industry_data, mode="opportunity"
            )
            # Resolve destination IDs to names
            opp_data.industry_data = await _resolve_destinations(opp_data.industry_data)
        
        opportunity = await service.create_opportunity(
            opp_data=opp_data,
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            custom_fields=opp_data.custom_fields if hasattr(opp_data, 'custom_fields') else None,
        )

        return OpportunityResponse.from_orm(opportunity)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/", response_model=OpportunityListResponse)
async def get_opportunities(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    owner_id: Optional[str] = Query(None, description="Filter by owner ID"),
    sales_stage_id: Optional[str] = Query(None, description="Filter by sales stage ID"),
    view: Optional[str] = Query(None, description="View filter (today, recent, etc.)"),
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """
    Get all opportunities with pagination and filtering
    
    Args:
        page: Page number for pagination
        per_page: Number of items per page
        owner_id: Filter by specific owner
        sales_stage_id: Filter by sales stage
        current_user: Current authenticated user
        
    Returns:
        Paginated list of opportunities
    """
    try:
        from app.models.opportunity_picklists import SalesStage, OpportunityType
        from app.services.visibility_scope import get_visible_owner_ids, apply_visibility_filter
        
        service = OpportunityService()
        
        # Build filters
        filters = {}
        
        # --- Data visibility scoping (owner + hierarchy) ---
        visible_owner_ids = await get_visible_owner_ids(current_user)
        
        # If caller explicitly filters by owner_id, validate it's within their visibility
        effective_owner_id = None
        if owner_id:
            requested_oid = ObjectId(owner_id)
            if visible_owner_ids is not None and requested_oid not in visible_owner_ids:
                # User is requesting records they can't see — return empty
                return OpportunityListResponse(
                    opportunities=[], total=0, page=page, per_page=per_page, pages=0
                )
            effective_owner_id = requested_oid
        
        # Apply hierarchy visibility as an additional filter when no explicit owner_id
        if not effective_owner_id and visible_owner_ids is not None:
            effective_owner_id = {"$in": visible_owner_ids}
        
        # Apply view filters
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        stage_filter = ObjectId(sales_stage_id) if sales_stage_id else None
        
        if view == "today":
            # Created today
            filters["created_at"] = {"$gte": today_start}
        elif view == "recent":
            # Last 7 days
            week_ago = now - timedelta(days=7)
            filters["created_at"] = {"$gte": week_ago}
        elif view == "closing_soon":
             # Closing in next 7 days
             filters["close_date"] = {
                 "$gte": now,
                 "$lte": now + timedelta(days=7)
             }
        elif view == "closed":
             # Scoped to THIS tenant — critical for multi-industry isolation
             closed_stages = await SalesStage.find(
                 {"tenant_id": current_user.tenant_id},
                 {"$or": [{"is_won": True}, {"is_lost": True}]}
             ).to_list()
             if closed_stages:
                 closed_stage_ids = [s.id for s in closed_stages]
                 stage_filter = {"$in": closed_stage_ids}

        # Get opportunities
        opportunities, total = await service.get_opportunities_by_tenant(
            tenant_id=current_user.tenant_id,
            skip=(page - 1) * per_page,
            limit=per_page,
            owner_id=effective_owner_id,
            sales_stage_id=stage_filter,
            **filters
        )
        # Get related data names
        from app.models.user import User as UserDoc
        from app.models.account import Account as AccountDoc
        from app.models.destination import Destination as DestinationDoc
        
        # 1. Collect all IDs for batch fetching
        sales_stage_ids = {opp.sales_stage_id for opp in opportunities if opp.sales_stage_id}
        opportunity_type_ids = {opp.opportunity_type_id for opp in opportunities if opp.opportunity_type_id}
        owner_ids = {opp.owner_id for opp in opportunities if opp.owner_id}
        account_ids = {opp.account_id for opp in opportunities if opp.account_id}

        # 2. Batch fetch related documents
        [stages, opp_types, owners, accounts] = await asyncio.gather(
            SalesStage.find({"_id": {"$in": list(sales_stage_ids)}}).to_list(),
            OpportunityType.find({"_id": {"$in": list(opportunity_type_ids)}}).to_list(),
            UserDoc.find({"_id": {"$in": list(owner_ids)}}).to_list(),
            AccountDoc.find({"_id": {"$in": list(account_ids)}}).to_list(),
        )

        # 3. Create lookup maps
        stage_map = {s.id: s for s in stages}
        type_map = {t.id: t for t in opp_types}
        owner_map = {o.id: o for o in owners}
        account_map = {a.id: a for a in accounts}

        # Convert to response format
        opportunity_responses = []
        for opp in opportunities: # type: Opportunity
            # Get related data from maps
            sales_stage = stage_map.get(opp.sales_stage_id)
            opportunity_type = type_map.get(opp.opportunity_type_id)
            owner = owner_map.get(opp.owner_id)
            account = account_map.get(opp.account_id)
            
            owner_name = owner.name if owner else "Unknown"
            
            account_name = "-"
            is_person_account = False
            if account:
                account_name = account.name
                is_person_account = getattr(account, 'is_person_account', False)

            # Segment - derived from model or account type
            segment = getattr(opp, 'segment', None)
            if not segment or segment == "B2C": # If default or missing, check account type
                segment = "B2C" if is_person_account else "B2B"
            
            creation_type = "Manual"
            if opp.lead_id:
                creation_type = "Auto"
            
            # Build response
            opp_response = OpportunityResponse.from_orm(opp)
            
            # Resolve destinations if in travel industry
            if opp_response.industry_data and "destination_ids" in opp_response.industry_data:
                opp_response.industry_data = await _resolve_destinations(opp_response.industry_data)

            if sales_stage:
                opp_response.sales_stage_name = sales_stage.name
            if opportunity_type:
                opp_response.opportunity_type_name = opportunity_type.name
            
            opp_response.owner_name = owner_name
            opp_response.account_name = account_name
            opp_response.is_person_account = is_person_account
            opp_response.type = "Person Account" if is_person_account else "Account"
            opp_response.segment = segment
            opp_response.creation_type = creation_type
                
            opportunity_responses.append(opp_response)
        
        return OpportunityListResponse(
            opportunities=opportunity_responses,
            total=total,
            page=page,
            per_page=per_page,
            pages=(total + per_page - 1) // per_page
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: str,
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """
    Get a specific opportunity by ID
    
    Args:
        opportunity_id: ID of the opportunity
        current_user: Current authenticated user
        
    Returns:
        Opportunity details
    """
    try:
        from app.services.visibility_scope import get_visible_owner_ids
        
        service = OpportunityService()
        opportunity = await service.get_opportunity(
            opportunity_id,
            current_user.tenant_id
        )
        
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Visibility check: if user can't see this owner's records, return 404
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if visible_owner_ids is not None and opportunity.owner_id not in visible_owner_ids:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Enrich response with related names
        from app.models.opportunity_picklists import SalesStage, OpportunityType
        from app.models.user import User as UserDoc
        from app.models.account import Account as AccountDoc
        from app.models.contact import Contact as ContactDoc
        
        sales_stage = None
        if opportunity.sales_stage_id:
            sales_stage = await SalesStage.get(opportunity.sales_stage_id)
        
        opportunity_type = None
        if opportunity.opportunity_type_id:
            opportunity_type = await OpportunityType.get(opportunity.opportunity_type_id)
        
        owner_name = "Unknown"
        if opportunity.owner_id:
            owner = await UserDoc.get(opportunity.owner_id)
            if owner:
                owner_name = owner.name
        
        account_name = "-"
        is_person_account = False
        if opportunity.account_id:
            account = await AccountDoc.get(opportunity.account_id)
            if account:
                account_name = account.name
                is_person_account = getattr(account, 'is_person_account', False)

        # Fetch Contact info
        contact_name = None
        contact_email = None
        contact_phone = None
        if opportunity.contact_id:
            contact = await ContactDoc.get(opportunity.contact_id)
            if contact:
                name_parts = [p for p in [getattr(contact, 'salutation', None), getattr(contact, 'first_name', None), getattr(contact, 'last_name', None)] if p]
                contact_name = " ".join(name_parts) or None
                contact_email = getattr(contact, 'email', None)
                contact_phone = getattr(contact, 'phone', None) or getattr(contact, 'mobile', None)
        
        # Resolve creator and modifier names
        created_by_user = await UserDoc.get(opportunity.created_by)
        created_by_name = created_by_user.name if created_by_user else "Unknown"
        
        last_modified_by_name = None
        if opportunity.last_modified_by_id:
            last_modified_by_user = await UserDoc.get(opportunity.last_modified_by_id)
            if last_modified_by_user:
                last_modified_by_name = last_modified_by_user.name
        
        segment = getattr(opportunity, 'segment', None)
        if not segment or segment == "B2C":
            segment = "B2C" if is_person_account else "B2B"
        
        creation_type = "Auto" if getattr(opportunity, 'lead_id', None) else "Manual"
            
        opp_response = OpportunityResponse.from_orm(opportunity)
        
        # Resolve destinations if in travel industry
        if opp_response.industry_data and "destination_ids" in opp_response.industry_data:
            opp_response.industry_data = await _resolve_destinations(opp_response.industry_data)

        if sales_stage:
            opp_response.sales_stage_name = sales_stage.name
        if opportunity_type:
            opp_response.opportunity_type_name = opportunity_type.name
        
        opp_response.owner_name = owner_name
        opp_response.account_name = account_name
        opp_response.is_person_account = is_person_account
        opp_response.type = "Person Account" if is_person_account else "Account"
        opp_response.contact_name = contact_name
        opp_response.contact_email = contact_email
        opp_response.contact_phone = contact_phone
        opp_response.created_by_name = created_by_name
        opp_response.last_modified_by_name = last_modified_by_name
        opp_response.segment = segment
        opp_response.creation_type = creation_type

        # Sprint D — populate custom_fields
        try:
            from app.services import field_registry_service
            opp_response.custom_fields = await field_registry_service.read_custom_field_values(
                "opportunity", opportunity.id, current_user.tenant_id,
            )
        except Exception:
            opp_response.custom_fields = {}

        return opp_response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"GET /opportunities/{opportunity_id} failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: str,
    opp_data: OpportunityUpdate,
    request: Request,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """
    Update an existing opportunity
    
    Args:
        opportunity_id: ID of the opportunity to update
        opp_data: Updated opportunity data
        request: FastAPI Request object
        current_user: Current authenticated user
        
    Returns:
        Updated opportunity details
    """
    try:
        from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
        service = OpportunityService()
        body = await request.json()
        
        # Determine tenant industry
        tenant = await Tenant.get(current_user.tenant_id)
        industry = tenant.industry if tenant else "travel"
        
        # Visibility pre-check
        existing = await service.get_opportunity(opportunity_id, current_user.tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if not is_record_visible(existing.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Set request context for activity logging
        service.set_request_context(request, current_user)
        
        opp_data = OpportunityUpdate(**body)
        if opp_data.industry_data:
            opp_data.industry_data = validate_industry_data(
                industry, opp_data.industry_data, mode="opportunity"
            )
            # Resolve destination IDs to names
            opp_data.industry_data = await _resolve_destinations(opp_data.industry_data)
        
        opportunity = await service.update_opportunity(
            opportunity_id,
            opp_data,
            current_user.id,
            current_user.tenant_id,
            custom_fields=opp_data.custom_fields if hasattr(opp_data, 'custom_fields') else None,
        )
        
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Enrich response with related contact/account info
        from app.models.opportunity_picklists import SalesStage as SalesStageDoc
        from app.models.user import User as UserDoc
        from app.models.account import Account as AccountDoc
        from app.models.contact import Contact as ContactDoc

        opp_response = OpportunityResponse.from_orm(opportunity)

        if opportunity.sales_stage_id:
            stage = await SalesStageDoc.get(opportunity.sales_stage_id)
            if stage:
                opp_response.sales_stage_name = stage.name

        if opportunity.owner_id:
            owner = await UserDoc.get(opportunity.owner_id)
            if owner:
                opp_response.owner_name = owner.name

        if opportunity.account_id:
            account = await AccountDoc.get(opportunity.account_id)
            if account:
                opp_response.account_name = account.name
                opp_response.is_person_account = getattr(account, 'is_person_account', False)

        if opportunity.contact_id:
            contact = await ContactDoc.get(opportunity.contact_id)
            if contact:
                name_parts = [p for p in [getattr(contact, 'salutation', None), getattr(contact, 'first_name', None), getattr(contact, 'last_name', None)] if p]
                opp_response.contact_name = " ".join(name_parts) or None
                opp_response.contact_email = getattr(contact, 'email', None)
                opp_response.contact_phone = getattr(contact, 'phone', None) or getattr(contact, 'mobile', None)

        opp_response.segment = getattr(opportunity, 'segment', None)
        if not opp_response.segment or opp_response.segment == "B2C":
            opp_response.segment = "B2C" if opp_response.is_person_account else "B2B"
            
        opp_response.creation_type = "Auto" if getattr(opportunity, 'lead_id', None) else "Manual"
        opp_response.type = "Person Account" if opp_response.is_person_account else "Account"

        return opp_response
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/{opportunity_id}")
async def delete_opportunity(
    opportunity_id: str,
    request: Request,
    current_user: User = Depends(check_permission("delete_opportunity"))
):
    """
    Delete an opportunity
    
    Args:
        opportunity_id: ID of the opportunity to delete
        request: FastAPI Request object
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    try:
        from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
        service = OpportunityService()
        
        # Visibility pre-check
        existing = await service.get_opportunity(opportunity_id, current_user.tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if not is_record_visible(existing.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Set request context for activity logging
        service.set_request_context(request, current_user)
        
        success = await service.delete_opportunity(
            opportunity_id,
            current_user.tenant_id,
            current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        return {"message": "Opportunity deleted successfully"}
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{opportunity_id}/change-stage", response_model=OpportunityResponse)
async def change_opportunity_stage(
    opportunity_id: str,
    stage_data: OpportunityStageChange,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """
    Change the sales stage of an opportunity
    
    Args:
        opportunity_id: ID of the opportunity
        stage_data: New stage information
        current_user: Current authenticated user
        
    Returns:
        Updated opportunity details
    """
    try:
        from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
        service = OpportunityService()
        
        # Visibility pre-check
        existing = await service.get_opportunity(opportunity_id, current_user.tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if not is_record_visible(existing.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        opportunity = await service.change_stage(
            opportunity_id,
            stage_data,
            current_user.id,
            current_user.tenant_id
        )
        
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Enrich response with related contact/account info
        from app.models.opportunity_picklists import SalesStage as SalesStageDoc
        from app.models.user import User as UserDoc
        from app.models.account import Account as AccountDoc
        from app.models.contact import Contact as ContactDoc

        opp_response = OpportunityResponse.from_orm(opportunity)

        if opportunity.sales_stage_id:
            stage = await SalesStageDoc.get(opportunity.sales_stage_id)
            if stage:
                opp_response.sales_stage_name = stage.name

        if opportunity.owner_id:
            owner = await UserDoc.get(opportunity.owner_id)
            if owner:
                opp_response.owner_name = owner.name

        if opportunity.account_id:
            account = await AccountDoc.get(opportunity.account_id)
            if account:
                opp_response.account_name = account.name
                opp_response.is_person_account = getattr(account, 'is_person_account', False)

        if opportunity.contact_id:
            contact = await ContactDoc.get(opportunity.contact_id)
            if contact:
                name_parts = [p for p in [getattr(contact, 'salutation', None), getattr(contact, 'first_name', None), getattr(contact, 'last_name', None)] if p]
                opp_response.contact_name = " ".join(name_parts) or None
                opp_response.contact_email = getattr(contact, 'email', None)
                opp_response.contact_phone = getattr(contact, 'phone', None) or getattr(contact, 'mobile', None)

        opp_response.segment = getattr(opportunity, 'segment', None)
        if not opp_response.segment or opp_response.segment == "B2C":
            opp_response.segment = "B2C" if opp_response.is_person_account else "B2B"
            
        opp_response.creation_type = "Auto" if getattr(opportunity, 'lead_id', None) else "Manual"
        opp_response.type = "Person Account" if opp_response.is_person_account else "Account"

        return opp_response
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{opportunity_id}/lock", response_model=OpportunityResponse)
async def lock_opportunity(
    opportunity_id: str,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """
    Lock an opportunity for editing
    
    Args:
        opportunity_id: ID of the opportunity to lock
        current_user: Current authenticated user
        
    Returns:
        Updated opportunity details
    """
    try:
        from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
        service = OpportunityService()
        
        # Visibility pre-check
        existing = await service.get_opportunity(opportunity_id, current_user.tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if not is_record_visible(existing.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        opportunity = await service.lock_opportunity(
            opportunity_id,
            current_user.id,
            current_user.tenant_id
        )
        
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        return OpportunityResponse.from_orm(opportunity)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{opportunity_id}/unlock", response_model=OpportunityResponse)
async def unlock_opportunity(
    opportunity_id: str,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """
    Unlock an opportunity
    
    Args:
        opportunity_id: ID of the opportunity to unlock
        current_user: Current authenticated user
        
    Returns:
        Updated opportunity details
    """
    try:
        from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
        service = OpportunityService()
        
        # Visibility pre-check
        existing = await service.get_opportunity(opportunity_id, current_user.tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if not is_record_visible(existing.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        opportunity = await service.unlock_opportunity(
            opportunity_id,
            current_user.id,
            current_user.tenant_id
        )
        
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        return OpportunityResponse.from_orm(opportunity)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{opportunity_id}/change-owner", response_model=OpportunityResponse)
async def change_opportunity_owner(
    opportunity_id: str,
    owner_change: OpportunityOwnerChange,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """
    Change the owner of an opportunity
    """
    try:
        from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
        from app.models.user import User as UserDoc
        from app.models.account import Account as AccountDoc
        from app.models.opportunity_picklists import SalesStage, OpportunityType
        
        service = OpportunityService()
        
        # Visibility pre-check
        existing = await service.get_opportunity(opportunity_id, current_user.tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if not is_record_visible(existing.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        opportunity = await service.change_owner(
            opportunity_id,
            ObjectId(owner_change.new_owner_id),
            current_user.id,
            current_user.tenant_id
        )
        
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # --- FULL RESPONSE ENRICHMENT ---
        sales_stage = await SalesStage.get(opportunity.sales_stage_id)
        opportunity_type = await OpportunityType.get(opportunity.opportunity_type_id) if opportunity.opportunity_type_id else None
        
        owner_name = "Unknown"
        owner = await UserDoc.get(opportunity.owner_id)
        if owner:
            owner_name = owner.name
        
        account_name = "-"
        is_person_account = False
        if opportunity.account_id:
            account = await AccountDoc.get(opportunity.account_id)
            if account:
                account_name = account.name
                is_person_account = getattr(account, 'is_person_account', False)

        created_by_user = await UserDoc.get(opportunity.created_by)
        created_by_name = created_by_user.name if created_by_user else "Unknown"
        
        last_modified_by_name = None
        if opportunity.last_modified_by_id:
            last_modified_by_user = await UserDoc.get(opportunity.last_modified_by_id)
            if last_modified_by_user:
                last_modified_by_name = last_modified_by_user.name
            
        opp_response = OpportunityResponse.from_orm(opportunity)
        if sales_stage:
            opp_response.sales_stage_name = sales_stage.name
        if opportunity_type:
            opp_response.opportunity_type_name = opportunity_type.name
        
        opp_response.owner_name = owner_name
        opp_response.account_name = account_name
        opp_response.is_person_account = is_person_account
        opp_response.type = "Person Account" if is_person_account else "Account"
        opp_response.created_by_name = created_by_name
        opp_response.last_modified_by_name = last_modified_by_name
            
        return opp_response
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{opportunity_id}/history", response_model=List[OpportunityHistoryResponse])
async def get_opportunity_history(
    opportunity_id: str,
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """
    Get the history of changes (e.g., stage updates) for an opportunity
    """
    try:
        from app.models.opportunity_picklists import OpportunityHistory, SalesStage
        from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
        from app.services.opportunity_service import OpportunityService
        
        service = OpportunityService()
        
        # Visibility pre-check
        existing = await service.get_opportunity(opportunity_id, current_user.tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")
            
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if not is_record_visible(existing.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Get history records sorted by newest first
        history_records = await OpportunityHistory.find(
            {"opportunity_id": ObjectId(opportunity_id), "tenant_id": current_user.tenant_id}
        ).sort("-changed_at").to_list()
        
        from beanie.operators import In
        
        # Collect unique user IDs and stage IDs to fetch names
        user_ids = {h.changed_by for h in history_records if h.changed_by}
        
        # Fetch users for names ONLY if user_ids is not empty
        user_map = {}
        if user_ids:
            users = await User.find(In(User.id, list(user_ids))).to_list()
            user_map = {u.id: u.name for u in users}
        
        # Collect all unique stage IDs from history
        history_stage_ids = set()
        for h in history_records:
            if h.field_name == "sales_stage_id":
                if h.old_value: history_stage_ids.add(h.old_value)
                if h.new_value: history_stage_ids.add(h.new_value)
        
        # Fetch only the stages we actually need for mapping
        stages = []
        if history_stage_ids:
            from beanie.operators import In
            valid_oids = [ObjectId(sid) for sid in history_stage_ids if len(sid) == 24]
            stages = await SalesStage.find(In(SalesStage.id, valid_oids)).to_list()
            
        stage_map = {str(s.id): s.name for s in stages}
        
        # Build response manually or map fields
        result = []
        for record in history_records:
            resp = OpportunityHistoryResponse.from_orm(record)
            resp.user_name = user_map.get(record.changed_by, "Unknown User")
            resp.amount_at_change = record.amount_at_change
            resp.probability_at_change = record.probability_at_change
            
            if record.field_name == "sales_stage_id":
                if record.old_value:
                    resp.old_stage_name = stage_map.get(record.old_value, record.old_value)
                if record.new_value:
                    resp.new_stage_name = stage_map.get(record.new_value, record.new_value)
                    
            result.append(resp)
            
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{opportunity_id}/tasks", response_model=List[dict])
async def get_opportunity_tasks(
    opportunity_id: str,
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """
    Get all tasks related to an opportunity
    """
    try:
        from app.models.task import Task
        
        tasks = await Task.find(
            {"taskable_id": ObjectId(opportunity_id), "taskable_type": "Opportunity", "tenant_id": current_user.tenant_id}
        ).sort("-created_at").to_list()
        
        # Need to fetch assigned users and created by users
        user_ids = {t.assigned_user_id for t in tasks if t.assigned_user_id}
        user_ids.update({t.created_by for t in tasks if t.created_by})
        
        from beanie.operators import In
        
        # Ensure we don't query empty IN clause
        user_map = {}
        if user_ids:
            users = await User.find(In(User.id, list(user_ids))).to_list()
            user_map = {u.id: u.name for u in users}
            
        from app.schemas.task import TaskResponse
        
        result = []
        for t in tasks:
            task_resp = TaskResponse.from_orm(t)
            task_dict = task_resp.model_dump()
            task_dict["assigned_user_name"] = user_map.get(t.assigned_user_id, "Unassigned")
            task_dict["created_by_name"] = user_map.get(t.created_by, "Unknown")
            result.append(task_dict)
            
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{opportunity_id}/tasks", response_model=dict)
async def create_opportunity_task(
    opportunity_id: str,
    task_data: dict,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """
    Create a new task for an opportunity
    """
    try:
        from app.models.task import Task
        from datetime import datetime
        
        # Parse due date if provided
        due_date = None
        if task_data.get("due_date"):
            try:
                due_date = datetime.fromisoformat(task_data["due_date"].replace('Z', '+00:00'))
            except:
                pass
                
        # Parse assigned user
        assigned_user_id = None
        if task_data.get("assigned_user_id"):
            try:
                assigned_user_id = ObjectId(task_data["assigned_user_id"])
            except:
                assigned_user_id = current_user.id
        else:
            assigned_user_id = current_user.id
            
        task = Task(
            name=task_data.get("name", "Untitled Task"),
            description=task_data.get("description"),
            due_date=due_date,
            status="Not Started",
            priority=task_data.get("priority", "Normal"),
            taskable_type="Opportunity",
            taskable_id=ObjectId(opportunity_id),
            assigned_user_id=assigned_user_id,
            tenant_id=current_user.tenant_id,
            created_by=current_user.id,
            owner_id=assigned_user_id
        )
        
        from app.schemas.task import TaskResponse
        
        await task.insert()
        
        # Log activity
        from app.services.activity_log_service import ActivityLogService
        activity_service = ActivityLogService()
        await activity_service.log_activity(
            user_id=current_user.id,
            user_name=current_user.name or current_user.email,
            tenant_id=current_user.tenant_id,
            action="created",
            entity_type="Task",
            entity_id=task.id,
            entity_name=task.name,
            description=f"Created Task: {task.name}",
            changes={
                "action_type": "create",
                "new_values": {
                    "task_name": task.name,
                    "assigned_to": str(task.assigned_user_id) if task.assigned_user_id else None,
                    "related_to": str(task.taskable_id) if task.taskable_id else None
                }
            }
        )
        
        # Log activity FOR THE OPPORTUNITY so it shows in the timeline
        await activity_service.log_activity(
            user_id=current_user.id,
            user_name=current_user.name or current_user.email,
            tenant_id=current_user.tenant_id,
            action="task_created",
            entity_type="opportunity",
            entity_id=ObjectId(opportunity_id),
            entity_name=task.name,
            description=f"Task created: {task.name}",
            changes={
                "action_type": "task_create",
                "task_id": str(task.id),
                "task_name": task.name
            }
        )
        
        # Use schema to safely encode ObjectIds to strings
        task_resp = TaskResponse.from_orm(task)
        return task_resp.model_dump()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
