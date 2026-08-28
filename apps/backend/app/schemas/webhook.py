"""
Pydantic schemas for Webhooks API.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ==================== Endpoint Schemas ====================

class WebhookEndpointBase(BaseModel):
    """Base schema for WebhookEndpoint."""
    url: str
    description: Optional[str] = None
    events: List[str] = Field(default_factory=list)
    is_active: bool = True
    secret: Optional[str] = None


class WebhookEndpointCreate(WebhookEndpointBase):
    """Schema for creating a webhook endpoint."""
    pass


class WebhookEndpointUpdate(BaseModel):
    """Schema for updating a webhook endpoint."""
    url: Optional[str] = None
    description: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None
    secret: Optional[str] = None


class WebhookEndpointResponse(WebhookEndpointBase):
    """Schema for webhook endpoint response."""
    id: str
    failure_count: int = 0
    last_delivery_at: Optional[datetime] = None
    last_delivery_status: Optional[str] = None
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class WebhookEndpointListResponse(BaseModel):
    """Schema for paginated webhook endpoint list."""
    endpoints: List[WebhookEndpointResponse]
    total: int
    page: int
    per_page: int


# ==================== Delivery Schemas ====================

class WebhookDeliveryResponse(BaseModel):
    """Schema for webhook delivery response."""
    id: str
    webhook_id: str
    event_id: str
    url: str
    request_headers: Dict[str, str] = Field(default_factory=dict)
    request_body: str
    status_code: Optional[int] = None
    response_headers: Dict[str, str] = Field(default_factory=dict)
    response_body: Optional[str] = None
    duration_ms: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class WebhookDeliveryListResponse(BaseModel):
    """Schema for paginated webhook delivery list."""
    deliveries: List[WebhookDeliveryResponse]
    total: int
    page: int
    per_page: int


# ==================== Event Schemas ====================

class WebhookEventResponse(BaseModel):
    """Schema for webhook event response."""
    id: str
    event_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    triggered_by: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
