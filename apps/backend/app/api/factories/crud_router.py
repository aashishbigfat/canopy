"""
CRUD router factory for industry-vertical entities.

Generates a standard REST CRUD surface (list / create / read / update / delete)
on top of any tenant-scoped Beanie document. All queries are forced through
the tenant filter, so a new router built with this factory cannot accidentally
leak cross-tenant data.

Example usage in `app/api/v1/patients.py`:

    from app.api.factories.crud_router import make_crud_router
    from app.models.healthcare.patient import Patient
    from app.schemas.healthcare.patient import PatientCreate, PatientUpdate, PatientResponse

    router = make_crud_router(
        model=Patient,
        create_schema=PatientCreate,
        update_schema=PatientUpdate,
        response_schema=PatientResponse,
        module_name="patients",
        permission_prefix="patient",
        ownership=True,
    )
"""


import logging
from typing import Any, Optional, Type

from beanie import Document, PydanticObjectId
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import check_permission, get_current_user
from app.middleware.industry_guard import require_module
from app.models.user import User

_logger = logging.getLogger(__name__)


def _id_or_404(raw: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=404, detail="Not found") from exc


def _serialize(doc: Document, response_schema: Type[BaseModel]) -> dict:
    """Return a JSON-ready dict from a Beanie doc, casting Object/PydanticObjectIds to str.
    Pydantic v2 handles most of this through model_dump, but we ensure id is exposed."""
    data = doc.model_dump(mode="json")
    data["id"] = str(doc.id)
    if response_schema is None:
        return data
    return response_schema(**data).model_dump(mode="json")


