"""
Structured "Edit List Filters" → MongoDB query translator.

A saved EntityView stores `filter_rules`: an ordered list of
``{"field": <field_key>, "operator": <op>, "value": <value>}`` rows produced by
the frontend filter builder. This module turns those rows into Mongo clauses
that are ANDed into a list query's base filter (which always keeps tenant +
visibility scoping).

Security (multi-tenant): only field_keys present in the per-entity WHITELIST are
honored. Any unknown field OR unknown operator causes the row to be skipped, so
raw client-supplied keys can never be injected into the query.

v1 scope: filtering is restricted to whitelisted STANDARD fields. Custom /
additional fields can be chosen for *display* but their values live in separate
`*CustomField` collections and are not filterable here yet.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId


# ── Field whitelists ─────────────────────────────────────────────────────────
# field_key -> logical type. Types drive which operators are valid and how the
# value is coerced. account (B2B) and personal_account (B2C) are DISTINCT
# schemas even though both live in the `accounts` collection.
_ACCOUNT_FIELDS: Dict[str, str] = {
    "name": "string",
    "email": "string",
    "phone": "string",
    "website": "string",
    "segment": "string",
    "billing_street": "string",
    "billing_city": "string",
    "billing_state": "string",
    "billing_zip": "string",
    "billing_country": "string",
    "industry_id": "lookup",
    "acc_type_id": "lookup",
    "acc_parent_id": "lookup",
    "category_id": "lookup",
    "owner_id": "lookup",
    "created_by": "lookup",
    "last_modified_by_id": "lookup",
    "created_at": "date",
    "updated_at": "date",
    "id": "lookup",
    "is_favorite": "bool",
}

_PERSONAL_ACCOUNT_FIELDS: Dict[str, str] = {
    "salutation": "string",
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "mobile": "string",  # B2C-only field (see CLAUDE.md)
    "segment": "string",
    "billing_street": "string",
    "billing_city": "string",
    "billing_state": "string",
    "billing_zip": "string",
    "billing_country": "string",
    "category_id": "lookup",
    "owner_id": "lookup",
    "created_by": "lookup",
    "last_modified_by_id": "lookup",
    "created_at": "date",
    "updated_at": "date",
    "id": "lookup",
    "is_favorite": "bool",
}

_CONTACT_FIELDS: Dict[str, str] = {
    "salutation": "string",
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "mobile": "string",
    "title": "string",
    "account_id": "lookup",
    "owner_id": "lookup",
    "created_by": "lookup",
    "last_modified_by_id": "lookup",
    "created_at": "date",
    "updated_at": "date",
    "id": "lookup",
}

_LEAD_FIELDS: Dict[str, str] = {
    "salutation": "string",
    "first_name": "string",
    "last_name": "string",
    "company": "string",
    "email": "string",
    "phone": "string",
    "mobile": "string",
    "no_employees": "number",
    "website": "string",
    "title": "string",
    "lead_status_id": "lookup",
    "source_id": "lookup",
    "source_medium_id": "lookup",
    "industry_id": "lookup",
    "street": "string",
    "city": "string",
    "state": "string",
    "zip": "string",
    "country": "string",
    "campaign_name": "string",
    "segment": "string",        # stored as "B2C"/"B2B" — string match (UI: select)
    "creation_type": "string",  # stored as "manual"/"auto" — string match (UI: select)
    # Travel industry_data fields (nested) — only meaningful for the travel industry.
    # Leads persist travel_date as an ISO string (TravelLeadData.travel_date: str).
    "industry_data.travel_date": "datestr",
    "industry_data.destination_ids": "strlookup",
    "industry_data.no_of_pax": "number",
    "owner_id": "lookup",
    "created_by": "lookup",
    "last_modified_by_id": "lookup",
    "created_at": "date",
    "updated_at": "date",
    "id": "lookup",
}

_OPPORTUNITY_FIELDS: Dict[str, str] = {
    "name": "string",
    "amount": "number",
    "probability": "number",
    "sales_stage_id": "lookup",
    "opportunity_type_id": "lookup",
    "source_id": "lookup",
    "account_id": "lookup",
    "contact_id": "lookup",
    "owner_id": "lookup",
    "segment": "string",
    "creation_type": "string",  # stored as "Manual"/"Auto"
    "created_by": "lookup",
    "last_modified_by_id": "lookup",
    "close_lost_reason": "string",
    "close_date": "date",
    # Opportunities persist travel_date as a BSON Date (TravelOpportunityData
    # .travel_date: datetime), but converted/migrated rows may hold a string —
    # so match either representation. (Leads, by contrast, are always strings.)
    "industry_data.travel_date": "datemixed",
    "industry_data.destination_ids": "strlookup",
    "industry_data.no_of_pax": "number",
    "created_at": "date",
    "updated_at": "date",
    "id": "lookup",
}

FIELD_WHITELISTS: Dict[str, Dict[str, str]] = {
    "account": _ACCOUNT_FIELDS,
    "personal_account": _PERSONAL_ACCOUNT_FIELDS,
    "contact": _CONTACT_FIELDS,
    "lead": _LEAD_FIELDS,
    "opportunity": _OPPORTUNITY_FIELDS,
}

# field_key -> Mongo document field, when they differ (e.g. the "Account ID"
# filter targets the _id column).
_MONGO_FIELD_OVERRIDES: Dict[str, str] = {"id": "_id"}

# Operators each logical type accepts (used to reject unknown/mismatched ops).
OPERATORS_BY_TYPE: Dict[str, set] = {
    "string": {"equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"},
    "lookup": {"equals", "not_equals", "is_empty", "is_not_empty"},
    "bool": {"equals"},
    "number": {"equals", "not_equals", "greater_than", "less_than", "between", "is_empty", "is_not_empty"},
    "date": {"equals", "greater_than", "less_than", "between", "is_empty", "is_not_empty"},
    # ISO date stored as a STRING (e.g. lead industry_data.travel_date) —
    # lexicographic comparison works because "YYYY-MM-DD" sorts chronologically.
    "datestr": {"equals", "greater_than", "less_than", "between", "is_empty", "is_not_empty"},
    # A date that may be stored as a BSON Date (opportunity travel_date) OR an ISO
    # string (lead / converted / migrated). Matches both representations.
    "datemixed": {"equals", "greater_than", "less_than", "between", "is_empty", "is_not_empty"},
    # String/ObjectId id that may live in a scalar OR an array field
    # (e.g. industry_data.destination_ids). {field: value} is array-contains in Mongo.
    "strlookup": {"equals", "not_equals", "is_empty", "is_not_empty"},
}

_EMPTY_VALUES = (None, "", [], {})


def _coerce_bool(value: Any) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        if value.strip().lower() in ("true", "1", "yes"):
            return True
        if value.strip().lower() in ("false", "0", "no"):
            return False
    if isinstance(value, (int, float)):
        return bool(value)
    return None


def _coerce_number(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_date(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        raw = value.strip().replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(raw)
        except ValueError:
            try:
                return datetime.fromisoformat(raw[:10])
            except ValueError:
                return None
    return None


def _rx(value: str, anchored_start: bool = False, anchored_full: bool = False) -> Dict[str, Any]:
    pat = re.escape(str(value))
    if anchored_full:
        pat = f"^{pat}$"
    elif anchored_start:
        pat = f"^{pat}"
    return {"$regex": pat, "$options": "i"}


def _string_clause(field: str, op: str, value: Any) -> Optional[dict]:
    if op == "is_empty":
        return {field: {"$in": [None, ""]}}
    if op == "is_not_empty":
        return {field: {"$nin": [None, ""]}}
    if value in _EMPTY_VALUES:
        return None
    if op == "equals":
        return {field: _rx(value, anchored_full=True)}
    if op == "not_equals":
        return {field: {"$not": re.compile(f"^{re.escape(str(value))}$", re.IGNORECASE)}}
    if op == "contains":
        return {field: _rx(value)}
    if op == "starts_with":
        return {field: _rx(value, anchored_start=True)}
    return None


def _lookup_clause(field: str, op: str, value: Any) -> Optional[dict]:
    if op == "is_empty":
        return {field: None}
    if op == "is_not_empty":
        return {field: {"$ne": None}}
    if value in _EMPTY_VALUES or not ObjectId.is_valid(str(value)):
        return None
    oid = ObjectId(str(value))
    if op == "equals":
        return {field: oid}
    if op == "not_equals":
        return {field: {"$ne": oid}}
    return None


def _bool_clause(field: str, op: str, value: Any) -> Optional[dict]:
    if op != "equals":
        return None
    b = _coerce_bool(value)
    return {field: b} if b is not None else None


def _number_clause(field: str, op: str, value: Any) -> Optional[dict]:
    if op == "is_empty":
        return {field: {"$in": [None, ""]}}
    if op == "is_not_empty":
        return {field: {"$nin": [None, ""]}}
    if op == "between":
        if not isinstance(value, (list, tuple)) or len(value) != 2:
            return None
        lo, hi = _coerce_number(value[0]), _coerce_number(value[1])
        if lo is None or hi is None:
            return None
        return {field: {"$gte": lo, "$lte": hi}}
    num = _coerce_number(value)
    if num is None:
        return None
    if op == "equals":
        return {field: num}
    if op == "not_equals":
        return {field: {"$ne": num}}
    if op == "greater_than":
        return {field: {"$gt": num}}
    if op == "less_than":
        return {field: {"$lt": num}}
    return None


def _date_clause(field: str, op: str, value: Any) -> Optional[dict]:
    if op == "is_empty":
        return {field: None}
    if op == "is_not_empty":
        return {field: {"$ne": None}}
    if op == "between":
        if not isinstance(value, (list, tuple)) or len(value) != 2:
            return None
        lo, hi = _coerce_date(value[0]), _coerce_date(value[1])
        if lo is None or hi is None:
            return None
        return {field: {"$gte": lo, "$lte": hi}}
    d = _coerce_date(value)
    if d is None:
        return None
    if op == "equals":
        # Whole-day match for a date value.
        day = datetime(d.year, d.month, d.day)
        return {field: {"$gte": day, "$lt": day + timedelta(days=1)}}
    if op == "greater_than":
        return {field: {"$gt": d}}
    if op == "less_than":
        return {field: {"$lt": d}}
    return None


def _datestr_clause(field: str, op: str, value: Any) -> Optional[dict]:
    """ISO date stored as a string (industry_data.travel_date). Compare as strings."""
    if op == "is_empty":
        return {field: {"$in": [None, ""]}}
    if op == "is_not_empty":
        return {field: {"$nin": [None, ""]}}
    if op == "between":
        if not isinstance(value, (list, tuple)) or len(value) != 2 or not value[0] or not value[1]:
            return None
        return {field: {"$gte": str(value[0]), "$lte": str(value[1])}}
    if value in _EMPTY_VALUES:
        return None
    s = str(value)
    if op == "equals":
        return {field: s}
    if op == "greater_than":
        return {field: {"$gt": s}}
    if op == "less_than":
        return {field: {"$lt": s}}
    return None


def _datemixed_clause(field: str, op: str, value: Any) -> Optional[dict]:
    """A date that may be persisted as a BSON Date OR an ISO string.

    The product stores ``industry_data.travel_date`` inconsistently — Opportunities
    persist it as a ``datetime`` (BSON Date), Leads as a ``str``, and converted /
    migrated records may be either. A single-type comparison silently fails for the
    other representation because MongoDB *brackets* range comparisons by BSON type
    (a string bound never matches a Date value, and vice-versa) — which is exactly
    why the opportunity "Travel Date between …" filter didn't filter. We OR a Date
    branch and a String branch; type bracketing keeps each branch to its own
    representation, so together they cover both without double counting.
    """
    if op == "is_empty":
        return {field: {"$in": [None, ""]}}
    if op == "is_not_empty":
        return {field: {"$nin": [None, ""]}}

    def _both(date_cond: dict, str_cond: Any) -> dict:
        return {"$or": [{field: date_cond}, {field: str_cond}]}

    if op == "between":
        if not isinstance(value, (list, tuple)) or len(value) != 2 or not value[0] or not value[1]:
            return None
        lo, hi = _coerce_date(value[0]), _coerce_date(value[1])
        if lo is None or hi is None:
            return None
        lo_day = datetime(lo.year, lo.month, lo.day)
        hi_next = datetime(hi.year, hi.month, hi.day) + timedelta(days=1)  # inclusive end day
        return _both(
            {"$gte": lo_day, "$lt": hi_next},
            {"$gte": lo_day.strftime("%Y-%m-%d"), "$lt": hi_next.strftime("%Y-%m-%d")},
        )

    d = _coerce_date(value)
    if d is None:
        return None
    day = datetime(d.year, d.month, d.day)
    next_day = day + timedelta(days=1)
    if op == "equals":
        return _both(
            {"$gte": day, "$lt": next_day},
            {"$gte": day.strftime("%Y-%m-%d"), "$lt": next_day.strftime("%Y-%m-%d")},
        )
    if op == "greater_than":  # strictly after the selected calendar day
        return _both({"$gte": next_day}, {"$gte": next_day.strftime("%Y-%m-%d")})
    if op == "less_than":     # strictly before the selected calendar day
        return _both({"$lt": day}, {"$lt": day.strftime("%Y-%m-%d")})
    return None


def _strlookup_clause(field: str, op: str, value: Any) -> Optional[dict]:
    """Id stored as a string and/or inside an array (industry_data.destination_ids).

    {field: v} is an array-contains match in Mongo. We match both the string and
    the ObjectId form so it works regardless of how the id was persisted.
    """
    if op == "is_empty":
        return {field: {"$in": [None, [], ""]}}
    if op == "is_not_empty":
        return {field: {"$nin": [None, [], ""]}}
    if value in _EMPTY_VALUES:
        return None
    s = str(value)
    candidates: list = [s]
    if ObjectId.is_valid(s):
        candidates.append(ObjectId(s))
    if op == "equals":
        return {field: {"$in": candidates}}
    if op == "not_equals":
        return {field: {"$nin": candidates}}
    return None


_CLAUSE_BUILDERS = {
    "string": _string_clause,
    "lookup": _lookup_clause,
    "bool": _bool_clause,
    "number": _number_clause,
    "date": _date_clause,
    "datestr": _datestr_clause,
    "datemixed": _datemixed_clause,
    "strlookup": _strlookup_clause,
}


def _clause_for_rule(whitelist: Dict[str, str], rule: Dict[str, Any]) -> Optional[dict]:
    if not isinstance(rule, dict):
        return None
    field = str(rule.get("field", "")).strip()
    op = str(rule.get("operator", "")).strip()
    value = rule.get("value")

    ftype = whitelist.get(field)
    if not ftype:  # unknown field -> skip (no injection)
        return None
    if op not in OPERATORS_BY_TYPE.get(ftype, set()):  # unknown/mismatched op -> skip
        return None
    mongo_field = _MONGO_FIELD_OVERRIDES.get(field, field)
    return _CLAUSE_BUILDERS[ftype](mongo_field, op, value)


def build_filter_clauses(
    entity_type: str,
    filter_rules: Optional[List[Dict[str, Any]]],
    *,
    scope: Optional[str] = None,
    current_user_id: Optional[ObjectId] = None,
) -> List[dict]:
    """Translate a view's filter_rules (+ scope) into Mongo clauses.

    Returns a list of conditions meant to be ANDed into the caller's base query,
    so tenant + data-visibility scoping is always preserved. Unknown fields and
    operators are silently dropped.
    """
    whitelist = FIELD_WHITELISTS.get(entity_type)
    if whitelist is None:
        return []

    clauses: List[dict] = []
    for rule in (filter_rules or []):
        cond = _clause_for_rule(whitelist, rule)
        if cond:
            clauses.append(cond)

    # "Show me" scope: "mine" narrows to records the current user owns.
    if scope == "mine" and current_user_id is not None:
        clauses.append({"owner_id": current_user_id})

    return clauses
