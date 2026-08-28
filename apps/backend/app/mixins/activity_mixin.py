"""
Activity logging mixin for comprehensive audit trail
"""
import logging
from typing import Dict, Any, Optional
from fastapi import Request
from bson import ObjectId
from datetime import datetime
import json

from app.services.activity_log_service import ActivityLogService
from app.core.request_context import get_activity_context


_logger = logging.getLogger(__name__)


class ActivityMixin:
    """Mixin class for adding comprehensive activity logging to services"""

    def __init__(self):
        self.request_context = None

    def set_request_context(self, request: Request, user):
        """Set request context for activity logging"""
        self.request_context = {
            'ip_address': self._get_client_ip(request),
            'user_agent': request.headers.get('user-agent', ''),
            'user_id': user.id,
            'user_name': user.name,
            'user_email': user.email,
            'tenant_id': user.tenant_id,
            'request_id': getattr(request.state, 'request_id', None),
            'timestamp': datetime.utcnow()
        }

    def _resolve_context(self):
        """Return the explicit per-service context if set, otherwise fall back
        to the per-request context populated by get_current_user(). This lets
        every service log activity automatically without each endpoint wiring
        set_request_context()."""
        return self.request_context or get_activity_context()
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for forwarded IP
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        # Check for real IP
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        # Fall back to client IP
        return request.client.host if request.client else 'unknown'
    
    def _get_entity_name(self, entity) -> str:
        """Extract a human-readable name for logging.

        Tries common single-field names first, then composes a person name from
        first/last (contacts, leads, person accounts) so activity logs never fall
        back to showing a raw ObjectId.
        """
        # Try common single-field names
        for field in ['name', 'full_name', 'title', 'subject', 'display_name']:
            try:
                value = getattr(entity, field, None)
            except Exception:
                value = None
            if value:
                return str(value)

        # Compose a person name from first/last (contacts, leads, person accounts)
        first = getattr(entity, 'first_name', None) or ''
        last = getattr(entity, 'last_name', None) or ''
        composed = f"{first} {last}".strip()
        if composed:
            return composed

        # Fall back to ID
        return str(entity.id) if hasattr(entity, 'id') else 'unknown'
    
    def _sanitize_for_logging(self, data: Any) -> Any:
        """Sanitize data for logging (remove sensitive info)"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                # Skip sensitive fields
                if any(sensitive in key.lower() for sensitive in ['password', 'token', 'secret', 'key', 'auth']):
                    sanitized[key] = '[REDACTED]'
                else:
                    sanitized[key] = self._sanitize_for_logging(value)
            return sanitized
        elif isinstance(data, list):
            return [self._sanitize_for_logging(item) for item in data]
        elif isinstance(data, (str, int, float, bool, type(None))):
            return data
        else:
            # Convert complex objects to dict
            try:
                if hasattr(data, 'model_dump'):
                    return self._sanitize_for_logging(data.model_dump())
                elif hasattr(data, '__dict__'):
                    return self._sanitize_for_logging(data.__dict__)
                else:
                    return str(data)
            except:
                return '[OBJECT]'
    
    async def log_entity_created(
        self,
        entity: Any,
        entity_type: str,
        additional_data: Optional[Dict] = None
    ):
        """Log entity creation"""
        if not self._resolve_context():
            return
        
        entity_data = self._sanitize_for_logging(entity.model_dump()) if hasattr(entity, 'model_dump') else {}
        
        changes = {
            'action_type': 'create',
            'new_values': entity_data
        }
        
        if additional_data:
            changes.update(additional_data)
        
        await self._log_activity(
            action='created',
            entity_type=entity_type,
            entity=entity,
            changes=changes
        )
    
    async def log_entity_updated(
        self,
        entity: Any,
        entity_type: str,
        old_values: Dict,
        updated_fields: Optional[Dict] = None,
        additional_data: Optional[Dict] = None
    ):
        """Log entity update"""
        if not self._resolve_context():
            return
        
        new_values = self._sanitize_for_logging(entity.model_dump()) if hasattr(entity, 'model_dump') else {}
        
        changes = {
            'action_type': 'update',
            'old_values': self._sanitize_for_logging(old_values),
            'new_values': new_values,
            'updated_fields': updated_fields or {}
        }
        
        if additional_data:
            changes.update(additional_data)
        
        await self._log_activity(
            action='updated',
            entity_type=entity_type,
            entity=entity,
            changes=changes
        )
    
    async def log_entity_deleted(
        self,
        entity: Any,
        entity_type: str,
        additional_data: Optional[Dict] = None
    ):
        """Log entity deletion"""
        if not self._resolve_context():
            return
        
        entity_data = self._sanitize_for_logging(entity.model_dump()) if hasattr(entity, 'model_dump') else {}
        
        changes = {
            'action_type': 'delete',
            'old_values': entity_data
        }
        
        if additional_data:
            changes.update(additional_data)
        
        await self._log_activity(
            action='deleted',
            entity_type=entity_type,
            entity=entity,
            changes=changes
        )
    
    async def log_status_changed(
        self,
        entity: Any,
        entity_type: str,
        old_status: str,
        new_status: str,
        additional_data: Optional[Dict] = None
    ):
        """Log status change"""
        if not self._resolve_context():
            return
        
        changes = {
            'action_type': 'status_change',
            'old_status': old_status,
            'new_status': new_status
        }
        
        if additional_data:
            changes.update(additional_data)
        
        await self._log_activity(
            action='status_changed',
            entity_type=entity_type,
            entity=entity,
            changes=changes,
            description=f"Status changed from '{old_status}' to '{new_status}'"
        )
    
    async def log_assignment_changed(
        self,
        entity: Any,
        entity_type: str,
        old_assigned_to: Optional[str],
        new_assigned_to: Optional[str],
        additional_data: Optional[Dict] = None
    ):
        """Log assignment change"""
        if not self._resolve_context():
            return
        
        changes = {
            'action_type': 'assignment_change',
            'old_assigned_to': old_assigned_to,
            'new_assigned_to': new_assigned_to
        }
        
        if additional_data:
            changes.update(additional_data)
        
        old_name = f" (was: {old_assigned_to})" if old_assigned_to else ""
        new_name = f" (now: {new_assigned_to})" if new_assigned_to else " (unassigned)"
        description = f"Assignment changed{old_name}{new_name}"
        
        await self._log_activity(
            action='assignment_changed',
            entity_type=entity_type,
            entity=entity,
            changes=changes,
            description=description
        )
    
    async def log_custom_activity(
        self,
        action: str,
        entity_type: str,
        entity: Any,
        description: str,
        changes: Optional[Dict] = None
    ):
        """Log custom activity"""
        if not self._resolve_context():
            return
        
        await self._log_activity(
            action=action,
            entity_type=entity_type,
            entity=entity,
            changes=changes or {},
            description=description
        )
    
    async def _log_activity(
        self,
        action: str,
        entity_type: str,
        entity: Any,
        changes: Dict,
        description: Optional[str] = None
    ):
        """Internal method to log activity"""
        try:
            ctx = self._resolve_context()
            if not ctx:
                return
            activity_service = ActivityLogService()

            await activity_service.log_activity(
                user_id=ctx['user_id'],
                user_name=ctx['user_name'],
                tenant_id=ctx['tenant_id'],
                action=action,
                entity_type=entity_type,
                entity_id=ObjectId(entity.id) if hasattr(entity, 'id') and entity.id else None,
                entity_name=self._get_entity_name(entity),
                description=description or f"{action.title()} {entity_type}: {self._get_entity_name(entity)}",
                changes=changes,
                ip_address=ctx.get('ip_address'),
                user_agent=ctx.get('user_agent')
            )
        except Exception as e:
            # Don't let logging errors break the main flow
            _logger.warning("Activity logging error: %s", e)
    
    def get_request_summary(self) -> Dict:
        """Get summary of current request context"""
        if not self._resolve_context():
            return {}
        
        return {
            'user_id': str(self.request_context['user_id']),
            'user_name': self.request_context['user_name'],
            'user_email': self.request_context['user_email'],
            'tenant_id': str(self.request_context['tenant_id']),
            'ip_address': self.request_context['ip_address'],
            'timestamp': self.request_context['timestamp'].isoformat()
        }
