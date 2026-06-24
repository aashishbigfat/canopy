"""
Injection-safety + per-entity isolation guard for the saved-view filter
translator (app/core/entity_filter.py).

The list endpoints feed an EntityView's user-authored `filter_rules` through
build_filter_clauses(). The security contract is:

  * Only whitelisted field_keys per entity_type produce a clause; anything else
    (typo, probe, injection attempt) is silently dropped — a forged rule can
    never reach the Mongo query or cross schemas.
  * account (B2B) and personal_account (B2C) have DISTINCT whitelists, so a B2C
    field (e.g. `mobile`) cannot be filtered on the B2B list and vice-versa.
  * `scope="mine"` narrows to the caller's own records.

These are pure-function checks — no live server required.

Run:
    pytest tests/security/test_entity_filter_safety.py
or:
    python tests/security/test_entity_filter_safety.py
"""
from __future__ import annotations

import sys

from bson import ObjectId

from app.core.entity_filter import build_filter_clauses


def _fields(clauses):
    """Top-level field keys referenced by the produced clauses."""
    keys = set()
    for c in clauses:
        keys.update(c.keys())
    return keys


def test_unknown_field_is_dropped():
    clauses = build_filter_clauses(
        "account",
        [{"field": "definitely_not_a_field", "operator": "equals", "value": "x"}],
    )
    assert clauses == [], "unknown field must not produce a clause"


def test_unknown_operator_is_dropped():
    clauses = build_filter_clauses(
        "account",
        [{"field": "name", "operator": "$where", "value": "sleep(5)"}],
    )
    assert clauses == [], "unknown operator must not produce a clause"


def test_lookup_rejects_non_objectid():
    clauses = build_filter_clauses(
        "account",
        [{"field": "owner_id", "operator": "equals", "value": "not-an-oid"}],
    )
    assert clauses == [], "lookup equals with a bad id must be dropped"


def test_known_field_produces_scoped_clause():
    clauses = build_filter_clauses(
        "account",
        [{"field": "billing_city", "operator": "equals", "value": "Agra"}],
    )
    assert _fields(clauses) == {"billing_city"}


def test_b2c_only_field_isolated_from_b2b():
    rule = [{"field": "mobile", "operator": "contains", "value": "98"}]
    assert build_filter_clauses("account", rule) == [], "mobile is not a B2B account field"
    assert build_filter_clauses("personal_account", rule), "mobile must filter on B2C"


def test_scope_mine_narrows_to_owner():
    uid = ObjectId()
    clauses = build_filter_clauses("account", [], scope="mine", current_user_id=uid)
    assert {"owner_id": uid} in clauses


def test_unknown_entity_type_yields_nothing():
    assert build_filter_clauses("hacker_entity", [{"field": "name", "operator": "equals", "value": "x"}]) == []


def test_account_id_maps_to_mongo_id():
    oid = ObjectId()
    clauses = build_filter_clauses("account", [{"field": "id", "operator": "equals", "value": str(oid)}])
    assert clauses == [{"_id": oid}], "the Account ID filter must target _id"


def test_date_between_produces_range():
    clauses = build_filter_clauses(
        "account",
        [{"field": "created_at", "operator": "between", "value": ["2021-10-01", "2025-07-05"]}],
    )
    assert len(clauses) == 1 and "created_at" in clauses[0]
    rng = clauses[0]["created_at"]
    assert "$gte" in rng and "$lte" in rng


def test_new_lookup_fields_are_filterable():
    for f in ("acc_parent_id", "category_id", "created_by", "last_modified_by_id"):
        oid = ObjectId()
        clauses = build_filter_clauses("account", [{"field": f, "operator": "equals", "value": str(oid)}])
        assert clauses == [{f: oid}], f"{f} must be filterable on B2B accounts"


# ── Per-module whitelists (contact / lead / opportunity) — no cross-module bleed ──

def test_contact_account_lookup_filterable():
    oid = ObjectId()
    assert build_filter_clauses("contact", [{"field": "account_id", "operator": "equals", "value": str(oid)}]) == [{"account_id": oid}]


def test_contact_rejects_lead_only_field():
    # A lead-only field must NOT be filterable on contacts.
    assert build_filter_clauses("contact", [{"field": "lead_status_id", "operator": "equals", "value": str(ObjectId())}]) == []


