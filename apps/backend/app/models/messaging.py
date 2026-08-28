"""
Phase 7 — Messaging models.

Gmail OAuth integrations, email-client conversation threads, WhatsApp templates,
inbound chatbot/WA webhooks.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class GmailIntegration(Document):
    """Per-user Gmail OAuth credentials & sync state."""
    tenant_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId, unique=True)

    email: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    scopes: List[str] = Field(default_factory=list)

    last_sync_at: Optional[datetime] = None
    last_history_id: Optional[str] = None
    is_active: bool = True

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "gmail_integrations"


class EmailMessage(Document):
    """Generic message stored from inbox sync (Gmail/IMAP/etc.)."""
    tenant_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)

    provider: str = "gmail"           # gmail | imap | smtp
    external_id: Indexed(str)         # provider message id
    thread_id: Optional[str] = None

    from_email: Optional[str] = None
    to_emails: List[str] = Field(default_factory=list)
    cc_emails: List[str] = Field(default_factory=list)
    bcc_emails: List[str] = Field(default_factory=list)

    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    snippet: Optional[str] = None

    received_at: Optional[datetime] = None
    seen: bool = False
    starred: bool = False

    attachments: List[Dict[str, Any]] = Field(default_factory=list)

    # Linkage to CRM entities
    related_lead_id: Optional[PydanticObjectId] = None
    related_opportunity_id: Optional[PydanticObjectId] = None
    related_contact_id: Optional[PydanticObjectId] = None
    related_account_id: Optional[PydanticObjectId] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "email_messages"


class WhatsAppTemplate(Document):
    """WhatsApp Business message template."""
    tenant_id: Indexed(PydanticObjectId)
    name: Indexed(str)
    language: str = "en"
    category: str = "MARKETING"      # MARKETING | UTILITY | AUTHENTICATION
    body: str
    header: Optional[str] = None
    footer: Optional[str] = None
    variables: List[str] = Field(default_factory=list)
    status: str = "draft"            # draft | submitted | approved | rejected

    external_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "whatsapp_templates"


class WhatsAppMessage(Document):
    """WhatsApp message log (in/outbound)."""
    tenant_id: Indexed(PydanticObjectId)
    direction: str                    # in | out
    wa_id: Indexed(str)               # phone number / wa user
    user_id: Optional[PydanticObjectId] = None  # internal sender (out-bound)
    template_id: Optional[PydanticObjectId] = None

    body: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None

    status: str = "sent"              # sent | delivered | read | failed | received
    external_id: Optional[str] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "whatsapp_messages"


class ChatbotWebhookEvent(Document):
    """Raw inbound webhook payload from chat-bot platform (Meta etc.)."""
    tenant_id: Optional[PydanticObjectId] = None
    source: str = "meta"              # meta | dialogflow | other
    event_type: Optional[str] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)
    processed: bool = False
    processed_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chatbot_webhook_events"
