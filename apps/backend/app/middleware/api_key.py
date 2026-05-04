"""
API key middleware — gates public service endpoints (e.g. AI email reader).
"""
from __future__ import annotations
from fastapi import Header, HTTPException
from typing import Optional
import os


VALID_API_KEYS = set(filter(None, os.getenv("EXTERNAL_API_KEYS", "").split(",")))


def require_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    if not x_api_key:
        raise HTTPException(401, "X-Api-Key header required")
    if VALID_API_KEYS and x_api_key not in VALID_API_KEYS:
        raise HTTPException(403, "Invalid API key")
    return x_api_key
