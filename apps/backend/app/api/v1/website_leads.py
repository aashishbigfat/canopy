"""
Website enquiry capture (public, API-key protected).

POST /api/v1/website-leads/capture

Accepts the exact JSON dookwebsite already posts to the old CRM's
`/tfc/api/capture_lead`, so both CRMs receive identical data. Auth is the
`X-Api-Key` header checked against WEBSITE_CAPTURE_API_KEY; the endpoint is
disabled (503) while that is unset. The `token` inside the body belongs to the
old CRM and is ignored. `X-Old-Tfc-Lead-Id` carries the old CRM's lead id.

Responses mirror the old endpoint: {"error": false, "message": ..., "lead_id": ...}.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.services import website_lead_capture_service as capture

logger = logging.getLogger(__name__)

router = APIRouter()


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": True, "message": message})


def _validation_message(exc: ValidationError) -> str:
    # Field names and reasons only; submitted values are personal data.
    parts = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", ()))
        parts.append(f"{loc}: {err.get('msg')}" if loc else str(err.get("msg")))
    return "; ".join(parts)


@router.post("/capture", status_code=201, tags=["Public Capture"])
@limiter.limit("120/minute")
async def capture_website_lead(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    x_old_tfc_lead_id: Optional[str] = Header(None),
):
    if not settings.WEBSITE_CAPTURE_API_KEY:
        return _error(503, "Website capture is not configured")
    if not capture.is_valid_api_key(x_api_key):
        return _error(401, "Invalid API key")

    try:
        payload = await request.json()
    except Exception:
        return _error(400, "Body must be JSON")
    if not isinstance(payload, dict):
        return _error(400, "Body must be a JSON object")

    old_lead_id = (x_old_tfc_lead_id or "").strip()[:64] or None
    try:
        lead = await capture.capture_website_lead(payload, old_lead_id, request)
    except capture.WebsiteCaptureNotConfigured as exc:
        logger.error("Website capture misconfigured: %s", exc)
        return _error(503, "Website capture is not configured")
    except ValidationError as exc:
        return _error(422, _validation_message(exc))
    except HTTPException as exc:
        return _error(exc.status_code, str(exc.detail))
    except ValueError as exc:
        return _error(422, str(exc))
    except Exception:
        logger.exception("Website capture failed")
        return _error(500, "Lead could not be created")

    return JSONResponse(
        status_code=201,
        content={"error": False, "message": "Lead created succesfully!", "lead_id": str(lead.id)},
    )
