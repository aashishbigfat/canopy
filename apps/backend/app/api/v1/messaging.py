"""
Phase 7 — Messaging routers (Gmail, Email client, WhatsApp, Chatbot).

Mirrors old Laravel:
  Gmail: googleAuth, fetch_mail, get_mail, setup_gmail, remove_gmail,
         get_gmail_token, send_mail_gmail, get_attachment, get_singleMail,
         search_gmail, shync-gmail, gmail-testing
  Email client: email_client/emails, email_client_seen, rest_conversations
  WhatsApp/chatbot: chat-bot, get-all-templates, createTemplate, deleteTemplate,
                    send-whatsapp-message, check-valid-whatsapp-user,
                    get-whatsapp-messages, send-whatsapp-media, get-media,
                    send-whatsapp-template, config-webhook
"""
from __future__ import annotations
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.webhook_signatures import verify_meta_signature
from app.models.user import User
from app.models.messaging import (
    GmailIntegration, EmailMessage,
    WhatsAppTemplate, WhatsAppMessage, ChatbotWebhookEvent,
)

_logger = logging.getLogger(__name__)

router = APIRouter()


# =========================
# GMAIL INTEGRATION
# =========================

class GmailSetupIn(BaseModel):
    email: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    scopes: Optional[List[str]] = None


@router.post("/gmail/setup")
async def setup_gmail(
    payload: GmailSetupIn,
    current_user: User = Depends(get_current_user),
):
    obj = await GmailIntegration.find_one(
        GmailIntegration.user_id == current_user.id,
    )
    data = payload.model_dump(exclude_none=True)
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.is_active = True
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj.model_dump()
    obj = GmailIntegration(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        **data,
    )
    await obj.insert()
    return obj.model_dump()


@router.post("/gmail/remove")
async def remove_gmail(current_user: User = Depends(get_current_user)):
    obj = await GmailIntegration.find_one(
        GmailIntegration.user_id == current_user.id,
    )
    if obj:
        await obj.delete()
    return {"removed": True}


@router.get("/gmail/token")
async def get_gmail_token(current_user: User = Depends(get_current_user)):
    obj = await GmailIntegration.find_one(
        GmailIntegration.user_id == current_user.id,
    )
    if not obj:
        raise HTTPException(404, "Gmail not configured")
    return {
        "access_token": obj.access_token,
        "refresh_token": obj.refresh_token,
        "expires_at": obj.token_expires_at,
        "scopes": obj.scopes,
    }


@router.get("/gmail/auth-url")
async def get_gmail_auth_url(current_user: User = Depends(get_current_user)):
    """
    Return the consent-screen URL the frontend should redirect to.
    Real implementation injects client_id + scopes from env;
    placeholder shape included for parity.
    """
    return {
        "auth_url": (
            "https://accounts.google.com/o/oauth2/v2/auth"
            "?client_id=PLACEHOLDER&response_type=code"
            "&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.modify"
            "&access_type=offline&prompt=consent"
        ),
    }


@router.post("/gmail/sync")
async def sync_gmail(current_user: User = Depends(get_current_user)):
    """Mirror old `/shync-gmail`. Trigger inbox sync."""
    obj = await GmailIntegration.find_one(
        GmailIntegration.user_id == current_user.id,
    )
    if not obj:
        raise HTTPException(404, "Gmail not configured")
    obj.last_sync_at = datetime.utcnow()
    await obj.save()
    return {"queued": True, "last_sync_at": obj.last_sync_at}