def test_lead_picklist_and_select_fields():
    oid = ObjectId()
    assert build_filter_clauses("lead", [{"field": "lead_status_id", "operator": "equals", "value": str(oid)}]) == [{"lead_status_id": oid}]
    # segment is a string match (UI shows a select of B2C/B2B), not a lookup.
    seg = build_filter_clauses("lead", [{"field": "segment", "operator": "equals", "value": "B2C"}])
    assert len(seg) == 1 and "segment" in seg[0]


def test_lead_has_no_account_field():
    # Leads are pre-account: account_id must be dropped.
    assert build_filter_clauses("lead", [{"field": "account_id", "operator": "equals", "value": str(ObjectId())}]) == []


def test_opportunity_lookups_and_number():
    a, c, s = ObjectId(), ObjectId(), ObjectId()
    assert build_filter_clauses("opportunity", [{"field": "account_id", "operator": "equals", "value": str(a)}]) == [{"account_id": a}]
    assert build_filter_clauses("opportunity", [{"field": "contact_id", "operator": "equals", "value": str(c)}]) == [{"contact_id": c}]
    assert build_filter_clauses("opportunity", [{"field": "sales_stage_id", "operator": "equals", "value": str(s)}]) == [{"sales_stage_id": s}]
    rng = build_filter_clauses("opportunity", [{"field": "amount", "operator": "between", "value": [100, 500]}])
    assert rng == [{"amount": {"$gte": 100.0, "$lte": 500.0}}]


def test_opportunity_new_top_level_fields():
    sid = ObjectId()
    assert build_filter_clauses("opportunity", [{"field": "source_id", "operator": "equals", "value": str(sid)}]) == [{"source_id": sid}]
    seg = build_filter_clauses("opportunity", [{"field": "segment", "operator": "equals", "value": "B2C"}])
    assert len(seg) == 1 and "segment" in seg[0]


def test_travel_date_string_range():
    # Lead industry_data.travel_date is stored as an ISO string → string comparison.
    clauses = build_filter_clauses(
        "lead",
        [{"field": "industry_data.travel_date", "operator": "between", "value": ["2026-01-01", "2026-12-31"]}],
    )
    assert clauses == [{"industry_data.travel_date": {"$gte": "2026-01-01", "$lte": "2026-12-31"}}]


def test_opportunity_travel_date_matches_date_and_string_storage():
    # Opportunities store travel_date as a BSON Date (datetime), but converted /
    # migrated rows may hold an ISO string. The 'between' filter must match either,
    # so it ORs a Date-typed branch and a String-typed branch (Mongo brackets range
    # comparisons by BSON type, keeping each branch to its own representation).
    from datetime import datetime
    clauses = build_filter_clauses(
        "opportunity",
        [{"field": "industry_data.travel_date", "operator": "between", "value": ["2026-05-25", "2026-06-24"]}],
    )
    assert len(clauses) == 1 and "$or" in clauses[0]
    branches = clauses[0]["$or"]
    conds = [b["industry_data.travel_date"] for b in branches]
    # One Date branch (inclusive of the whole end calendar day) ...
    assert {"$gte": datetime(2026, 5, 25), "$lt": datetime(2026, 6, 25)} in conds
    # ... and one ISO-string branch with the same inclusive end-day bound.
    assert {"$gte": "2026-05-25", "$lt": "2026-06-25"} in conds

    # A malformed (non-2-element) value is dropped, never injected.
    assert build_filter_clauses(
        "opportunity",
        [{"field": "industry_data.travel_date", "operator": "between", "value": "2026-05-25"}],
    ) == []


def test_destination_strlookup_matches_string_and_oid():
    oid = ObjectId()
    clauses = build_filter_clauses(
        "opportunity",
        [{"field": "industry_data.destination_ids", "operator": "equals", "value": str(oid)}],
    )
    assert len(clauses) == 1
    cond = clauses[0]["industry_data.destination_ids"]["$in"]
    assert str(oid) in cond and oid in cond  # matches both string and ObjectId storage


def test_description_is_no_longer_filterable():
    # "description" was dropped from the catalogs as a useless filter field.
    for entity in ("account", "personal_account", "opportunity"):
        assert build_filter_clauses(entity, [{"field": "description", "operator": "contains", "value": "x"}]) == []


def _run():
    failures = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  [PASS] {name}")
            except AssertionError as e:
                failures.append(f"{name}: {e}")
                print(f"  [FAIL] {name} -- {e}")
    if failures:
        print(f"\n{len(failures)} failure(s)")
        return 1
    print("\nAll entity-filter safety checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(_run())