def make_crud_router(
    *,
    model: Type[Document],
    create_schema: Type[BaseModel],
    update_schema: Type[BaseModel],
    response_schema: Optional[Type[BaseModel]] = None,
    module_name: str,
    permission_prefix: str,
    ownership: bool = True,
    list_max_per_page: int = 100,
    extra_create_defaults: Optional[dict] = None,
) -> APIRouter:
    """Construct a CRUD router for `model`.

    Parameters
    ----------
    model
        Beanie document class. Must have `tenant_id`, `deleted_at`, `created_by`.
    create_schema, update_schema, response_schema
        Pydantic schemas. `update_schema` must use `exclude_unset` semantics
        (every field Optional with default None). `response_schema` is optional;
        if omitted, the raw model_dump is returned.
    module_name
        Module flag enforced via require_module middleware (e.g. "patients").
    permission_prefix
        Permission name stem. The factory builds permissions
        `view_<prefix>`, `create_<prefix>`, `edit_<prefix>`, `delete_<prefix>`.
    ownership
        If True, sets `owner_id` and `last_modified_by_id` on create/update.
    list_max_per_page
        Per-page cap on the list endpoint.
    extra_create_defaults
        Static fields to merge into every created doc (rare; e.g., tenant-specific
        defaults). User-supplied fields override these.

    Returns
    -------
    APIRouter
        A router gated by `require_module(module_name)` and per-action
        permission checks.
    """
    if not module_name:
        raise ValueError("module_name is required")
    if not permission_prefix:
        raise ValueError("permission_prefix is required")
    if not hasattr(model, "model_fields"):
        raise ValueError("model must be a Pydantic-based Beanie Document")
    if "tenant_id" not in model.model_fields:
        raise ValueError(f"{model.__name__} has no tenant_id — not tenant-scopable")

    has_deleted_at = "deleted_at" in model.model_fields
    has_owner = ownership and "owner_id" in model.model_fields
    has_modified_by = "last_modified_by_id" in model.model_fields
    has_created_by = "created_by" in model.model_fields

    perm_view = f"view_{permission_prefix}"
    perm_create = f"create_{permission_prefix}"
    perm_edit = f"edit_{permission_prefix}"
    perm_delete = f"delete_{permission_prefix}"

    router = APIRouter(dependencies=[Depends(require_module(module_name))])

    def _scoped_query(tenant_id: PydanticObjectId) -> dict:
        q: dict = {"tenant_id": tenant_id}
        if has_deleted_at:
            q["deleted_at"] = None
        return q

    @router.get("/", summary=f"List {model.__name__}")
    async def list_items(
        page: int = Query(1, ge=1),
        per_page: int = Query(20, ge=1, le=list_max_per_page),
        current_user: User = Depends(check_permission(perm_view)),
    ):
        skip = (page - 1) * per_page
        base = _scoped_query(current_user.tenant_id)
        total = await model.find(base).count()
        items = (
            await model.find(base)
            .sort("-created_at")
            .skip(skip)
            .limit(per_page)
            .to_list()
        )
        return {
            "items": [_serialize(i, response_schema) for i in items],
            "page": page,
            "per_page": per_page,
            "total": total,
        }

    @router.post("/", status_code=201, summary=f"Create {model.__name__}")
    async def create_item(
        payload: create_schema,  # type: ignore[valid-type]
        current_user: User = Depends(check_permission(perm_create)),
    ):
        data: dict[str, Any] = {}
        if extra_create_defaults:
            data.update(extra_create_defaults)
        data.update(payload.model_dump(exclude_unset=True))

        # SECURITY: never trust client-supplied tenant/owner/created_by — the
        # request context owns these.
        data["tenant_id"] = current_user.tenant_id
        data.pop("created_by", None)
        if has_created_by:
            data["created_by"] = current_user.id
        if has_owner:
            data["owner_id"] = data.get("owner_id") or current_user.id
            # Validate owner_id is within the tenant
            owner_id = data["owner_id"]
            if owner_id != current_user.id:
                owner = await User.find_one(
                    {
                        "_id": owner_id,
                        "tenant_id": current_user.tenant_id,
                        "deleted_at": None,
                        "is_active": True,
                    }
                )
                if not owner:
                    raise HTTPException(
                        status_code=422,
                        detail="owner_id must reference an active user in this tenant",
                    )
        doc = model(**data)
        await doc.insert()
        return _serialize(doc, response_schema)

    @router.get("/{item_id}", summary=f"Get {model.__name__} by id")
    async def get_item(
        item_id: str,
        current_user: User = Depends(check_permission(perm_view)),
    ):
        oid = _id_or_404(item_id)
        doc = await model.find_one({"_id": oid, **_scoped_query(current_user.tenant_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        return _serialize(doc, response_schema)

    @router.put("/{item_id}", summary=f"Update {model.__name__}")
    async def update_item(
        item_id: str,
        payload: update_schema,  # type: ignore[valid-type]
        current_user: User = Depends(check_permission(perm_edit)),
    ):
        oid = _id_or_404(item_id)
        doc = await model.find_one({"_id": oid, **_scoped_query(current_user.tenant_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        update_data = payload.model_dump(exclude_unset=True)
        # Reject attempts to flip tenant/owner via client payload
        for forbidden in ("tenant_id", "created_by", "id", "_id"):
            update_data.pop(forbidden, None)
        # Validate owner_id update is in-tenant
        if has_owner and "owner_id" in update_data and update_data["owner_id"] != doc.owner_id:
            owner = await User.find_one(
                {
                    "_id": update_data["owner_id"],
                    "tenant_id": current_user.tenant_id,
                    "deleted_at": None,
                    "is_active": True,
                }
            )
            if not owner:
                raise HTTPException(
                    status_code=422,
                    detail="owner_id must reference an active user in this tenant",
                )
        for field, value in update_data.items():
            setattr(doc, field, value)
        if has_modified_by:
            doc.last_modified_by_id = current_user.id
        await doc.save()
        return _serialize(doc, response_schema)

    @router.delete("/{item_id}", status_code=204, summary=f"Delete {model.__name__}")
    async def delete_item(
        item_id: str,
        current_user: User = Depends(check_permission(perm_delete)),
    ):
        oid = _id_or_404(item_id)
        doc = await model.find_one({"_id": oid, **_scoped_query(current_user.tenant_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        if hasattr(doc, "soft_delete") and has_deleted_at:
            await doc.soft_delete()
        else:
            await doc.delete()
        return None

    return router


__all__ = ["make_crud_router"]
