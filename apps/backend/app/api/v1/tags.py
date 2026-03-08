"""
Tag API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.models.user import User
from app.schemas.tag import (
    TagCreate, TagUpdate, TagResponse, TagListResponse,
    TagEntityRequest, EntityTagsResponse
)
from app.services.tag_service import TagService
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=TagResponse, status_code=201)
async def create_tag(data: TagCreate, current_user: User = Depends(get_current_user)):
    """Create a new tag"""
    service = TagService()
    try:
        tag = await service.create_tag(data, str(current_user.id), str(current_user.tenant_id))
        return TagResponse(
            id=str(tag.id),
            tenant_id=str(tag.tenant_id),
            name=tag.name,
            color=tag.color,
            description=tag.description,
            entity_types=tag.entity_types,
            usage_count=getattr(tag, 'usage_count', 0),
            created_at=getattr(tag, 'created_at', None),
            updated_at=getattr(tag, 'updated_at', None)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=TagListResponse)
async def get_tags(
    entity_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all tags"""
    service = TagService()
    tags = await service.get_tags_by_tenant(current_user.tenant_id, entity_type=entity_type)
    return TagListResponse(tags=[TagResponse(id=str(t.id), tenant_id=str(t.tenant_id), name=t.name, color=t.color, description=t.description, entity_types=t.entity_types, usage_count=getattr(t, 'usage_count', 0), created_at=getattr(t, 'created_at', None), updated_at=getattr(t, 'updated_at', None)) for t in tags], total=len(tags))


@router.get("/search")
async def search_tags(query: str, current_user: User = Depends(get_current_user)):
    """Search tags"""
    service = TagService()
    tags = await service.search_tags(query, current_user.tenant_id)
    return {"tags": [TagResponse(id=str(t.id), tenant_id=str(t.tenant_id), name=t.name, color=t.color, description=t.description, entity_types=t.entity_types, usage_count=getattr(t, 'usage_count', 0), created_at=getattr(t, 'created_at', None), updated_at=getattr(t, 'updated_at', None)) for t in tags], "total": len(tags)}


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(tag_id: str, current_user: User = Depends(get_current_user)):
    """Get tag by ID"""
    service = TagService()
    tag = await service.get_tag(tag_id, current_user.tenant_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return TagResponse(id=str(tag.id), tenant_id=str(tag.tenant_id), name=tag.name, color=tag.color, description=tag.description, entity_types=tag.entity_types, usage_count=getattr(tag, 'usage_count', 0), created_at=getattr(tag, 'created_at', None), updated_at=getattr(tag, 'updated_at', None))


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(tag_id: str, data: TagUpdate, current_user: User = Depends(get_current_user)):
    """Update a tag"""
    service = TagService()
    tag = await service.update_tag(tag_id, data, current_user.tenant_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return TagResponse(id=str(tag.id), tenant_id=str(tag.tenant_id), name=tag.name, color=tag.color, description=tag.description, entity_types=tag.entity_types, usage_count=getattr(tag, 'usage_count', 0), created_at=getattr(tag, 'created_at', None), updated_at=getattr(tag, 'updated_at', None))


@router.delete("/{tag_id}")
async def delete_tag(tag_id: str, current_user: User = Depends(get_current_user)):
    """Delete a tag"""
    service = TagService()
    success = await service.delete_tag(tag_id, current_user.tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"error": False, "message": "Tag deleted successfully"}


# Entity tagging endpoints
@router.post("/entity/{entity_type}/{entity_id}")
async def add_tag_to_entity(
    entity_type: str,
    entity_id: str,
    data: TagEntityRequest,
    current_user: User = Depends(get_current_user)
):
    """Add tag to entity"""
    service = TagService()
    success = await service.add_tag_to_entity(
        data.tag_id, entity_type, entity_id, current_user.id, current_user.tenant_id
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add tag")
    return {"error": False, "message": "Tag added successfully"}


@router.delete("/entity/{entity_type}/{entity_id}/{tag_id}")
async def remove_tag_from_entity(
    entity_type: str, entity_id: str, tag_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove tag from entity"""
    service = TagService()
    await service.remove_tag_from_entity(tag_id, entity_type, entity_id, current_user.tenant_id)
    return {"error": False, "message": "Tag removed successfully"}


@router.get("/entity/{entity_type}/{entity_id}", response_model=EntityTagsResponse)
async def get_entity_tags(
    entity_type: str, entity_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get tags for an entity"""
    service = TagService()
    tags = await service.get_entity_tags(entity_type, entity_id, current_user.tenant_id)
    return EntityTagsResponse(
        entity_type=entity_type,
        entity_id=entity_id,
        tags=[TagResponse(id=str(t.id), tenant_id=str(t.tenant_id), name=t.name, color=t.color, description=t.description, entity_types=t.entity_types, usage_count=getattr(t, 'usage_count', 0), created_at=getattr(t, 'created_at', None), updated_at=getattr(t, 'updated_at', None)) for t in tags]
    )
