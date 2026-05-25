"""
Push notification service — wraps the existing FCMToken registry.

Uses Firebase Admin SDK when available; degrades to a no-op otherwise so that
deployments without Firebase configured don't break (notifications still go
into the in-app inbox via NotificationService).
"""
from __future__ import annotations

from typing import Any, Dict, Optional
import logging

from bson import ObjectId

from app.core.config import settings
from app.models.fcm import FCMToken

logger = logging.getLogger(__name__)

_firebase_app = None
_messaging = None
_init_attempted = False


def _ensure_firebase() -> bool:
    """Lazy-init Firebase Admin if credentials are configured."""
    global _firebase_app, _messaging, _init_attempted
    if _init_attempted:
        return _firebase_app is not None
    _init_attempted = True
    cred_path = getattr(settings, "FIREBASE_CREDENTIALS_PATH", None)
    if not cred_path:
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            _firebase_app = firebase_admin.get_app()
        _messaging = messaging
        logger.info("Firebase Admin initialised for push notifications")
        return True
    except Exception:
        logger.warning("Firebase Admin init failed; push fallback only", exc_info=True)
        _firebase_app = None
        _messaging = None
        return False


async def send_to_user(
    user_id: ObjectId,
    tenant_id: ObjectId,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Send a push notification to all active tokens for a user."""
    tokens = await FCMToken.find(
        {"user_id": user_id, "tenant_id": tenant_id, "is_active": True}
    ).to_list()
    if not tokens:
        return {"sent": 0, "skipped": "no_tokens"}

    if not _ensure_firebase() or _messaging is None:
        return {"sent": 0, "skipped": "firebase_disabled"}

    str_data = {k: str(v) for k, v in (data or {}).items()}
    sent = 0
    invalid_tokens: list = []
    for tok in tokens:
        try:
            msg = _messaging.Message(
                notification=_messaging.Notification(title=title, body=body),
                data=str_data,
                token=tok.token,
            )
            _messaging.send(msg)
            sent += 1
        except Exception as e:
            err = str(e).lower()
            # Mark dead tokens so we stop trying.
            if "registration-token-not-registered" in err or "invalid-argument" in err:
                invalid_tokens.append(tok)
            else:
                logger.warning("FCM send failed for token %s: %s", tok.id, e)

    for t in invalid_tokens:
        try:
            t.is_active = False
            await t.save()
        except Exception:
            pass
    return {"sent": sent, "deactivated": len(invalid_tokens)}
