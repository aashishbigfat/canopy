"""Unit tests for tenant-scoped query helpers."""
from bson import ObjectId

from app.core.tenant_scope import (
    domain_filter,
    ids_in_tenant_filter,
    picklist_ids_filter,
    platform_or_tenant_filter,
)


def test_domain_filter_includes_tenant_and_soft_delete():
    tid = ObjectId()
    q = domain_filter(tid, owner_id=tid)
    assert q["tenant_id"] == tid
    assert q["deleted_at"] is None
    assert q["owner_id"] == tid


def test_ids_in_tenant_filter_scopes_bulk_lookup():
    tid = ObjectId()
    other = ObjectId()
    q = ids_in_tenant_filter(tid, [other])
    assert q["tenant_id"] == tid
    assert q["deleted_at"] is None
    assert other in q["_id"]["$in"]


def test_picklist_ids_filter_uses_platform_or_tenant():
    tid = ObjectId()
    pid = ObjectId()
    q = picklist_ids_filter(tid, [pid], picklist_type="source", industry="travel")
    assert q["picklist_type"] == "source"
    assert pid in q["_id"]["$in"]
    tenant_or = q["$and"][0]["$or"]
    assert {"tenant_id": tid} in tenant_or
    assert {"tenant_id": None} in tenant_or


def test_platform_or_tenant_filter():
    tid = ObjectId()
    q = platform_or_tenant_filter(tid, entity_type="lead")
    assert q["entity_type"] == "lead"
    assert {"tenant_id": tid} in q["$or"]
