"""
Middleware to automatically set activity logging context
"""
import uuid
import time
from typing import Callable
from datetime import datetime
from fastapi import Request, Response


async def activity_context_middleware(request: Request, call_next: Callable):
    """Middleware to add request context for activity logging"""
    # Generate unique request ID
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    # Track request start time
    request.state.start_time = time.time()
    
    response = await call_next(request)
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    return response
