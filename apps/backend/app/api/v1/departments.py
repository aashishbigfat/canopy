"""
Department API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.user import User
from app.schemas.department import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    DepartmentDetailResponse, DepartmentListResponse
)
from app.schemas.user import UserResponse
from app.services.department_service import DepartmentService
from app.api.deps import get_current_user, check_permission
from app.api.validators import validate_object_id

router = APIRouter()


@router.post("/", response_model=DepartmentDetailResponse, status_code=201)
async def create_department(
    department_data: DepartmentCreate,
    current_user: User = Depends(check_permission("create_department"))
):
    """Create a new department"""
    service = DepartmentService()
    
    try:
        department = await service.create_department(
            department_data,
            current_user.id,
            current_user.tenant_id
        )
        
        # Get with details
        result = await service.get_department_with_details(
            str(department.id),
            current_user.tenant_id
        )
        
        return DepartmentDetailResponse(
            **DepartmentResponse.from_orm(result["department"]).model_dump(),
            user_count=result["user_count"],
            child_count=result["child_count"],
            manager_name=result["manager_name"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=DepartmentListResponse)
async def get_departments(
    parent_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_permission("view_department"))
):
    """Get all departments with filters"""
    service = DepartmentService()
    
    departments = await service.get_departments_by_tenant(
        current_user.tenant_id,
        parent_id=parent_id,
        is_active=is_active,
        skip=skip,
        limit=limit
    )
    
    return DepartmentListResponse(
        departments=[DepartmentResponse.from_orm(d) for d in departments],
        total=len(departments)
    )


@router.get("/search")
async def search_departments(
    query: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(check_permission("view_department"))
):
    """Search departments"""
    service = DepartmentService()
    
    departments = await service.search_departments(
        query,
        current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    
    return {
        "departments": [DepartmentResponse.from_orm(d) for d in departments],
        "total": len(departments)
    }


@router.get("/{department_id}", response_model=DepartmentDetailResponse)
async def get_department(
    department_id: str,
    current_user: User = Depends(check_permission("view_department"))
):
    """Get department by ID with details"""
    validate_object_id(department_id, "department_id")
    service = DepartmentService()
    
    result = await service.get_department_with_details(
        department_id,
        current_user.tenant_id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return DepartmentDetailResponse(
        **DepartmentResponse.from_orm(result["department"]).model_dump(),
        user_count=result["user_count"],
        child_count=result["child_count"],
        manager_name=result["manager_name"]
    )


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: str,
    department_data: DepartmentUpdate,
    current_user: User = Depends(check_permission("edit_department"))
):
    """Update a department"""
    validate_object_id(department_id, "department_id")
    service = DepartmentService()
    
    try:
        department = await service.update_department(
            department_id,
            department_data,
            current_user.id,
            current_user.tenant_id
        )
        
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        return DepartmentResponse.from_orm(department)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{department_id}")
async def delete_department(
    department_id: str,
    current_user: User = Depends(check_permission("delete_department"))
):
    """Delete a department (soft delete)"""
    validate_object_id(department_id, "department_id")
    service = DepartmentService()
    
    try:
        success = await service.delete_department(department_id, current_user.tenant_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Department not found")
        
        return {
            "error": False,
            "message": "Department deleted successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{department_id}/hierarchy")
async def get_department_hierarchy(
    department_id: str,
    current_user: User = Depends(check_permission("view_department"))
):
    """Get department hierarchy (parent and children)"""
    validate_object_id(department_id, "department_id")
    service = DepartmentService()
    
    result = await service.get_department_hierarchy(
        department_id,
        current_user.tenant_id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return {
        "department": DepartmentResponse.from_orm(result["department"]),
        "parent": DepartmentResponse.from_orm(result["parent"]) if result["parent"] else None,
        "children": [DepartmentResponse.from_orm(c) for c in result["children"]]
    }


@router.get("/{department_id}/users")
async def get_department_users(
    department_id: str,
    current_user: User = Depends(check_permission("view_user"))
):
    """Get all users in a department"""
    validate_object_id(department_id, "department_id")
    service = DepartmentService()
    
    users = await service.get_department_users(
        department_id,
        current_user.tenant_id
    )
    
    return {
        "users": [UserResponse.from_orm(u) for u in users],
        "total": len(users)
    }