@router.get("/gmail/messages")
async def list_gmail_messages(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    seen: Optional[bool] = None,
    starred: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {
        "tenant_id": current_user.tenant_id,
        "user_id": current_user.id,
    }
    if seen is not None:
        query["seen"] = seen
    if starred is not None:
        query["starred"] = starred
    skip = (page - 1) * per_page
    rows = await EmailMessage.find(query).sort("-received_at").skip(skip).limit(per_page).to_list()
    total = await EmailMessage.find(query).count()
    return {
        "messages": [r.model_dump() for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/gmail/messages/{message_id}")
async def get_gmail_message(
    message_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await EmailMessage.get(message_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.user_id != current_user.id):
        raise HTTPException(404, "Message not found")
    return obj.model_dump()


@router.post("/gmail/messages/{message_id}/seen")
async def mark_seen(
    message_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await EmailMessage.get(message_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.user_id != current_user.id):
        raise HTTPException(404, "Message not found")
    obj.seen = True
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.get("/gmail/search")
async def search_gmail(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
):
    rows = await EmailMessage.find(
        {"tenant_id": current_user.tenant_id, "user_id": current_user.id}
    ).to_list()
    needle = q.lower()
    out = [
        r for r in rows
        if (r.subject and needle in r.subject.lower())
        or (r.snippet and needle in r.snippet.lower())
        or (r.body_text and needle in r.body_text.lower())
    ]
    return [r.model_dump() for r in out[:50]]


# =========================
# EMAIL CLIENT (cross-provider)
# =========================

@router.get("/conversations")
async def list_conversations(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_conversations`. Group EmailMessage rows by thread_id."""
    rows = await EmailMessage.find(
        {"tenant_id": current_user.tenant_id, "user_id": current_user.id},
    ).sort("-received_at").to_list()
    by_thread: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        key = r.thread_id or str(r.id)
        by_thread.setdefault(key, []).append(r.model_dump())
    return [
        {"thread_id": tid, "messages": msgs, "count": len(msgs)}
        for tid, msgs in by_thread.items()
    ]


# =========================
# WHATSAPP TEMPLATES
# =========================

class WhatsAppTemplateIn(BaseModel):
    name: str
    language: Optional[str] = "en"
    category: Optional[str] = "MARKETING"
    body: str
    header: Optional[str] = None
    footer: Optional[str] = None
    variables: Optional[List[str]] = None
    external_id: Optional[str] = None


@router.get("/whatsapp/templates")
async def list_wa_templates(current_user: User = Depends(get_current_user)):
    rows = await WhatsAppTemplate.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/whatsapp/templates", status_code=201)
async def create_wa_template(
    payload: WhatsAppTemplateIn,
    current_user: User = Depends(get_current_user),
):
    obj = WhatsAppTemplate(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.delete("/whatsapp/templates/{template_id}", status_code=204)
async def delete_wa_template(
    template_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await WhatsAppTemplate.get(template_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Template not found")
    await obj.delete()


# =========================
# WHATSAPP MESSAGES
# =========================

class WhatsAppSendIn(BaseModel):
    wa_id: str                       # phone number / WA contact id
    body: Optional[str] = None
    template_id: Optional[PydanticObjectId] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None


@router.post("/whatsapp/messages", status_code=201)
async def send_whatsapp_message(
    payload: WhatsAppSendIn,
    current_user: User = Depends(get_current_user),
):
    obj = WhatsAppMessage(
        tenant_id=current_user.tenant_id,
        direction="out",
        wa_id=payload.wa_id,
        user_id=current_user.id,
        template_id=payload.template_id,
        body=payload.body,
        media_url=payload.media_url,
        media_type=payload.media_type,
        status="sent",
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/whatsapp/messages")
async def list_whatsapp_messages(
    wa_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {"tenant_id": current_user.tenant_id}
    if wa_id:
        query["wa_id"] = wa_id
    skip = (page - 1) * per_page
    rows = await WhatsAppMessage.find(query).sort("-created_at").skip(skip).limit(per_page).to_list()
    total = await WhatsAppMessage.find(query).count()
    return {
        "messages": [r.model_dump() for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/whatsapp/check-user")
async def check_valid_whatsapp_user(
    wa_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/check-valid-whatsapp-user`.
    Stub returns valid=true if wa_id is non-empty digits."""
    digits = "".join(c for c in wa_id if c.isdigit())
    return {"wa_id": wa_id, "valid": len(digits) >= 7}


# =========================
# CHATBOT INBOUND WEBHOOK (public)
# =========================

@router.get("/chatbot/webhook")
async def verify_chatbot_webhook(request: Request):
    """Mirror Meta's webhook GET verification challenge.

    SECURITY: only echoes hub.challenge if hub.verify_token matches the
    configured META_WEBHOOK_VERIFY_TOKEN. Previously echoed the challenge
    unconditionally, which is enough for an attacker to register their own
    Meta app with this URL as its webhook target.
    """
    params = dict(request.query_params)
    mode = params.get("hub.mode") or params.get("hub_mode")
    token = params.get("hub.verify_token") or params.get("hub_verify_token")
    challenge = params.get("hub.challenge") or params.get("hub_challenge")

    expected = settings.META_WEBHOOK_VERIFY_TOKEN
    if not expected:
        # Dev-only: if no verify token is configured, refuse rather than
        # silently accepting anything. Set META_WEBHOOK_VERIFY_TOKEN in env.
        raise HTTPException(status_code=503, detail="Webhook verification not configured")
    if mode != "subscribe" or token != expected:
        raise HTTPException(status_code=403, detail="Verification failed")
    return challenge or {"verified": True}


@router.post("/chatbot/webhook", status_code=200)
async def receive_chatbot_event(request: Request):
    """Public inbound webhook — store raw payload, mark unprocessed.

    SECURITY: verifies the X-Hub-Signature-256 HMAC over the raw request body
    using META_WEBHOOK_APP_SECRET. The signature MUST be computed over the
    bytes exactly as sent — that's why we read request.body() instead of
    accepting a parsed Pydantic body. Without this check, anyone could POST
    arbitrary payloads, persist them, and trigger downstream message
    processing.
    """
    raw_body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    secret = settings.META_WEBHOOK_APP_SECRET

    if not secret:
        # Fail closed in any environment with an exposed endpoint
        raise HTTPException(status_code=503, detail="Webhook signature not configured")

    if not verify_meta_signature(raw_body, signature, secret):
        _logger.warning("Chatbot webhook signature verification failed")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        import json as _json
        payload = _json.loads(raw_body.decode("utf-8") or "{}")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")

    entries = payload.get("entry") if isinstance(payload.get("entry"), list) else []
    first_field = None
    if entries and isinstance(entries[0], dict):
        changes = entries[0].get("changes")
        if isinstance(changes, list) and changes and isinstance(changes[0], dict):
            first_field = changes[0].get("field")

    obj = ChatbotWebhookEvent(
        source=payload.get("object") or "meta",
        event_type=first_field,
        raw_payload=payload,
    )
    await obj.insert()
    return {"received": True, "id": str(obj.id)}


@router.get("/chatbot/events")
async def list_chatbot_events(
    processed: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {}
    if processed is not None:
        query["processed"] = processed
    rows = await ChatbotWebhookEvent.find(query).sort("-created_at").limit(100).to_list()
    return [r.model_dump() for r in rows]


# =========================
# EMAIL IMAGE UPLOAD (Sprint A4)
# =========================

@router.post("/email/image-upload")
async def email_image_upload(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_email_image`. Returns S3 URL placeholder."""
    filename = payload.get("filename") or "email-image.png"
    return {
        "uploaded": True,
        "filename": filename,
        "url": f"https://s3.example.com/email-images/{current_user.tenant_id}/{filename}",
    }


@router.post("/email/image-editor")
async def email_image_editor(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_email_image_editor`. Editor-friendly response (TinyMCE etc.)."""
    filename = payload.get("filename") or "image.png"
    return {
        "location": f"https://s3.example.com/email-images/{current_user.tenant_id}/{filename}",
        "filename": filename,
    }


@router.post("/chatbot/events/{event_id}/mark-processed")
async def mark_chatbot_event_processed(
    event_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ChatbotWebhookEvent.get(event_id)
    if not obj:
        raise HTTPException(404, "Event not found")
    obj.processed = True
    obj.processed_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()
