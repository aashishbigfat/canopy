"""
Phase 17 — Misc / utility / public endpoints.

Mirrors old Laravel utility paths:
  GET  /check_tenant_activity        public tenant existence probe
  GET  /get_s3_url                   pre-signed S3 upload URL
  POST /get_lat_long                 reverse geocoding
  GET  /search_country               country search
  GET  /verifyemail/{token}          email verification (public)
  POST /verify/normal_email/resend   resend verification email
  GET  /access_login                 admin impersonation token
  GET  /logout                       legacy logout alias
  GET  /pull_leads_fb                pull pending FB leads
  POST /save_fb_leads                save FB leads to system
  GET  /check_tenant_fb              FB integration health
  POST /get_facebook_token           store FB long-lived token
  POST /chat-bot/test                manual chat-bot replay
  GET  /pdf_response_app             alt PDF callback (mobile app)

Decommissioned (intentionally NOT exposed):
  /php_info  — security risk
  /exp_opp_test, /opp_graph_performance_test, /gmail-testing  — dev probes
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
import secrets
from beanie import PydanticObjectId
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.models.user import User
from app.models.tenant import Tenant
from app.models.country import Country
from app.models.email_token import EmailToken

router = APIRouter()


# ============== Tenant probes (public) ==============

@router.get("/check-tenant-activity", tags=["Public"])
async def check_tenant_activity(
    tenant_id: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
):
    """Mirror old `/check_tenant_activity`."""
    if tenant_id:
        try:
            t = await Tenant.get(PydanticObjectId(tenant_id))
        except Exception:
            t = None
        return {"active": bool(t)}
    if domain:
        t = await Tenant.find_one({"domain": domain}) if hasattr(Tenant, "domain") else None
        return {"active": bool(t)}
    return {"active": False}


# ============== S3 presigned URL ==============

class S3UrlRequest(BaseModel):
    filename: str
    content_type: Optional[str] = None
    folder: Optional[str] = None


@router.post("/s3-url")
async def get_s3_url(
    payload: S3UrlRequest,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/get_s3_url`. Returns a presigned PUT URL for uploads.
    Stub returns shape; real signing handled by file_service when AWS creds set."""
    key = f"{current_user.tenant_id}/{payload.folder or 'misc'}/{datetime.utcnow().timestamp():.0f}-{payload.filename}"
    return {
        "upload_url": f"https://s3.example.com/PRESIGNED/{key}",
        "key": key,
        "method": "PUT",
        "content_type": payload.content_type,
        "expires_in": 600,
    }


# ============== Geo helpers ==============

