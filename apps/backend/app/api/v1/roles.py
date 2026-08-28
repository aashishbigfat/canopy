"""
Role API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException

from app.models.user import User
from app.schemas.role import (
    RoleCreate, RoleUpdate, RoleResponse, RoleListResponse,
    PermissionAdd, PermissionRemove, PermissionListResponse
)
from app.schemas.user import UserResponse
from app.services.role_service import RoleService
from app.api.deps import get_current_user, check_permission
from app.api.validators import validate_object_id

router = APIRouter()


@router.post("/", response_model=RoleResponse, status_code=201)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(check_permission("create_role"))
):
    """Create a new role"""
    service = RoleService()
    
    try:
        role = await service.create_role(
            role_data,
            current_user.tenant_id,
            current_user.id
        )
        
        return RoleResponse.from_orm(role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=RoleListResponse)
async def get_roles(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_permission("view_role"))
):
    """Get all roles"""
    service = RoleService()
    
    roles = await service.get_roles_by_tenant(
        current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    
    return RoleListResponse(
        roles=[RoleResponse.from_orm(r) for r in roles],
        total=len(roles)
    )


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    current_user: User = Depends(check_permission("view_role"))
):
    """Get role by ID"""
    validate_object_id(role_id, "role_id")
    service = RoleService()
    
    role = await service.get_role(role_id, current_user.tenant_id)
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return RoleResponse.from_orm(role)


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    role_data: RoleUpdate,
    current_user: User = Depends(check_permission("edit_role"))
):
    """Update a role"""
    validate_object_id(role_id, "role_id")
    service = RoleService()
    
    try:
        role = await service.update_role(
            role_id,
            role_data,
            current_user.tenant_id,
            current_user.id
        )
        
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        return RoleResponse.from_orm(role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    current_user: User = Depends(check_permission("delete_role"))
):
    """Delete a role (soft delete)"""
    validate_object_id(role_id, "role_id")
    service = RoleService()
    
    try:
        success = await service.delete_role(role_id, current_user.tenant_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Role not found")
        
        return {
            "error": False,
            "message": "Role deleted successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{role_id}/permissions", response_model=RoleResponse)
async def add_permissions(
    role_id: str,
    permission_data: PermissionAdd,
    current_user: User = Depends(check_permission("edit_role"))
):
    """Add permissions to a role"""
    validate_object_id(role_id, "role_id")
    service = RoleService()
    
    try:
        role = await service.add_permissions(
            role_id,
            permission_data,
            current_user.tenant_id
        )
        
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        return RoleResponse.from_orm(role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{role_id}/permissions", response_model=RoleResponse)
async def remove_permissions(
    role_id: str,
    permission_data: PermissionRemove,
    current_user: User = Depends(check_permission("edit_role"))
):
    """Remove permissions from a role"""
    validate_object_id(role_id, "role_id")
    service = RoleService()
    
    role = await service.remove_permissions(
        role_id,
        permission_data,
        current_user.tenant_id
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return RoleResponse.from_orm(role)


@router.get("/{role_id}/users")
async def get_role_users(
    role_id: str,
    current_user: User = Depends(check_permission("view_user"))
):
    """Get all users with this role"""
    validate_object_id(role_id, "role_id")
    service = RoleService()
    
    users = await service.get_users_by_role(
        role_id,
        current_user.tenant_id
    )
    
    return {
        "users": [UserResponse.from_orm(u) for u in users],
        "total": len(users)
    }


@router.get("/permissions/all", response_model=PermissionListResponse)
async def get_all_permissions(
    current_user: User = Depends(check_permission("view_role"))
):
    """Get list of all available permissions for the tenant's industry"""
    from app.services.industry_service import get_tenant_industry
    industry = await get_tenant_industry(current_user.tenant_id)

    permissions = RoleService.get_permissions_for_industry(industry)
    
    return PermissionListResponse(
        permissions=permissions,
        total=len(permissions)
    )

