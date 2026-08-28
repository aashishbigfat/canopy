"""
Webhook models for external integrations and event notifications.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class WebhookEndpoint(Document):
    """External endpoint to receive webhooks."""
    
    # Basic Info
    url: str
    description: Optional[str] = None
    
    # Configuration
    events: List[str] = Field(default_factory=list)  # List of event types to subscribe to
    is_active: bool = Field(default=True)
    secret: Optional[str] = None  # Signing secret
    
    # Status
    failure_count: int = Field(default=0)
    last_delivery_at: Optional[datetime] = None
    last_delivery_status: Optional[str] = None
    
    # Ownership
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "webhook_endpoints"
        # indexes = [
        # [("tenant_id", 1), ("is_active", 1)],
        # ]


class WebhookEvent(Document):
    """Log of a triggered event that can be sent via webhook."""
    
    # Event Info
    event_type: Indexed(str)  # e.g., contact.created, deal.won
    payload: Dict[str, Any] = Field(default_factory=dict)
    
    # Context
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    triggered_by: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "webhook_events"
        # indexes = [
        # [("tenant_id", 1), ("event_type", 1)],
            # [("created_at", -1)],
        # ]


class WebhookDelivery(Document):
    """Log of a webhook delivery attempt."""
    
    # References
    webhook_id: Indexed(PydanticObjectId)
    event_id: Indexed(PydanticObjectId)
    
    # Request Info
    url: str
    request_headers: Dict[str, str] = Field(default_factory=dict)
    request_body: str
    
    # Response Info
    status_code: Optional[int] = None
    response_headers: Dict[str, str] = Field(default_factory=dict)
    response_body: Optional[str] = None
    duration_ms: Optional[int] = None
    
    # Status
    status: str = Field(default="pending")  # pending, success, failed
    error_message: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "webhook_deliveries"
        # indexes = [
        # [("tenant_id", 1), ("webhook_id", 1)],
            # [("tenant_id", 1), ("status", 1)],
        # ]
