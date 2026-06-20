"""
Keyset (cursor) pagination (PERF Phase 6).

Offset pagination (`skip(n).limit(m)` + a per-request `count()`) degrades badly
at scale: skipping to page 1000 forces MongoDB to walk 1000*m documents, and the
count scans the whole filtered set every request. Keyset pagination is O(limit)
regardless of depth — it seeks straight to the cursor position using an index.

CONTRACT
    Request:  ?limit=50&cursor=<opaque>&sort=updated_at&dir=desc
    Response: {"items": [...], "next_cursor": <opaque|null>, "has_more": bool}

INDEX REQUIREMENT
    The sort must be index-backed including the `_id` tiebreaker, e.g.
    (tenant_id, deleted_at, updated_at, _id). scripts/create_indexes.py creates
    these for accounts/contacts (updated_at) and opportunities/leads (created_at).

The cursor encodes (sort_value, last_id). It is opaque/base64 — callers must not
parse it. A malformed cursor raises ValueError (callers should 400).
"""
import base64
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId

MAX_LIMIT = 200
DEFAULT_LIMIT = 50


def _encode_value(v: Any) -> Any:
    if isinstance(v, datetime):
        return {"__t__": "dt", "v": v.isoformat()}
    if isinstance(v, ObjectId):
        return {"__t__": "oid", "v": str(v)}
    return v


def _decode_value(v: Any) -> Any:
    if isinstance(v, dict) and "__t__" in v:
        if v["__t__"] == "dt":
            return datetime.fromisoformat(v["v"])
        if v["__t__"] == "oid":
            return ObjectId(v["v"])
    return v


def encode_cursor(sort_value: Any, last_id: Any) -> str:
    payload = {"s": _encode_value(sort_value), "i": str(last_id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def decode_cursor(cursor: str) -> Tuple[Any, ObjectId]:
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        return _decode_value(payload["s"]), ObjectId(payload["i"])
    except Exception as e:  # noqa: BLE001
        raise ValueError(f"Invalid cursor: {e}")


def build_keyset_query(base_query: Dict[str, Any], sort_field: str, direction: str,
                       cursor: Optional[str]) -> Dict[str, Any]:
    """Wrap base_query with the keyset seek condition for the given cursor.

    Uses a top-level $and so it composes safely with base_query filters that
    already contain $or / $and (visibility scope, saved views, search).
    """
    if not cursor:
        return base_query
    sort_value, last_id = decode_cursor(cursor)
    op = "$lt" if direction == "desc" else "$gt"
    keyset = {"$or": [
        {sort_field: {op: sort_value}},
        {sort_field: sort_value, "_id": {op: last_id}},
    ]}
    return {"$and": [base_query, keyset]}


async def keyset_page(
    model,
    base_query: Dict[str, Any],
    *,
    sort_field: str = "updated_at",
    direction: str = "desc",
    limit: int = DEFAULT_LIMIT,
    cursor: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch one keyset page of `model` documents.

    Returns {"items": List[model], "next_cursor": Optional[str], "has_more": bool}.
    `items` are full Beanie documents — the caller maps them to its response
    shape exactly as before; only the windowing changes.
    """
    limit = max(1, min(int(limit), MAX_LIMIT))
    sort_dir = -1 if direction == "desc" else 1
    query = build_keyset_query(base_query, sort_field, direction, cursor)

    # Fetch one extra row to know whether another page exists without a count().
    items = await model.find(query).sort(
        [(sort_field, sort_dir), ("_id", sort_dir)]
    ).limit(limit + 1).to_list()

    has_more = len(items) > limit
    items = items[:limit]

    next_cursor = None
    if has_more and items:
        last = items[-1]
        next_cursor = encode_cursor(getattr(last, sort_field), last.id)

    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}
