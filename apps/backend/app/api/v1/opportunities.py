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
    OpportunityListResponse, OpportunityStageChange, ExperienceResponse,
    OpportunityHistoryResponse
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
            
            experience_name = None
            if opp.experience_id:
                experience = await Experience.get(opp.experience_id)
                if experience:
                    experience_name = experience.name
            
            # Fetch Owner Name
            owner_name = "Unknown"
            if opp.owner_id:
                owner = await UserDoc.get(opp.owner_id)
                if owner:
                    owner_name = owner.name
            
            # Fetch Account Name
            account_name = "-"
            is_person_account = False
            if opp.account_id:
                account = await AccountDoc.get(opp.account_id)
                if account:
                    account_name = account.name
                    is_person_account = getattr(account, 'is_person_account', False)
            
            # Fetch Destination Names
            dest_names = []
            if opp.destination_ids:
                for dest_id in opp.destination_ids:
                    dest = await DestinationDoc.get(dest_id)
                    if dest:
                        dest_names.append(dest.name)

            # Segment - derived from model or account type
            segment = getattr(opp, 'segment', None)
            if not segment or segment == "B2C": # If default or missing, check account type
                segment = "B2C" if is_person_account else "B2B"
            
            creation_type = "Manual"
            if opp.lead_id:
                creation_type = "Auto"
            
            # Build response
            opp_response = OpportunityResponse.from_orm(opp)
            if sales_stage:
                opp_response.sales_stage_name = sales_stage.name
            if opportunity_type:
                opp_response.opportunity_type_name = opportunity_type.name
            
            opp_response.experience_name = experience_name
            opp_response.owner_name = owner_name
            opp_response.account_name = account_name
            opp_response.is_person_account = is_person_account
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
        from app.models.contact import Contact as ContactDoc
        from app.models.destination import Destination as DestinationDoc
        
        sales_stage = None
        if opportunity.sales_stage_id:
            sales_stage = await SalesStage.get(opportunity.sales_stage_id)
        
        opportunity_type = None
        if opportunity.opportunity_type_id:
            opportunity_type = await OpportunityType.get(opportunity.opportunity_type_id)
        
        experience_name = None
        if opportunity.experience_id:
            experience = await Experience.get(opportunity.experience_id)
            if experience:
                experience_name = experience.name
        
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
        
        dest_names = []
        if opportunity.destination_ids:
            for dest_id in opportunity.destination_ids:
                dest = await DestinationDoc.get(dest_id)
                if dest:
                    dest_names.append(dest.name)
        
        segment = getattr(opportunity, 'segment', None)
        if not segment or segment == "B2C":
            segment = "B2C" if is_person_account else "B2B"
        
        creation_type = "Auto" if getattr(opportunity, 'lead_id', None) else "Manual"
            
        opp_response = OpportunityResponse.from_orm(opportunity)
        if sales_stage:
            opp_response.sales_stage_name = sales_stage.name
        if opportunity_type:
            opp_response.opportunity_type_name = opportunity_type.name
        
        opp_response.experience_name = experience_name
        opp_response.owner_name = owner_name
        opp_response.account_name = account_name
        opp_response.is_person_account = is_person_account
        opp_response.contact_name = contact_name
        opp_response.contact_email = contact_email
        opp_response.contact_phone = contact_phone
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
        
        # Enrich response with related contact/account info
        from app.models.opportunity_picklists import SalesStage as SalesStageDoc, Experience as ExperienceDoc
        from app.models.user import User as UserDoc
        from app.models.account import Account as AccountDoc
        from app.models.contact import Contact as ContactDoc
        from app.models.destination import Destination as DestinationDoc

        opp_response = OpportunityResponse.from_orm(opportunity)

        if opportunity.sales_stage_id:
            stage = await SalesStageDoc.get(opportunity.sales_stage_id)
            if stage:
                opp_response.sales_stage_name = stage.name

        if opportunity.experience_id:
            exp = await ExperienceDoc.get(opportunity.experience_id)
            if exp:
                opp_response.experience_name = exp.name

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

        dest_names = []
        if opportunity.destination_ids:
            for dest_id in opportunity.destination_ids:
                dest = await DestinationDoc.get(dest_id)
                if dest:
                    dest_names.append(dest.name)
        opp_response.destination_names = dest_names

        opp_response.segment = getattr(opportunity, 'segment', None)
        if not opp_response.segment or opp_response.segment == "B2C":
            opp_response.segment = "B2C" if opp_response.is_person_account else "B2B"
            
        opp_response.creation_type = "Auto" if getattr(opportunity, 'lead_id', None) else "Manual"

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
        
        # Get history records sorted by newest first
        history_records = await OpportunityHistory.find(
            OpportunityHistory.opportunity_id == ObjectId(opportunity_id),
            OpportunityHistory.tenant_id == current_user.tenant_id
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
            Task.taskable_id == ObjectId(opportunity_id),
            Task.taskable_type == "Opportunity",
            Task.tenant_id == current_user.tenant_id
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
        
        # Use schema to safely encode ObjectIds to strings
        task_resp = TaskResponse.from_orm(task)
        return task_resp.model_dump()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
