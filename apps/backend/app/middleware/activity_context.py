"""
Middleware to automatically set activity logging context
"""
import uuid
from typing import Callable
from datetime import datetime
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class ActivityContextMiddleware(BaseHTTPMiddleware):
    """Middleware to add request context for activity logging"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Add request start time for performance tracking
        request.state.start_time = datetime.utcnow()
        
        # Process the request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
