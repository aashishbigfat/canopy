"""
Template API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.models.user import User
from app.schemas.template import (
    TemplateCreate, TemplateUpdate, TemplateResponse, TemplateListResponse,
    TemplateRenderRequest, TemplateRenderResponse
)
from app.services.template_service import TemplateService
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=TemplateResponse, status_code=201)
async def create_template(data: TemplateCreate, current_user: User = Depends(get_current_user)):
    """Create a template"""
    service = TemplateService()
    template = await service.create_template(data, current_user.id, current_user.tenant_id)
    return TemplateResponse.from_orm(template)


@router.get("/", response_model=TemplateListResponse)
async def get_templates(
    type: Optional[str] = None, category: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get templates"""
    service = TemplateService()
    templates = await service.get_templates(current_user.tenant_id, type=type, category=category, skip=skip, limit=limit)
    return TemplateListResponse(templates=[TemplateResponse.from_orm(t) for t in templates], total=len(templates))


@router.get("/search")
async def search_templates(query: str, current_user: User = Depends(get_current_user)):
    """Search templates"""
    service = TemplateService()
    templates = await service.search_templates(query, current_user.tenant_id)
    return {"templates": [TemplateResponse.from_orm(t) for t in templates], "total": len(templates)}


@router.get("/default/{type}", response_model=TemplateResponse)
async def get_default_template(type: str, current_user: User = Depends(get_current_user)):
    """Get default template for type"""
    service = TemplateService()
    template = await service.get_default_template(type, current_user.tenant_id)
    if not template:
        raise HTTPException(status_code=404, detail="No default template found")
    return TemplateResponse.from_orm(template)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, current_user: User = Depends(get_current_user)):
    """Get template by ID"""
    service = TemplateService()
    template = await service.get_template(template_id, current_user.tenant_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse.from_orm(template)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: str, data: TemplateUpdate, current_user: User = Depends(get_current_user)):
    """Update a template"""
    service = TemplateService()
    template = await service.update_template(template_id, data, current_user.tenant_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse.from_orm(template)


@router.delete("/{template_id}")
async def delete_template(template_id: str, current_user: User = Depends(get_current_user)):
    """Delete a template"""
    service = TemplateService()
    success = await service.delete_template(template_id, current_user.tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"error": False, "message": "Template deleted"}


@router.post("/{template_id}/render", response_model=TemplateRenderResponse)
async def render_template(template_id: str, data: TemplateRenderRequest, current_user: User = Depends(get_current_user)):
    """Render template with variables"""
    service = TemplateService()
    template = await service.get_template(template_id, current_user.tenant_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    result = service.render_template(template, data.data)
    return TemplateRenderResponse(**result)
