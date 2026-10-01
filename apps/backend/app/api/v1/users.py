"""
User API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.user import User
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserDetailResponse,
    UserListResponse, UserPasswordUpdate, UserStatusUpdate,
    UserRoleAssignment, UserTerritoryUpdate, UserTargetUpdate,
    UserPerformanceResponse
)
from app.services.user_service import UserService
from app.api.deps import get_current_user, check_permission

router = APIRouter()


@router.post("/", response_model=UserDetailResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(check_permission("create_user"))
):
    """Create a new user"""
    service = UserService()
    
    try:
        user = await service.create_user(
            user_data,
            current_user.tenant_id,
            current_user.id
        )
        
        # Get with details
        result = await service.get_user_with_details(
            str(user.id),
            current_user.tenant_id
        )
        
        return UserDetailResponse(
            **UserResponse.from_orm(result["user"]).model_dump(),
            roles=result["roles"],
            department=result["department"],
            hierarchy=result["hierarchy"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Check if it's a duplicate key error for email
        if "duplicate key error" in str(e) and "email" in str(e):
            raise HTTPException(status_code=409, detail=f"User with email '{user_data.email}' already exists")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=UserListResponse)
async def get_users(
    department_id: Optional[str] = None,
    role_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    # The user list and the owner/assignee pickers call this without paging, so the
    # default must cover a whole tenant (a few hundred users), not just the first 100.
    limit: int = 1000,
    current_user: User = Depends(check_permission("view_user"))
):
    """Get all users with filters"""
    service = UserService()
    
    users = await service.get_users_by_tenant(
        current_user.tenant_id,
        department_id=department_id,
        role_id=role_id,
        is_active=is_active,
        skip=skip,
        limit=limit
    )
    
    return UserListResponse(
        users=[UserResponse.from_orm(u) for u in users],
        total=len(users)
    )


@router.get("/search")
async def search_users(
    query: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(check_permission("view_user"))
):
    """Search users"""
    service = UserService()
    
    users = await service.search_users(
        query,
        current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    
    return {
        "users": [UserResponse.from_orm(u) for u in users],
        "total": len(users)
    }


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(check_permission("view_user"))
):
    """Get user by ID with details"""
    service = UserService()
    
    result = await service.get_user_with_details(
        user_id,
        current_user.tenant_id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserDetailResponse(
        **UserResponse.from_orm(result["user"]).model_dump(),
        roles=result["roles"],
        department=result["department"],
        hierarchy=result["hierarchy"]
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(check_permission("edit_user"))
):
    """Update a user"""
    service = UserService()
    
    try:
        user = await service.update_user(
            user_id,
            user_data,
            current_user.tenant_id,
            current_user.id
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse.from_orm(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(check_permission("delete_user"))
):
    """Delete a user (soft delete)"""
    service = UserService()
    
    success = await service.delete_user(user_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "error": False,
        "message": "User deleted successfully"
    }


@router.put("/{user_id}/password")
async def update_password(
    user_id: str,
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user password (user can only update their own)"""
    # Users can only update their own password
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Can only update your own password")
    
    service = UserService()
    
    try:
        success = await service.update_password(
            user_id,
            password_data,
            current_user.tenant_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "error": False,
            "message": "Password updated successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    status_data: UserStatusUpdate,
    current_user: User = Depends(check_permission("edit_user"))
):
    """Update user active status"""
    service = UserService()
    
    user = await service.update_user_status(
        user_id,
        status_data,
        current_user.tenant_id
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.from_orm(user)


@router.post("/{user_id}/roles", response_model=UserResponse)
async def assign_roles(
    user_id: str,
    role_assignment: UserRoleAssignment,
    current_user: User = Depends(check_permission("edit_user"))
):
    """Assign roles to user"""
    service = UserService()
    
    user = await service.assign_roles(
        user_id,
        role_assignment,
        current_user.tenant_id
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.from_orm(user)


@router.put("/{user_id}/territories", response_model=UserResponse)
async def update_territories(
    user_id: str,
    territory_data: UserTerritoryUpdate,
    current_user: User = Depends(check_permission("edit_user"))
):
    """Update user territories"""
    service = UserService()
    
    user = await service.update_territories(
        user_id,
        territory_data,
        current_user.tenant_id
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.from_orm(user)


@router.put("/{user_id}/targets", response_model=UserResponse)
async def update_targets(
    user_id: str,
    target_data: UserTargetUpdate,
    current_user: User = Depends(check_permission("edit_user"))
):
    """Update user monthly targets"""
    service = UserService()
    
    user = await service.update_targets(
        user_id,
        target_data,
        current_user.tenant_id
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.from_orm(user)


@router.get("/{user_id}/performance", response_model=UserPerformanceResponse)
async def get_user_performance(
    user_id: str,
    current_user: User = Depends(check_permission("view_user"))
):
    """Get user performance metrics"""
    service = UserService()
    
    performance = await service.get_user_performance(
        user_id,
        current_user.tenant_id
    )
    
    if not performance:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserPerformanceResponse(**performance)


@router.get("/{user_id}/team")
async def get_user_team(
    user_id: str,
    current_user: User = Depends(check_permission("view_user"))
):
    """Get user's team members"""
    service = UserService()
    
    team = await service.get_user_team(
        user_id,
        current_user.tenant_id
    )
    
    return {
        "team": [UserResponse.from_orm(u) for u in team],
        "total": len(team)
    }
