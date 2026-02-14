"""
Opportunity API endpoints - Sales Pipeline Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
from bson import ObjectId

from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.opportunity_picklists import SalesStage, Experience
from app.schemas.opportunity import (
    OpportunityCreate, OpportunityUpdate, OpportunityResponse,
    OpportunityListResponse, OpportunityStageChange, ExperienceResponse
)
from app.services.opportunity_service import OpportunityService
from app.api.deps import get_current_user, check_permission

router = APIRouter()


@router.get("/sales-stages")
async def get_sales_stages(
    current_user: User = Depends(get_current_user)
):
    """
    Get all sales stages for the pipeline/kanban view
    """
    stages = await SalesStage.find(
        SalesStage.is_active == True
    ).sort("+sorting").to_list()
    
    return [
        {
            "id": str(stage.id),
            "name": stage.name,
            "color": stage.color,
            "probability": stage.probability,
            "is_won": stage.is_won,
            "is_lost": stage.is_lost,
            "sorting": stage.sorting,
        }
        for stage in stages
    ]


@router.get("/experiences", response_model=List[ExperienceResponse])
async def get_experiences(
    current_user: User = Depends(get_current_user)
):
    """
    Get all travel experiences for the opportunity form
    """
    experiences = await Experience.find(
        Experience.tenant_id == current_user.tenant_id,
        Experience.is_active == True
    ).sort("+sorting").to_list()
    
    return [
        {
            "id": str(exp.id),
            "name": exp.name,
            "description": exp.description,
            "sorting": exp.sorting,
        }
        for exp in experiences
    ]

@router.post("/", response_model=OpportunityResponse, status_code=201)
async def create_opportunity(
    opp_data: OpportunityCreate,
    request: Request,
    current_user: User = Depends(check_permission("create_opportunity"))
):
    """
    Create a new opportunity
    
    Args:
        opp_data: Opportunity creation data
        request: FastAPI Request object
        current_user: Current authenticated user
    """
    service = OpportunityService()
    
    # Set request context for activity logging
    service.set_request_context(request, current_user)
    
    try:
        opportunity = await service.create_opportunity(
            opp_data=opp_data,
            user_id=current_user.id,
            tenant_id=current_user.tenant_id
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
    current_user: User = Depends(get_current_user)
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
        
        service = OpportunityService()
        
        # Build filters
        filters = {}
        
        # Apply view filters
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        
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
                 "$gte": now.isoformat(),
                 "$lte": (now + timedelta(days=7)).isoformat()
             }
        elif view == "closed":
             # Handled by frontend or specific status filter usually
             pass

        # Get opportunities
        opportunities, total = await service.get_opportunities_by_tenant(
            tenant_id=current_user.tenant_id,
            skip=(page - 1) * per_page,
            limit=per_page,
            owner_id=ObjectId(owner_id) if owner_id else None,
            sales_stage_id=ObjectId(sales_stage_id) if sales_stage_id else None,
            **filters
        )
        # Get related data names
        from app.models.user import User as UserDoc
        from app.models.account import Account as AccountDoc
        from app.models.destination import Destination as DestinationDoc
        
        # Convert to response format
        opportunity_responses = []
        for opp in opportunities:
            # Get related data
            sales_stage = None
            if opp.sales_stage_id:
                sales_stage = await SalesStage.get(opp.sales_stage_id)
            
            opportunity_type = None
            if opp.opportunity_type_id:
                opportunity_type = await OpportunityType.get(opp.opportunity_type_id)
            
            # Fetch Owner Name
            owner_name = "Unknown"
            if opp.owner_id:
                owner = await UserDoc.get(opp.owner_id)
                if owner:
                    owner_name = owner.name
            
            # Fetch Account Name
            account_name = "-"
            if opp.account_id:
                account = await AccountDoc.get(opp.account_id)
                if account:
                    account_name = account.name
            
            # Fetch Destination Names
            dest_names = []
            if opp.destination_ids:
                for dest_id in opp.destination_ids:
                    dest = await DestinationDoc.get(dest_id)
                    if dest:
                        dest_names.append(dest.name)

            # Segment - derived or custom? 
            # Default to "B2C" as per screenshot if not set
            segment = opp.custom_fields.get("segment", "B2C")
            creation_type = "Manual"
            if opp.lead_id:
                creation_type = "Auto"
            
            # Build response
            opp_response = OpportunityResponse.from_orm(opp)
            if sales_stage:
                opp_response.sales_stage_name = sales_stage.name
            if opportunity_type:
                opp_response.opportunity_type_name = opportunity_type.name
            
            opp_response.owner_name = owner_name
            opp_response.account_name = account_name
            opp_response.destination_names = dest_names
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
    current_user: User = Depends(get_current_user)
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
        service = OpportunityService()
        opportunity = await service.get_opportunity(
            opportunity_id,
            current_user.tenant_id
        )
        
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Enrich response with related names
        from app.models.opportunity_picklists import SalesStage, OpportunityType
        from app.models.user import User as UserDoc
        from app.models.account import Account as AccountDoc
        from app.models.destination import Destination as DestinationDoc
        
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
        if opportunity.account_id:
            account = await AccountDoc.get(opportunity.account_id)
            if account:
                account_name = account.name
        
        dest_names = []
        if opportunity.destination_ids:
            for dest_id in opportunity.destination_ids:
                dest = await DestinationDoc.get(dest_id)
                if dest:
                    dest_names.append(dest.name)
        
        segment = opportunity.custom_fields.get("segment", "B2C")
        creation_type = "Manual"
        if opportunity.lead_id:
            creation_type = "Auto"
            
        opp_response = OpportunityResponse.from_orm(opportunity)
        if sales_stage:
            opp_response.sales_stage_name = sales_stage.name
        if opportunity_type:
            opp_response.opportunity_type_name = opportunity_type.name
        
        opp_response.owner_name = owner_name
        opp_response.account_name = account_name
        opp_response.destination_names = dest_names
        opp_response.segment = segment
        opp_response.creation_type = creation_type
            
        return opp_response
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
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
        service = OpportunityService()
        
        # Set request context for activity logging
        service.set_request_context(request, current_user)
        
        opportunity = await service.update_opportunity(
            opportunity_id,
            opp_data,
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
        service = OpportunityService()
        
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
        service = OpportunityService()
        opportunity = await service.change_stage(
            opportunity_id,
            stage_data,
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
        service = OpportunityService()
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
        service = OpportunityService()
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
    new_owner_id: str = Query(..., description="New owner user ID"),
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """
    Change the owner of an opportunity
    
    Args:
        opportunity_id: ID of the opportunity
        new_owner_id: ID of the new owner user
        current_user: Current authenticated user
        
    Returns:
        Updated opportunity details
    """
    try:
        service = OpportunityService()
        opportunity = await service.change_owner(
            opportunity_id,
            ObjectId(new_owner_id),
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