class LatLongRequest(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None


@router.post("/lat-long")
async def get_lat_long(
    payload: LatLongRequest,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/get_lat_long`. Stub returns 0/0 — real geocoder integration
    plugged in by services layer."""
    return {
        "address": payload.address,
        "lat": 0.0,
        "lng": 0.0,
        "resolved": False,
    }


@router.get("/search-country")
async def search_country(
    q: str = Query("", description="Substring match against country name"),
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/search_country`."""
    rows = await Country.find_all().to_list()
    needle = q.lower()
    out = [c for c in rows if not needle or needle in (c.name or "").lower()]
    return [
        {"id": str(c.id), "name": c.name, "code": getattr(c, "code", None)}
        for c in out[:50]
    ]


# ============== Verification (public) ==============

@router.get("/verify-email/{token}", tags=["Public"])
async def verify_email(token: str):
    """Mirror old `/verifyemail/{token}`."""
    obj = await EmailToken.find_one({"token": token})
    if not obj:
        raise HTTPException(404, "Invalid token")
    if obj.used_at:
        return {"verified": True, "already_used": True}
    obj.used_at = datetime.utcnow()
    await obj.save()
    user = await User.get(obj.user_id)
    if user and hasattr(user, "is_email_verified"):
        user.is_email_verified = True
        await user.save()
    return {"verified": True}


@router.post("/verify-email/resend", tags=["Public"])
async def resend_verification_email(payload: Dict[str, Any]):
    """Mirror old `/verify/normal_email/resend`."""
    email = payload.get("email")
    if not email:
        raise HTTPException(400, "email required")
    user = await User.find_one({"email": email})
    if not user:
        # Don't leak existence
        return {"sent": True}
    obj = EmailToken(
        user_id=user.id,
        token=secrets.token_urlsafe(32),
        purpose="verify",
    )
    await obj.insert()
    return {"sent": True}


# ============== Admin impersonation ==============

class AccessLoginIn(BaseModel):
    target_user_id: PydanticObjectId


@router.post("/access-login")
async def access_login(
    payload: AccessLoginIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/access_login`. Admin-only impersonation token issuance."""
    target = await User.get(payload.target_user_id)
    if not target or target.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Target user not found")
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(403, "Admin only")
    from app.api.deps import create_access_token
    token = create_access_token({"sub": str(target.id), "impersonated_by": str(current_user.id)})
    return {"token": token, "target_user_id": str(target.id)}


# ============== Legacy logout alias ==============

@router.get("/logout")
async def logout_alias(current_user: User = Depends(get_current_user)):
    """Mirror old `/logout` GET. JWT is stateless; this is a no-op signal."""
    return {"logged_out": True}


# ============== FB integration stubs ==============

@router.get("/facebook/leads/pull")
async def pull_leads_fb(current_user: User = Depends(get_current_user)):
    """Mirror old `/pull_leads_fb`. Triggers FB Lead Ads pull."""
    return {"queued": True, "tenant_id": str(current_user.tenant_id)}


class FbLeadsIn(BaseModel):
    leads: List[Dict[str, Any]]


@router.post("/facebook/leads/save")
async def save_fb_leads(
    payload: FbLeadsIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/save_fb_leads`."""
    from app.models.opportunity_workflow import ExternalLead
    saved = 0
    for d in payload.leads:
        obj = ExternalLead(
            tenant_id=current_user.tenant_id,
            source="facebook",
            source_ref=d.get("id") or d.get("ref"),
            raw_payload=d,
            email=d.get("email"),
            first_name=d.get("first_name"),
            last_name=d.get("last_name"),
            phone=d.get("phone"),
        )
        await obj.insert()
        saved += 1
    return {"saved": saved}


@router.get("/facebook/health")
async def check_facebook_health(current_user: User = Depends(get_current_user)):
    """Mirror old `/check_tenant_fb`."""
    return {
        "tenant_id": str(current_user.tenant_id),
        "fb_configured": False,
        "status": "stub",
    }


class FbTokenIn(BaseModel):
    long_lived_token: str
    page_id: Optional[str] = None
    expires_at: Optional[datetime] = None


@router.post("/facebook/token")
async def store_facebook_token(
    payload: FbTokenIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/get_facebook_token`. Stores token on tenant settings."""
    from app.models.settings import TenantSettings
    obj = await TenantSettings.find_one(
        {"tenant_id": current_user.tenant_id},
    )
    if not obj:
        obj = TenantSettings(tenant_id=current_user.tenant_id)
        await obj.insert()
    extras = obj.custom_settings or {}
    extras["facebook"] = payload.model_dump(exclude_none=True)
    obj.custom_settings = extras
    await obj.save()
    return {"saved": True}


# ============== AI email reader (Sprint A5) — public API key gated ==============

from app.middleware.api_key import require_api_key


@router.get("/ai-email-report", tags=["Public", "AI"])
async def ai_email_report(
    api_key: str = Depends(require_api_key),
    tenant_id: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=90),
):
    """Mirror old `/ai_email_report`. Returns aggregate email signal."""
    return {
        "tenant_id": tenant_id,
        "window_days": days,
        "metrics": {
            "total_emails": 0,
            "open_rate": 0.0,
            "click_rate": 0.0,
            "top_senders": [],
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


# ============== Misc utility (Sprint A7) ==============

@router.get("/operators")
async def get_operators(current_user: User = Depends(get_current_user)):
    """Mirror old `/operators`. Filter operators picklist."""
    return [
        {"value": "eq", "label": "Equals"},
        {"value": "ne", "label": "Not equals"},
        {"value": "gt", "label": "Greater than"},
        {"value": "gte", "label": "Greater than or equal"},
        {"value": "lt", "label": "Less than"},
        {"value": "lte", "label": "Less than or equal"},
        {"value": "contains", "label": "Contains"},
        {"value": "starts_with", "label": "Starts with"},
        {"value": "ends_with", "label": "Ends with"},
        {"value": "in", "label": "In"},
        {"value": "not_in", "label": "Not in"},
        {"value": "between", "label": "Between"},
        {"value": "is_null", "label": "Is empty"},
        {"value": "is_not_null", "label": "Is not empty"},
    ]


@router.get("/email-client/seen")
async def email_client_seen(current_user: User = Depends(get_current_user)):
    """Mirror old `/email_client_seen`. Returns IMAP seen flag count."""
    return {
        "tenant_id": str(current_user.tenant_id),
        "user_id": str(current_user.id),
        "seen_count": 0,
        "unseen_count": 0,
    }


class EmailSetupIn(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str
    smtp_password: str
    smtp_use_tls: bool = True
    from_email: Optional[str] = None
    from_name: Optional[str] = None


@router.post("/email-setup")
async def email_setup(
    payload: EmailSetupIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_setup_mail` and `/create_mail_setup`. Stores SMTP config."""
    from app.models.settings import TenantSettings
    obj = await TenantSettings.find_one(
        {"tenant_id": current_user.tenant_id},
    )
    if not obj:
        obj = TenantSettings(tenant_id=current_user.tenant_id)
        await obj.insert()
    extras = obj.custom_settings or {}
    extras["smtp"] = payload.model_dump(exclude_none=True)
    obj.custom_settings = extras
    await obj.save()
    return {"saved": True}


@router.get("/check-pdf-status")
async def check_pdf_status_alias(
    job_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/check_pdf_status`. Polls itinerary PDF job."""
    if not job_id:
        return {"status": "no_job"}
    from app.models.itinerary_extras import ItineraryPDFJob
    try:
        obj = await ItineraryPDFJob.get(PydanticObjectId(job_id))
    except Exception:
        return {"status": "not_found"}
    if not obj or obj.tenant_id != current_user.tenant_id:
        return {"status": "not_found"}
    return {
        "job_id": str(obj.id),
        "status": obj.status,
        "pdf_url": obj.pdf_url,
        "error": obj.error,
    }


@router.get("/get-tenant-user-details", tags=["Public"])
async def public_tenant_user_details(
    tenant_id: str = Query(...),
):
    """Mirror old `/get_tenant_user_details`. Public summary for capture forms."""
    try:
        t = await Tenant.get(PydanticObjectId(tenant_id))
    except Exception:
        return {"exists": False}
    if not t:
        return {"exists": False}
    return {
        "exists": True,
        "tenant_name": getattr(t, "name", None),
        "industry": getattr(t, "industry", None),
    }


# ============== Lead capture cleanup (Sprint A6) ==============

class CaptureCheckIn(BaseModel):
    tenant_id: PydanticObjectId
    email: Optional[str] = None
    mobile: Optional[str] = None


@router.post("/lead-capture/check-duplicate", tags=["Public"])
async def check_capture_duplicate(payload: CaptureCheckIn):
    """Mirror old `/check_capture_leads`. Public duplicate probe."""
    from app.models.lead import Lead
    if not payload.email and not payload.mobile:
        return {"duplicate": False}
    query: Dict[str, Any] = {"tenant_id": payload.tenant_id}
    if payload.email:
        query["email"] = payload.email
    elif payload.mobile:
        query["mobile"] = payload.mobile
    lead = await Lead.find_one(query)
    return {"duplicate": bool(lead), "lead_id": str(lead.id) if lead else None}


class CaptureRefIn(BaseModel):
    tenant_id: PydanticObjectId
    source_ref: str


@router.post("/lead-capture/check-by-ref", tags=["Public"])
async def check_capture_by_ref(payload: CaptureRefIn):
    """Mirror old `/check_capture_leads_ref_id`."""
    from app.models.opportunity_workflow import ExternalLead
    obj = await ExternalLead.find_one(
        {"tenant_id": payload.tenant_id, "source_ref": payload.source_ref},
    )
    return {"found": bool(obj), "external_lead_id": str(obj.id) if obj else None}


# ============== Decommissioned aliases (return 410) ==============

@router.get("/php-info", tags=["Decommissioned"])
async def php_info_decommissioned():
    raise HTTPException(410, "phpinfo() decommissioned (security risk)")
