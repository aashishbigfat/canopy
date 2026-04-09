"""
Hierarchy API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import check_permission
from app.models.user import User
from app.schemas.hierarchy import (
    HierarchyCreate,
    HierarchyListResponse,
    HierarchyResponse,
    HierarchyUpdate,
)
from app.services.hierarchy_service import HierarchyService

router = APIRouter()


async def _get_created_by_name(created_by):
    if not created_by:
        return None
    user = await User.get(created_by)
    return user.name if user else None


@router.post("/", response_model=HierarchyResponse, status_code=201)
async def create_hierarchy(
    hierarchy_data: HierarchyCreate,
    current_user: User = Depends(check_permission("create_department")),
):
    service = HierarchyService()
    try:
        hierarchy = await service.create_hierarchy(hierarchy_data, current_user.id, current_user.tenant_id)
        return HierarchyResponse.from_orm(hierarchy, created_by_name=current_user.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=HierarchyListResponse)
async def get_hierarchies(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_permission("view_department")),
):
    service = HierarchyService()
    hierarchies = await service.get_hierarchies_by_tenant(current_user.tenant_id, skip=skip, limit=limit)

    items = []
    for hierarchy in hierarchies:
        created_by_name = await _get_created_by_name(getattr(hierarchy, "created_by", None))
        items.append(HierarchyResponse.from_orm(hierarchy, created_by_name=created_by_name))

    return HierarchyListResponse(hierarchies=items, total=len(items))


@router.get("/{hierarchy_id}", response_model=HierarchyResponse)
async def get_hierarchy(
    hierarchy_id: str,
    current_user: User = Depends(check_permission("view_department")),
):
    service = HierarchyService()
    hierarchy = await service.get_hierarchy(hierarchy_id, current_user.tenant_id)
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Hierarchy not found")
    created_by_name = await _get_created_by_name(getattr(hierarchy, "created_by", None))
    return HierarchyResponse.from_orm(hierarchy, created_by_name=created_by_name)


@router.put("/{hierarchy_id}", response_model=HierarchyResponse)
async def update_hierarchy(
    hierarchy_id: str,
    hierarchy_data: HierarchyUpdate,
    current_user: User = Depends(check_permission("edit_department")),
):
    service = HierarchyService()
    try:
        hierarchy = await service.update_hierarchy(hierarchy_id, hierarchy_data, current_user.tenant_id)
        if not hierarchy:
            raise HTTPException(status_code=404, detail="Hierarchy not found")
        created_by_name = await _get_created_by_name(getattr(hierarchy, "created_by", None))
        return HierarchyResponse.from_orm(hierarchy, created_by_name=created_by_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{hierarchy_id}")
async def delete_hierarchy(
    hierarchy_id: str,
    current_user: User = Depends(check_permission("delete_department")),
):
    service = HierarchyService()
    try:
        success = await service.delete_hierarchy(hierarchy_id, current_user.tenant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Hierarchy not found")
        return {"error": False, "message": "Hierarchy deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
