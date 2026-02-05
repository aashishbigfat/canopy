"""
Opportunity API endpoints - Sales Pipeline Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
from bson import ObjectId

from app.models.user import User
from app.models.opportunity import Opportunity
from app.schemas.opportunity import (
    OpportunityCreate, OpportunityUpdate, OpportunityResponse,
    OpportunityListResponse, OpportunityStageChange
)
from app.services.opportunity_service import OpportunityService
from app.api.deps import get_current_user, check_permission

router = APIRouter()


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
        filters = {"tenant_id": current_user.tenant_id}
        if owner_id:
            filters["owner_id"] = ObjectId(owner_id)
        if sales_stage_id:
            filters["sales_stage_id"] = ObjectId(sales_stage_id)
        
        # Get opportunities
        opportunities, total = await service.get_opportunities_by_tenant(
            tenant_id=current_user.tenant_id,
            skip=(page - 1) * per_page,
            limit=per_page,
            owner_id=ObjectId(owner_id) if owner_id else None,
            sales_stage_id=ObjectId(sales_stage_id) if sales_stage_id else None
        )
        
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
            
            # Build response
            opp_response = OpportunityResponse.from_orm(opp)
            if sales_stage:
                opp_response.sales_stage_name = sales_stage.name
            if opportunity_type:
                opp_response.opportunity_type_name = opportunity_type.name
                
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
        
        return OpportunityResponse.from_orm(opportunity)
    
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
