"""
Middleware to automatically set activity-logging context.

Implemented as a *pure ASGI* middleware (not Starlette's ``BaseHTTPMiddleware``)
on purpose: ``BaseHTTPMiddleware`` raises ``RuntimeError("No response
returned.")`` whenever the downstream response is interrupted — e.g. the client
disconnects or the dev server reloads mid-request. A pure ASGI middleware simply
forwards the ASGI events, so a cancelled request flows through cleanly instead of
crashing the middleware stack.
"""
import time
import uuid

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class ActivityContextMiddleware:
    """Stamp each HTTP request with a ``request_id`` + ``start_time`` (read by the
    activity logger via ``request.state``) and echo the id back in
    ``X-Request-ID``.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            # Pass through lifespan / websocket events untouched.
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())

        # ``request.state`` is backed by ``scope["state"]`` — populate it here so
        # downstream handlers (activity_mixin, deps) can read request_id/start_time.
        state = scope.setdefault("state", {})
        state["request_id"] = request_id
        state["start_time"] = time.time()

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers.append((b"x-request-id", request_id.encode("latin-1")))
            await send(message)

        await self.app(scope, receive, send_with_request_id)
