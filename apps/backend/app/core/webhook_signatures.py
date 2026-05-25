"""
HMAC-based signature verification for inbound webhooks.

Public webhook endpoints must verify the sender's signature before trusting
the payload — otherwise anyone can POST arbitrary data and trigger downstream
side effects (storing fake messages, marking jobs complete, etc.).

This module exposes:
  - verify_meta_signature(): for Meta (WhatsApp / Messenger / Instagram) webhooks
    that send `X-Hub-Signature-256: sha256=<hex>`
  - verify_hmac_sha256(): generic helper used by the renderer callback and any
    future provider that signs with HMAC-SHA256

Both functions use `hmac.compare_digest` for constant-time comparison —
never use `==` on signature strings.
"""
from __future__ import annotations

import hashlib
import hmac
from typing import Optional


def verify_hmac_sha256(
    payload: bytes,
    signature_hex: Optional[str],
    secret: str,
) -> bool:
    """Verify a hex-encoded HMAC-SHA256 signature against the payload."""
    if not signature_hex or not secret:
        return False
    try:
        expected = hmac.new(
            key=secret.encode("utf-8"),
            msg=payload,
            digestmod=hashlib.sha256,
        ).hexdigest()
    except Exception:
        return False
    return hmac.compare_digest(expected, signature_hex.strip())


def verify_meta_signature(
    payload: bytes,
    signature_header: Optional[str],
    app_secret: str,
) -> bool:
    """Verify the Meta X-Hub-Signature-256 header.

    Meta sends the header as `sha256=<hex>`. The HMAC is computed over the
    *raw* request body using the app secret. Any framework-level body
    re-serialization breaks the signature — callers must pass the bytes
    exactly as received.
    """
    if not signature_header or not app_secret:
        return False
    if not signature_header.startswith("sha256="):
        return False
    sig = signature_header[len("sha256="):]
    return verify_hmac_sha256(payload, sig, app_secret)


__all__ = ["verify_hmac_sha256", "verify_meta_signature"]
