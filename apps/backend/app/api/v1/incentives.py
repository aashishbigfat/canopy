"""
API endpoints for Incentives and Commissions.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId

from app.api.deps import get_current_user, check_permission
from app.models.user import User
from app.services.incentive_service import incentive_service
from app.schemas.incentive import (
    IncentiveCreate, IncentiveUpdate, IncentiveResponse, IncentiveListResponse,
    TargetCreate, TargetUpdate, TargetResponse,
    AchievementResponse
)

router = APIRouter()


# ==================== Incentives ====================

@router.post("", response_model=IncentiveResponse)
async def create_incentive(
    data: IncentiveCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new incentive program."""
    incentive = await incentive_service.create_incentive(
        data=data,
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )
    return IncentiveResponse(
        id=str(incentive.id),
        **incentive.model_dump(exclude={"id"})
    )


@router.get("", response_model=IncentiveListResponse)
async def list_incentives(
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """List incentive programs."""
    incentives, total = await incentive_service.list_incentives(
        tenant_id=str(current_user.tenant_id),
        is_active=is_active,
        page=page,
        per_page=per_page
    )
    return IncentiveListResponse(
        incentives=[
            IncentiveResponse(id=str(i.id), **i.model_dump(exclude={"id"}))
            for i in incentives
        ],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{incentive_id}", response_model=IncentiveResponse)
async def get_incentive(
    incentive_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get an incentive by ID."""
    incentive = await incentive_service.get_incentive(incentive_id, str(current_user.tenant_id))
    if not incentive:
        raise HTTPException(status_code=404, detail="Incentive not found")
    return IncentiveResponse(
        id=str(incentive.id),
        **incentive.model_dump(exclude={"id"})
    )


@router.put("/{incentive_id}", response_model=IncentiveResponse)
async def update_incentive(
    incentive_id: str,
    data: IncentiveUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an incentive."""
    incentive = await incentive_service.update_incentive(
        incentive_id=incentive_id,
        data=data,
        tenant_id=str(current_user.tenant_id)
    )
    if not incentive:
        raise HTTPException(status_code=404, detail="Incentive not found")
    return IncentiveResponse(
        id=str(incentive.id),
        **incentive.model_dump(exclude={"id"})
    )


@router.delete("/{incentive_id}")
async def delete_incentive(
    incentive_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an incentive."""
    deleted = await incentive_service.delete_incentive(incentive_id, str(current_user.tenant_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Incentive not found")
    return {"message": "Incentive deleted successfully"}


# ==================== Targets ====================

@router.post("/targets", response_model=TargetResponse)
async def set_target(
    data: TargetCreate,
    current_user: User = Depends(get_current_user)
):
    """Set a sales target."""
    target = await incentive_service.set_target(
        data=data,
        tenant_id=str(current_user.tenant_id)
    )
    # Fetch user name for response if needed
    # user = await UserService.get(target.user_id) ... 
    return TargetResponse(
        id=str(target.id),
        **target.model_dump(exclude={"id"})
    )


# ==================== Achievements ====================

@router.get("/achievements/calculate", response_model=AchievementResponse)
async def calculate_achievement(
    user_id: str,
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    """Calculate and return achievement for a user and period."""
    achievement = await incentive_service.calculate_achievement(
        user_id=user_id,
        period_start=start_date,
        period_end=end_date,
        tenant_id=str(current_user.tenant_id)
    )
    
    # Get user name
    from app.services.user_service import UserService
    user_service = UserService()
    user = await user_service.get_user(user_id, PydanticObjectId(current_user.tenant_id))
    
    # Get target for comparison
    target = await incentive_service.get_user_target(
        user_id=user_id,
        period_start=start_date,
        tenant_id=str(current_user.tenant_id)
    )
    
    response = AchievementResponse(
        id=str(achievement.id),
        user_name=user.name if user else "Unknown",
        target_amount=target.target_amount if target else 0,
        target_progress_percent=(achievement.achieved_amount / target.target_amount * 100) if target and target.target_amount else 0,
        **achievement.model_dump(exclude={"id"})
    )
    return response
