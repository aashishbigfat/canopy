"""
Patient API — healthcare CRM vertical.

Patient gets a slightly customized router (the patient_id MRN is auto-generated
per tenant on create), so we wire the routes manually rather than using the
generic crud factory.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import check_permission
from app.middleware.industry_guard import require_module
from app.models.healthcare.patient import Patient
from app.models.user import User
from app.schemas.healthcare.patient import (
    PatientCreate,
    PatientResponse,
    PatientUpdate,
)


_logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_module("patients"))])


async def _generate_patient_id(tenant_id: ObjectId) -> str:
    """Generate a tenant-unique MRN like P-YYYYMMDD-XXXX based on the existing count.

    Not cryptographically strong — for medical-record numbering inside a CRM
    this is conventionally a tenant-monotonic short identifier.
    """
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await Patient.find({"tenant_id": tenant_id}).count()
    return f"P-{today}-{count + 1:04d}"


def _to_response(p: Patient) -> dict:
    data = p.model_dump(mode="json")
    data["id"] = str(p.id)
    data["tenant_id"] = str(p.tenant_id)
    data["owner_id"] = str(p.owner_id)
    data["created_by"] = str(p.created_by)
    if p.last_modified_by_id:
        data["last_modified_by_id"] = str(p.last_modified_by_id)
    return data


def _scoped(tenant_id) -> dict:
    return {"tenant_id": tenant_id, "deleted_at": None}


@router.get("/", summary="List patients")
async def list_patients(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(check_permission("view_patient")),
):
    skip = (page - 1) * per_page
    query = _scoped(current_user.tenant_id)
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"patient_id": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]
    total = await Patient.find(query).count()
    rows = (
        await Patient.find(query)
        .sort("-created_at")
        .skip(skip)
        .limit(per_page)
        .to_list()
    )
    return {
        "items": [_to_response(p) for p in rows],
        "page": page,
        "per_page": per_page,
        "total": total,
    }


@router.post("/", status_code=201, summary="Create patient")
async def create_patient(
    payload: PatientCreate,
    current_user: User = Depends(check_permission("create_patient")),
):
    data = payload.model_dump(exclude_unset=True)
    # Always tenant-scope and assign creator — never trust client values
    data.pop("tenant_id", None)
    data.pop("created_by", None)
    owner_id = data.pop("owner_id", None) or current_user.id

    # Validate owner is in-tenant
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

    if not data.get("patient_id"):
        data["patient_id"] = await _generate_patient_id(current_user.tenant_id)

    patient = Patient(
        **data,
        tenant_id=current_user.tenant_id,
        owner_id=owner_id,
        created_by=current_user.id,
    )
    await patient.insert()
    return _to_response(patient)


@router.get("/{patient_id}", summary="Get patient by id")
async def get_patient(
    patient_id: str,
    current_user: User = Depends(check_permission("view_patient")),
):
    try:
        oid = ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = await Patient.find_one({"_id": oid, **_scoped(current_user.tenant_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _to_response(patient)


@router.put("/{patient_id}", summary="Update patient")
async def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    current_user: User = Depends(check_permission("edit_patient")),
):
    try:
        oid = ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = await Patient.find_one({"_id": oid, **_scoped(current_user.tenant_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = payload.model_dump(exclude_unset=True)
    for forbidden in ("tenant_id", "created_by", "id", "_id", "patient_id"):
        update_data.pop(forbidden, None)

    if "owner_id" in update_data and update_data["owner_id"] != patient.owner_id:
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
        setattr(patient, field, value)
    patient.last_modified_by_id = current_user.id
    await patient.save()
    return _to_response(patient)


@router.delete("/{patient_id}", status_code=204, summary="Delete patient (soft)")
async def delete_patient(
    patient_id: str,
    current_user: User = Depends(check_permission("delete_patient")),
):
    try:
        oid = ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = await Patient.find_one({"_id": oid, **_scoped(current_user.tenant_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await patient.soft_delete()
    return None
