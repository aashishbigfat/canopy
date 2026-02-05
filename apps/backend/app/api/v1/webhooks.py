"""
API endpoints for Webhooks.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user, check_permission
from app.models.user import User
from app.services.webhook_service import webhook_service
from app.schemas.webhook import (
    WebhookEndpointCreate, WebhookEndpointUpdate, WebhookEndpointResponse, WebhookEndpointListResponse,
    WebhookDeliveryListResponse, WebhookDeliveryResponse
)

router = APIRouter()


# ==================== Endpoints ====================

@router.post("", response_model=WebhookEndpointResponse)
async def create_endpoint(
    data: WebhookEndpointCreate,
    current_user: User = Depends(check_permission("manage_webhook"))
):
    """Create a new webhook endpoint."""
    endpoint = await webhook_service.create_endpoint(
        data=data,
        user_id=str(current_user.id),
        tenant_id=current_user.tenant_id
    )
    return WebhookEndpointResponse(
        id=str(endpoint.id),
        **endpoint.model_dump(exclude={"id"})
    )


@router.get("", response_model=WebhookEndpointListResponse)
async def list_endpoints(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(check_permission("view_webhook"))
):
    """List webhook endpoints."""
    endpoints, total = await webhook_service.list_endpoints(
        tenant_id=current_user.tenant_id,
        page=page,
        per_page=per_page
    )
    return WebhookEndpointListResponse(
        endpoints=[
            WebhookEndpointResponse(id=str(e.id), **e.model_dump(exclude={"id"}))
            for e in endpoints
        ],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{endpoint_id}", response_model=WebhookEndpointResponse)
async def get_endpoint(
    endpoint_id: str,
    current_user: User = Depends(check_permission("view_webhook"))
):
    """Get a webhook endpoint by ID."""
    endpoint = await webhook_service.get_endpoint(endpoint_id, current_user.tenant_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    return WebhookEndpointResponse(
        id=str(endpoint.id),
        **endpoint.model_dump(exclude={"id"})
    )


@router.put("/{endpoint_id}", response_model=WebhookEndpointResponse)
async def update_endpoint(
    endpoint_id: str,
    data: WebhookEndpointUpdate,
    current_user: User = Depends(check_permission("manage_webhook"))
):
    """Update a webhook endpoint."""
    endpoint = await webhook_service.update_endpoint(
        endpoint_id=endpoint_id,
        data=data,
        tenant_id=current_user.tenant_id
    )
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    return WebhookEndpointResponse(
        id=str(endpoint.id),
        **endpoint.model_dump(exclude={"id"})
    )


@router.delete("/{endpoint_id}")
async def delete_endpoint(
    endpoint_id: str,
    current_user: User = Depends(check_permission("manage_webhook"))
):
    """Delete a webhook endpoint."""
    deleted = await webhook_service.delete_endpoint(endpoint_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    return {"message": "Endpoint deleted successfully"}


# ==================== Deliveries ====================

@router.get("/{endpoint_id}/deliveries", response_model=WebhookDeliveryListResponse)
async def list_deliveries(
    endpoint_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(check_permission("view_webhook"))
):
    """List deliveries for an endpoint."""
    deliveries, total = await webhook_service.list_deliveries(
        tenant_id=current_user.tenant_id,
        webhook_id=endpoint_id,
        page=page,
        per_page=per_page
    )
    return WebhookDeliveryListResponse(
        deliveries=[
            WebhookDeliveryResponse(id=str(d.id), **d.model_dump(exclude={"id"}))
            for d in deliveries
        ],
        total=total,
        page=page,
        per_page=per_page
    )
