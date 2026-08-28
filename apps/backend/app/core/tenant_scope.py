"""
Reusable tenant-scoping helpers for queries and bulk foreign-key resolution.

Every domain lookup MUST go through these helpers so another tenant's records
are never returned when resolving IDs from the current tenant's documents.
"""
from __future__ import annotations

from typing import Any, Iterable, Optional, Sequence, Type, TypeVar

from beanie import Document, PydanticObjectId

from app.core.picklist_query import build_picklist_query

T = TypeVar("T", bound=Document)


def soft_deleted_filter() -> dict:
    return {"deleted_at": None}


def domain_filter(tenant_id: PydanticObjectId, **extra: Any) -> dict:
    """Standard filter for tenant-owned domain documents."""
    return {"tenant_id": tenant_id, "deleted_at": None, **extra}


def ids_in_tenant_filter(
    tenant_id: PydanticObjectId,
    ids: Iterable[Any],
    *,
    include_deleted: bool = False,
) -> dict:
    """Bulk ``_id`` lookup scoped to one tenant."""
    id_list = [i for i in ids if i]
    query: dict = {"_id": {"$in": id_list}, "tenant_id": tenant_id}
    if not include_deleted:
        query["deleted_at"] = None
    return query


def platform_or_tenant_filter(tenant_id: PydanticObjectId, **extra: Any) -> dict:
    """Platform defaults (tenant_id=None) plus tenant-specific rows."""
    return {
        "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}],
        **extra,
    }


def picklist_ids_filter(
    tenant_id: PydanticObjectId,
    ids: Iterable[Any],
    *,
    picklist_type: str,
    industry: Optional[str] = None,
) -> dict:
    """Tenant-safe picklist lookup by id list."""
    query = build_picklist_query(
        tenant_id,
        industry=industry,
        picklist_type=picklist_type,
    )
    query["_id"] = {"$in": [i for i in ids if i]}
    return query


async def fetch_in_tenant(
    model: Type[T],
    tenant_id: PydanticObjectId,
    ids: Iterable[Any],
    *,
    include_deleted: bool = False,
) -> list[T]:
    id_list = [i for i in ids if i]
    if not id_list:
        return []
    return await model.find(
        ids_in_tenant_filter(tenant_id, id_list, include_deleted=include_deleted)
    ).to_list()


async def fetch_picklists_in_tenant(
    model: Type[T],
    tenant_id: PydanticObjectId,
    ids: Iterable[Any],
    *,
    picklist_type: str,
    industry: Optional[str] = None,
) -> list[T]:
    id_list = [i for i in ids if i]
    if not id_list:
        return []
    return await model.find(
        picklist_ids_filter(
            tenant_id,
            id_list,
            picklist_type=picklist_type,
            industry=industry,
        )
    ).to_list()


async def fetch_additional_fields_in_tenant(
    model: Type[T],
    tenant_id: PydanticObjectId,
    ids: Iterable[Any],
    *,
    entity_type: str,
) -> list[T]:
    id_list = [i for i in ids if i]
    if not id_list:
        return []
    return await model.find(
        {
            "_id": {"$in": id_list},
            "entity_type": entity_type,
            **platform_or_tenant_filter(tenant_id),
        }
    ).to_list()


def map_by_id(docs: Sequence[Document]) -> dict[str, Document]:
    return {str(doc.id): doc for doc in docs}
