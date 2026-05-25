"""
Webhook service for managing endpoints and triggering events.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
import asyncio
import hashlib
import hmac
import ipaddress
import json
import logging
import socket
from urllib.parse import urlparse

import httpx
from beanie import PydanticObjectId

from app.core.config import settings
from app.models.webhook import WebhookEndpoint, WebhookEvent, WebhookDelivery
from app.schemas.webhook import WebhookEndpointCreate, WebhookEndpointUpdate


_logger = logging.getLogger(__name__)


class WebhookURLError(ValueError):
    """Raised when a webhook URL is rejected by the SSRF allowlist."""


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Return True for IPs that must never receive outbound webhook delivery.

    Blocks:
    - Loopback (127.0.0.0/8, ::1)
    - Link-local incl. AWS/GCP/Azure instance metadata at 169.254.169.254
    - Private RFC 1918 ranges (10/8, 172.16/12, 192.168/16) and IPv6 ULA
    - Unspecified (0.0.0.0)
    - Reserved / multicast
    """
    return (
        ip.is_loopback
        or ip.is_link_local
        or ip.is_private
        or ip.is_unspecified
        or ip.is_multicast
        or ip.is_reserved
    )


async def _resolve_hostname(host: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Resolve hostname to all addresses. Runs DNS in a thread to keep the loop responsive."""
    loop = asyncio.get_running_loop()
    try:
        infos = await loop.run_in_executor(
            None, lambda: socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
        )
    except socket.gaierror as exc:
        raise WebhookURLError(f"Could not resolve host: {host}") from exc
    addrs = []
    for info in infos:
        sockaddr = info[4]
        try:
            addrs.append(ipaddress.ip_address(sockaddr[0]))
        except ValueError:
            continue
    return addrs


async def validate_webhook_url(url: str) -> None:
    """Validate a webhook URL is safe to deliver to.

    Raises WebhookURLError on any of:
    - Missing/invalid scheme (only http/https allowed)
    - Missing host
    - Host resolves to a blocked IP range (private/loopback/link-local/metadata)
    - Literal IP that is itself in a blocked range

    Resolves DNS and rechecks the resolved IP, which prevents the common
    bypass of pointing a public DNS record at 127.0.0.1 or 169.254.169.254.
    """
    parsed = urlparse(url)
    scheme = (parsed.scheme or "").lower()
    if scheme not in {"http", "https"}:
        raise WebhookURLError(f"URL scheme must be http or https, got '{scheme}'")
    host = parsed.hostname
    if not host:
        raise WebhookURLError("URL must include a host")

    # If the host is already an IP literal, check it directly
    try:
        literal = ipaddress.ip_address(host)
        if _is_blocked_ip(literal):
            raise WebhookURLError(
                f"URL host {host} resolves to a blocked address range"
            )
        return
    except ValueError:
        # Not a literal IP — fall through to DNS resolution
        pass

    addrs = await _resolve_hostname(host)
    if not addrs:
        raise WebhookURLError(f"Could not resolve host: {host}")
    for ip in addrs:
        if _is_blocked_ip(ip):
            raise WebhookURLError(
                f"URL host {host} resolves to a blocked address ({ip})"
            )


class WebhookService:
    """Service for webhook management and delivery."""
    
    # ==================== Endpoint Management ====================
    
    async def create_endpoint(
        self,
        data: WebhookEndpointCreate,
        user_id: str,
        tenant_id: str
    ) -> WebhookEndpoint:
        """Create a new webhook endpoint after SSRF-validating its URL."""
        await validate_webhook_url(data.url)
        endpoint = WebhookEndpoint(
            **data.model_dump(),
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_id
        )
        await endpoint.insert()
        return endpoint
    
    async def get_endpoint(
        self,
        endpoint_id: str,
        tenant_id: str
    ) -> Optional[WebhookEndpoint]:
        """Get an endpoint by ID."""
        return await WebhookEndpoint.find_one(
            {"_id": PydanticObjectId(endpoint_id), "tenant_id": tenant_id}
        )
    
    async def update_endpoint(
        self,
        endpoint_id: str,
        data: WebhookEndpointUpdate,
        tenant_id: str
    ) -> Optional[WebhookEndpoint]:
        """Update an endpoint. If the URL is being changed, SSRF-validate the new value."""
        endpoint = await self.get_endpoint(endpoint_id, tenant_id)
        if not endpoint:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if "url" in update_data and update_data["url"] != endpoint.url:
            await validate_webhook_url(update_data["url"])
        update_data["updated_at"] = datetime.utcnow()

        for key, value in update_data.items():
            setattr(endpoint, key, value)

        await endpoint.save()
        return endpoint
    
    async def delete_endpoint(
        self,
        endpoint_id: str,
        tenant_id: str
    ) -> bool:
        """Delete an endpoint."""
        endpoint = await self.get_endpoint(endpoint_id, tenant_id)
        if not endpoint:
            return False
        await endpoint.delete()
        return True
    
    async def list_endpoints(
        self,
        tenant_id: str,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[WebhookEndpoint], int]:
        """List webhook endpoints."""
        query = {"tenant_id": tenant_id}
        
        total = await WebhookEndpoint.find(query).count()
        
        endpoints = await WebhookEndpoint.find(query)\
            .sort(-WebhookEndpoint.created_at)\
            .skip((page - 1) * per_page)\
            .limit(per_page)\
            .to_list()
            
        return endpoints, total
    
    # ==================== Event Triggering ====================
    
    async def trigger_event(
        self,
        event_type: str,
        payload: Dict[str, Any],
        tenant_id: str,
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        triggered_by: Optional[str] = None
    ) -> WebhookEvent:
        """Trigger a webhook event and queue deliveries."""
        # 1. Log Event
        event = WebhookEvent(
            event_type=event_type,
            payload=payload,
            entity_id=entity_id,
            entity_type=entity_type,
            triggered_by=triggered_by,
            tenant_id=tenant_id
        )
        await event.insert()
        
        # 2. Find matching active endpoints
        endpoints = await WebhookEndpoint.find(
            {"tenant_id": tenant_id, "is_active": True, "$or": [{"events": "*"}, {"events": event_type}]}
        ).to_list()
        
        # 3. Deliver (Async in a real worker, but here simplified)
        # ideally this would push to Celery/Redis queue
        for endpoint in endpoints:
            await self._deliver_webhook(endpoint, event)
            
        return event

    async def _deliver_webhook(
        self,
        endpoint: WebhookEndpoint,
        event: WebhookEvent
    ):
        """Perform webhook delivery attempt."""
        # Prepare payload
        payload_json = json.dumps(event.payload, default=str)
        
        # Calculate signature if secret exists
        headers = {
            "Content-Type": "application/json",
            "X-Event-Type": event.event_type,
            "X-Event-ID": str(event.id),
            "User-Agent": "TutterflyCRM-Webhook/1.0"
        }
        
        if endpoint.secret:
            signature = hmac.new(
                key=endpoint.secret.encode(),
                msg=payload_json.encode(),
                digestmod=hashlib.sha256
            ).hexdigest()
            headers["X-Signature"] = f"sha256={signature}"
        
        delivery = WebhookDelivery(
            webhook_id=str(endpoint.id),
            event_id=str(event.id),
            url=endpoint.url,
            request_headers=headers,
            request_body=payload_json,
            status="running",
            tenant_id=endpoint.tenant_id
        )
        await delivery.insert()
        
        start_time = datetime.utcnow()
        try:
            # SSRF defense-in-depth: re-validate at delivery time. The endpoint
            # was validated on create/update, but DNS records can change to
            # point at internal IPs between then and now.
            await validate_webhook_url(endpoint.url)

            async with httpx.AsyncClient(follow_redirects=False) as client:
                response = await client.post(
                    endpoint.url,
                    headers=headers,
                    content=payload_json,
                    timeout=10.0
                )

            delivery.status_code = response.status_code
            delivery.response_headers = dict(response.headers)
            delivery.response_body = response.text[:1000]  # Truncate log

            if 200 <= response.status_code < 300:
                delivery.status = "success"
                endpoint.last_delivery_status = "success"
            else:
                delivery.status = "failed"
                delivery.error_message = f"HTTP {response.status_code}"
                endpoint.last_delivery_status = "failed"
                endpoint.failure_count += 1

        except WebhookURLError as e:
            delivery.status = "failed"
            delivery.error_message = f"URL rejected: {e}"
            endpoint.last_delivery_status = "blocked"
            endpoint.failure_count += 1
            _logger.warning(
                "Blocked webhook delivery to %s (endpoint %s): %s",
                endpoint.url, endpoint.id, e,
            )
        except Exception as e:
            delivery.status = "failed"
            delivery.error_message = str(e)
            endpoint.last_delivery_status = "error"
            endpoint.failure_count += 1
            
        end_time = datetime.utcnow()
        delivery.duration_ms = int((end_time - start_time).total_seconds() * 1000)
        
        endpoint.last_delivery_at = end_time
        await endpoint.save()
        await delivery.save()
    
    async def list_deliveries(
        self,
        tenant_id: str,
        webhook_id: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[WebhookDelivery], int]:
        """List webhook deliveries."""
        query = {"tenant_id": tenant_id}
        if webhook_id:
            query["webhook_id"] = webhook_id
            
        total = await WebhookDelivery.find(query).count()
        
        deliveries = await WebhookDelivery.find(query)\
            .sort(-WebhookDelivery.created_at)\
            .skip((page - 1) * per_page)\
            .limit(per_page)\
            .to_list()
            
        return deliveries, total


# Singleton instance
webhook_service = WebhookService()
