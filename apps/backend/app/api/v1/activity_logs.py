"""
Activity Log API endpoints
"""
import logging
from fastapi import APIRouter, Depends
from typing import Optional

from app.models.user import User
from app.schemas.activity_log import (
    ActivityLogResponse, ActivityLogListResponse,
    LoginLogResponse, LoginLogListResponse
)
from app.services.activity_log_service import ActivityLogService
from app.api.deps import get_current_user, check_permission


_logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/events/", response_model=ActivityLogListResponse)
@router.get("/events", response_model=ActivityLogListResponse)
async def get_activity_logs(
    user_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = None,
    days: int = 30,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get activity logs with filters"""
    try:
        service = ActivityLogService()
        logs = await service.get_activity_logs(
            current_user.tenant_id,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            days=days,
            skip=skip,
            limit=limit
        )
        return ActivityLogListResponse(
            logs=[ActivityLogResponse.from_orm(l) for l in logs],
            total=len(logs)
        )
    except Exception:
        _logger.exception("Error in get_activity_logs for user %s", current_user.id)
        return ActivityLogListResponse(logs=[], total=0)  # Empty fallback to avoid crash


@router.get("/events/entity/{entity_type}/{entity_id}")
async def get_entity_history(
    entity_type: str,
    entity_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get activity history for an entity"""
    service = ActivityLogService()
    logs = await service.get_entity_history(entity_type, entity_id, current_user.tenant_id)
    return {"logs": [ActivityLogResponse.from_orm(l) for l in logs], "total": len(logs)}


@router.get("/events/user/{user_id}")
async def get_user_activity(
    user_id: str,
    limit: int = 50,
    current_user: User = Depends(check_permission("view_user"))
):
    """Get recent activity for a user"""
    service = ActivityLogService()
    logs = await service.get_user_activity(user_id, current_user.tenant_id, limit=limit)
    return {"logs": [ActivityLogResponse.from_orm(l) for l in logs], "total": len(logs)}


@router.get("/logins", response_model=LoginLogListResponse)
async def get_login_logs(
    user_id: Optional[str] = None,
    success: Optional[bool] = None,
    days: int = 30,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_permission("view_report"))
):
    """Get login logs with filters"""
    service = ActivityLogService()
    logs = await service.get_login_logs(
        current_user.tenant_id,
        user_id=user_id,
        success=success,
        days=days,
        skip=skip,
        limit=limit
    )
    return LoginLogListResponse(
        logs=[LoginLogResponse.from_orm(l) for l in logs],
        total=len(logs)
    )


@router.get("/logins/user/{user_id}")
async def get_user_login_history(
    user_id: str,
    limit: int = 20,
    current_user: User = Depends(check_permission("view_user"))
):
    """Get login history for a user"""
    service = ActivityLogService()
    logs = await service.get_user_login_history(user_id, current_user.tenant_id, limit=limit)
    return {"logs": [LoginLogResponse.from_orm(l) for l in logs], "total": len(logs)}
