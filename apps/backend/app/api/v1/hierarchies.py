"""
Hierarchy API endpoints

Enriched responses include user_count, related_roles_count, and parent_name
to support the Roles hierarchy UI.  All queries are tenant-scoped.

Permission checks accept BOTH old department and new hierarchy strings
for backward compatibility with existing stored role documents.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import check_any_permission
from app.models.user import User
from app.models.role import RoleHierarchy
from app.schemas.hierarchy import (
    HierarchyCreate,
    HierarchyListResponse,
    HierarchyResponse,
    HierarchyUpdate,
)
from app.services.hierarchy_service import HierarchyService
from app.services.scope_cache import invalidate_scope_cache

router = APIRouter()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_created_by_name(created_by):
    if not created_by:
        return None
    user = await User.get(created_by)
    return user.name if user else None


async def _get_parent_name(parent_id, tenant_id):
    """Resolve the human-readable name of a parent hierarchy node."""
    if not parent_id:
        return None
    parent = await RoleHierarchy.get(parent_id)
    if parent and parent.tenant_id == tenant_id:
        return parent.name
    return None


async def _count_users(hierarchy_id, tenant_id):
    """Count users assigned to this hierarchy node (via user.role_hierarchy_id)."""
    return await User.find(
        {"role_hierarchy_id": hierarchy_id, "tenant_id": tenant_id, "deleted_at": None}
    ).count()


async def _count_related_roles(hierarchy_id, tenant_id):
    """Count direct child hierarchy nodes (related roles)."""
    return await RoleHierarchy.find(
        {"parent_id": hierarchy_id, "tenant_id": tenant_id, "deleted_at": None}
    ).count()


async def _build_response(hierarchy, tenant_id) -> HierarchyResponse:
    """Build a fully-enriched HierarchyResponse for a single node."""
    created_by_name = await _get_created_by_name(getattr(hierarchy, "created_by", None))
    parent_name = await _get_parent_name(hierarchy.parent_id, tenant_id)
    user_count = await _count_users(hierarchy.id, tenant_id)
    related_roles_count = await _count_related_roles(hierarchy.id, tenant_id)

    return HierarchyResponse.from_orm(
        hierarchy,
        created_by_name=created_by_name,
        user_count=user_count,
        related_roles_count=related_roles_count,
        parent_name=parent_name,
    )


# ---------------------------------------------------------------------------
# Endpoints — accept both hierarchy and department permission strings
# ---------------------------------------------------------------------------

@router.post("/", response_model=HierarchyResponse, status_code=201)
async def create_hierarchy(
    hierarchy_data: HierarchyCreate,
    current_user: User = Depends(check_any_permission(["create_hierarchy", "create_department"])),
):
    service = HierarchyService()
    try:
        hierarchy = await service.create_hierarchy(hierarchy_data, current_user.id, current_user.tenant_id)
        # PERF: hierarchy structure feeds visible-scope computation for the tenant.
        await invalidate_scope_cache(current_user.tenant_id)
        return await _build_response(hierarchy, current_user.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=HierarchyListResponse)
async def get_hierarchies(
    skip: int = 0,
    limit: int = 200,
    current_user: User = Depends(check_any_permission(["view_hierarchy", "view_department"])),
):
    service = HierarchyService()
    hierarchies = await service.get_hierarchies_by_tenant(current_user.tenant_id, skip=skip, limit=limit)

    items = []
    for hierarchy in hierarchies:
        items.append(await _build_response(hierarchy, current_user.tenant_id))

    return HierarchyListResponse(hierarchies=items, total=len(items))


@router.get("/{hierarchy_id}", response_model=HierarchyResponse)
async def get_hierarchy(
    hierarchy_id: str,
    current_user: User = Depends(check_any_permission(["view_hierarchy", "view_department"])),
):
    service = HierarchyService()
    hierarchy = await service.get_hierarchy(hierarchy_id, current_user.tenant_id)
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Hierarchy not found")
    return await _build_response(hierarchy, current_user.tenant_id)


@router.put("/{hierarchy_id}", response_model=HierarchyResponse)
async def update_hierarchy(
    hierarchy_id: str,
    hierarchy_data: HierarchyUpdate,
    current_user: User = Depends(check_any_permission(["edit_hierarchy", "edit_department"])),
):
    service = HierarchyService()
    try:
        hierarchy = await service.update_hierarchy(hierarchy_id, hierarchy_data, current_user.tenant_id)
        if not hierarchy:
            raise HTTPException(status_code=404, detail="Hierarchy not found")
        # PERF: re-parenting a node changes managers' visible scope.
        await invalidate_scope_cache(current_user.tenant_id)
        return await _build_response(hierarchy, current_user.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{hierarchy_id}")
async def delete_hierarchy(
    hierarchy_id: str,
    current_user: User = Depends(check_any_permission(["delete_hierarchy", "delete_department"])),
):
    service = HierarchyService()
    try:
        success = await service.delete_hierarchy(hierarchy_id, current_user.tenant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Hierarchy not found")
        # PERF: removing a node changes the tenant's visible-scope computation.
        await invalidate_scope_cache(current_user.tenant_id)
        return {"error": False, "message": "Hierarchy deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
