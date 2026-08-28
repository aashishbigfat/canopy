"""
Phase 8 — Extended reports router.

Adds the missing parity routes:
  - Standard reports (per-type generators)
  - Report folders (CRUD, share, created-by-me, public/private)
  - Report preview
  - Report clone
  - Sample file download (import templates)
  - User performance reports
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.report import Report
from app.models.report_folders import ReportFolder, ReportFolderShare
from app.services.report_service import report_service

router = APIRouter()


REPORT_TYPE_TO_ENTITY = {
    "accounts": "accounts",
    "contacts": "contacts",
    "personal_accounts": "accounts",
    "leads": "leads",
    "opportunities": "opportunities",
    "supplier": "suppliers",
    "suppliers": "suppliers",
}

LEGACY_REPORT_COLUMNS = [
    {"id": 1, "name": "name", "alias_name": "Name", "editable_flag": 0},
    {"id": 2, "name": "description", "alias_name": "Description", "editable_flag": 0},
    {"id": 3, "name": "folder_id", "alias_name": "Folder", "editable_flag": 0},
    {"id": 4, "name": "created_by", "alias_name": "Created By", "editable_flag": 0},
    {"id": 5, "name": "owner_id", "alias_name": "Owner", "editable_flag": 0},
    {"id": 6, "name": "created_at", "alias_name": "Created On", "editable_flag": 0},
    {"id": 7, "name": "updated_at", "alias_name": "Last Modified Date", "editable_flag": 0},
    {"id": 8, "name": "last_modified_by_id", "alias_name": "Last Modified By", "editable_flag": 0},
]

REPORT_BUILDER_COLUMNS = {
    "accounts": [
        ("name", "Account Name"),
        ("email", "Email"),
        ("phone", "Phone"),
        ("website", "Website"),
        ("segment", "Segment"),
        ("billing_street", "Billing Street"),
        ("billing_city", "Billing City"),
        ("billing_state", "Billing State"),
        ("billing_zip", "Billing Zip"),
        ("billing_country", "Billing Country"),
        ("industry_id", "Industry"),
        ("acc_type_id", "Account Type"),
        ("acc_parent_id", "Parent Account"),
        ("category_id", "Category"),
        ("owner_id", "Owner"),
        ("created_by", "Created By"),
        ("last_modified_by_id", "Last Modified By"),
        ("created_at", "Created Date"),
        ("updated_at", "Last Modified Date"),
    ],
    "contacts": [
        ("salutation", "Salutation"),
        ("first_name", "First Name"),
        ("last_name", "Last Name"),
        ("email", "Email"),
        ("phone", "Phone"),
        ("mobile", "Mobile"),
        ("title", "Title"),
        ("account_id", "Account Name"),
        ("mailing_street", "Mailing Street"),
        ("mailing_city", "Mailing City"),
        ("mailing_state", "Mailing State"),
        ("mailing_zip", "Mailing Zip"),
        ("mailing_country", "Mailing Country"),
        ("owner_id", "Owner"),
        ("created_by", "Created By"),
        ("last_modified_by_id", "Last Modified By"),
        ("created_at", "Created Date"),
        ("updated_at", "Last Modified Date"),
    ],
    "personal_accounts": [
        ("salutation", "Salutation"),
        ("first_name", "First Name"),
        ("last_name", "Last Name"),
        ("email", "Email"),
        ("phone", "Phone"),
        ("mobile", "Mobile"),
        ("segment", "Segment"),
        ("billing_street", "Billing Street"),
        ("billing_city", "Billing City"),
        ("billing_state", "Billing State"),
        ("billing_zip", "Billing Zip"),
        ("billing_country", "Billing Country"),
        ("category_id", "Category"),
        ("owner_id", "Owner"),
        ("created_by", "Created By"),
        ("last_modified_by_id", "Last Modified By"),
        ("created_at", "Created Date"),
        ("updated_at", "Last Modified Date"),
    ],
    "leads": [
        ("salutation", "Salutation"),
        ("first_name", "First Name"),
        ("last_name", "Last Name"),
        ("email", "Email"),
        ("phone", "Phone"),
        ("mobile", "Mobile"),
        ("company", "Company"),
        ("title", "Title"),
        ("no_employees", "No. of Employees"),
        ("website", "Website"),
        ("lead_status_id", "Lead Status"),
        ("source_id", "Source"),
        ("industry_id", "Industry"),
        ("street", "Street"),
        ("city", "City"),
        ("state", "State"),
        ("zip", "Zip"),
        ("country", "Country"),
        ("creation_type", "Creation Type"),
        ("owner_id", "Owner"),
        ("created_by", "Created By"),
        ("last_modified_by_id", "Last Modified By"),
        ("created_at", "Created Date"),
        ("updated_at", "Last Modified Date"),
    ],
    "opportunities": [
        ("name", "Opportunity Name"),
        ("amount", "Amount"),
        ("probability", "Probability"),
        ("sales_stage_id", "Sales Stage"),
        ("opportunity_type_id", "Opportunity Type"),
        ("source_id", "Source"),
        ("account_id", "Account Name"),
        ("contact_id", "Contact Name"),
        ("segment", "Segment"),
        ("creation_type", "Creation Type"),
        ("close_lost_reason", "Close Lost Reason"),
        ("close_date", "Close Date"),
        ("industry_data.travel_date", "Travel Date"),
        ("industry_data.destination_ids", "Destination(s)"),
        ("industry_data.no_of_pax", "No of Pax"),
        ("owner_id", "Owner"),
        ("created_by", "Created By"),
        ("last_modified_by_id", "Last Modified By"),
        ("created_at", "Create Date"),
        ("updated_at", "Last Modified Date"),
    ],
    "supplier": [
        ("name", "Supplier Name"),
        ("supplier_type", "Supplier Type"),
        ("phone", "Phone"),
        ("mobile", "Mobile"),
        ("email", "Email"),
        ("contact_person_name", "Contact Person Name"),
        ("services", "Services"),
        ("destinations", "Destination(s)"),
        ("street", "Street"),
        ("city", "City"),
        ("state", "State"),
        ("zip", "Zip"),
        ("country", "Country"),
        ("owner_id", "Owner"),
        ("created_by", "Created By"),
        ("created_at", "Created Date"),
        ("updated_at", "Last Modified Date"),
    ],
}

REPORT_DEFAULT_COLUMNS = {
    "accounts": ["name", "phone", "billing_street", "acc_type_id", "owner_id"],
    "contacts": ["first_name", "last_name", "email", "phone", "owner_id"],
    "personal_accounts": ["first_name", "last_name", "email", "phone", "owner_id"],
    "leads": ["first_name", "last_name", "email", "phone", "company", "owner_id"],
    "opportunities": ["name", "amount", "sales_stage_id", "close_date", "owner_id"],
    "supplier": ["name", "phone", "email", "city", "owner_id"],
}

REPORT_FILTER_OPERATORS = [
    {"id": "equals", "name": "Equals"},
    {"id": "not_equals", "name": "Not equal"},
    {"id": "contains", "name": "Contains"},
    {"id": "starts_with", "name": "Starts with"},
    {"id": "is_empty", "name": "Is empty"},
    {"id": "is_not_empty", "name": "Is not empty"},
    {"id": "greater_than", "name": "Greater than"},
    {"id": "less_than", "name": "Less than"},
    {"id": "between", "name": "Between"},
]


def _default_report_filters(report_type: str) -> Dict[str, Any]:
    if report_type == "personal_accounts":
        return {"is_person_account": True}
    if report_type == "accounts":
        return {"is_person_account": False}
    return {}


def _default_report_filter_labels(report_type: str) -> List[Dict[str, str]]:
    if report_type == "personal_accounts":
        return [{"field": "is_person_account", "label": "Account Type", "operator": "equals", "value": "Personal Account"}]
    if report_type == "accounts":
        return [{"field": "is_person_account", "label": "Account Type", "operator": "equals", "value": "Account"}]
    return []


class LegacyFolderIn(BaseModel):
    name: str
    parent_id: Optional[PydanticObjectId] = None


class LegacyCloneIn(BaseModel):
    id: PydanticObjectId
    name: str
    description: Optional[str] = None
    folder_id: Optional[Dict[str, Any]] = None


class BuilderPreviewIn(BaseModel):
    entity_type: str
    columns: List[str] = []
    filters: Dict[str, Any] = {}
    order_by: Optional[str] = None
    order_direction: str = "desc"
    limit: int = 5


class BuilderSaveIn(BuilderPreviewIn):
    name: str
    description: Optional[str] = None
    report_type: str = "custom"
    folder_id: Optional[PydanticObjectId] = None
    folder_name: Optional[str] = None
    is_public: bool = False


def _entity_for_report_type(report_type: str) -> str:
    entity_type = REPORT_TYPE_TO_ENTITY.get(report_type)
    if not entity_type:
        raise HTTPException(404, "Report not found")
    return entity_type


def _report_matches_type(report: Report, report_type: str) -> bool:
    if report_type == "personal_accounts":
        return report.entity_type == "accounts" and report.filters.get("is_person_account") is True
    if report_type == "accounts":
        return report.entity_type == "accounts" and report.filters.get("is_person_account") is not True
    return report.entity_type == _entity_for_report_type(report_type)


def _serialize_date(value: Optional[datetime]) -> Optional[str]:
    return value.strftime("%Y-%m-%d") if value else None


def _id(value: Any) -> Optional[str]:
    return str(value) if value is not None else None


async def _legacy_users(tenant_id: PydanticObjectId) -> List[Dict[str, Any]]:
    users = await User.find({"tenant_id": tenant_id, "is_active": True}).sort("name").to_list()
    return [{"id": str(user.id), "name": user.name, "email": str(user.email)} for user in users]


async def _folder_details(folder_id: Any, tenant_id: PydanticObjectId) -> Optional[Dict[str, str]]:
    if not folder_id:
        return None
    try:
        folder_obj_id = PydanticObjectId(str(folder_id))
    except Exception:
        return {"id": str(folder_id), "name": str(folder_id)}
    folder = await ReportFolder.get(folder_obj_id)
    if not folder or folder.tenant_id != tenant_id:
        return {"id": str(folder_id), "name": str(folder_id)}
    return {"id": str(folder.id), "name": folder.name}


async def _legacy_report_row(report: Report, tenant_id: PydanticObjectId, folder_flag: int = 0) -> Dict[str, Any]:
    folder_id = (report.chart_config or {}).get("folder_id")
    folder_name = (report.chart_config or {}).get("folder_name")
    folder = await _folder_details(folder_id, tenant_id)
    if not folder and folder_name:
        folder = {"id": str(folder_id or folder_name), "name": str(folder_name)}
    last_modified_by_id = report.last_modified_by_id or report.owner_id or report.created_by
    return {
        "id": str(report.id),
        "name": report.name,
        "alias_name": report.name,
        "description": report.description,
        "folder_id": folder,
        "created_by": report.created_by,
        "owner_id": report.owner_id,
        "last_modified_by_id": last_modified_by_id,
        "created_at": _serialize_date(report.created_at),
        "updated_at": _serialize_date(report.updated_at),
        "folder": folder_flag,
    }


def _legacy_folder_row(folder: ReportFolder, folder_flag: int = 1) -> Dict[str, Any]:
    return {
        "id": str(folder.id),
        "name": folder.name,
        "parent_id": _id(folder.parent_id),
        "created_by": _id(folder.created_by),
        "last_modified_by_id": _id(folder.last_modified_by_id or folder.created_by),
        "created_at": _serialize_date(folder.created_at),
        "updated_at": _serialize_date(folder.updated_at),
        "folder": folder_flag,
    }


async def _legacy_report_payload(
    reports: List[Report],
    tenant_id: PydanticObjectId,
    folders: Optional[List[ReportFolder]] = None,
) -> Dict[str, Any]:
    report_rows = [await _legacy_report_row(report, tenant_id) for report in reports]
    folder_rows = [_legacy_folder_row(folder) for folder in folders or []]
    users = await _legacy_users(tenant_id)
    return {
        "error": False,
        "reports": report_rows,
        "folders": folder_rows,
        "all_folders": folder_rows,
        "total_reports": len(report_rows),
        "total_folders": len(folder_rows),
        "total": len(folder_rows),
        "parent_id": None,
        "users": users,
        "share_users": users,
        "report_columns": LEGACY_REPORT_COLUMNS,
        "display_columns": LEGACY_REPORT_COLUMNS,
    }


async def _ensure_default_report_folder(
    tenant_id: PydanticObjectId,
    user_id: PydanticObjectId,
    name: str,
    is_public: bool,
) -> ReportFolder:
    folder = await ReportFolder.find_one({"tenant_id": tenant_id, "name": name, "parent_id": None})
    if folder:
        return folder
    folder = ReportFolder(
        tenant_id=tenant_id,
        name=name,
        parent_id=None,
        is_public=is_public,
        is_default=True,
        created_by=user_id,
        last_modified_by_id=user_id,
    )
    await folder.insert()
    return folder


# ============== STANDARD REPORTS (per-type stubs) ==============

# Mirror legacy POST endpoints. Each returns a stub envelope; the actual
# aggregation is computed inside dashboard/report services. Phase 8 covers
# the API surface so the frontend can call them; service-side aggregation
# is wired on top in follow-up commits.

class StandardReportFilters(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_ids: Optional[List[PydanticObjectId]] = None
    department_ids: Optional[List[PydanticObjectId]] = None
    territory_ids: Optional[List[PydanticObjectId]] = None
    extras: Optional[Dict[str, Any]] = None


def _empty_report(name: str, filters: StandardReportFilters) -> Dict[str, Any]:
    return {
        "report_name": name,
        "filters": filters.model_dump(exclude_none=True),
        "rows": [],
        "totals": {},
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.post("/standard/sales-stage")
async def standard_sales_stage_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_st_report`."""
    return _empty_report("sales_stage", payload)


@router.post("/standard/user-performance")
async def standard_user_performance_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report`."""
    return _empty_report("user_performance", payload)


@router.post("/standard/opportunities")
async def standard_opportunity_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report_oppo`."""
    return _empty_report("opportunities", payload)


@router.post("/standard/opportunities-domestic-international")
async def standard_opp_dom_int(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report_oppo_d_i`."""
    return _empty_report("opportunities_domestic_international", payload)


@router.post("/standard/opportunities-domestic-international-pipeline")
async def standard_opp_dom_int_pipeline(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report_oppo_d_i_pipeline`."""
    return _empty_report("opportunities_domestic_international_pipeline", payload)


@router.post("/standard/opportunities-by-country")
async def standard_opp_by_country(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report_oppo_country`."""
    return _empty_report("opportunities_by_country", payload)


@router.post("/standard/active-users")
async def standard_active_user_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/active_user_report`."""
    return _empty_report("active_users", payload)


@router.post("/standard/account-contact")
async def standard_account_contact_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/account_contact_report`."""
    return _empty_report("account_contact", payload)


@router.post("/standard/leads")
async def standard_leads_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/leads_report`."""
    return _empty_report("leads", payload)


@router.post("/standard/team")
async def standard_team_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/team_reports`."""
    return _empty_report("team", payload)


@router.post("/standard/lead-conversion")
async def standard_lead_conversion(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/report_lead_conversion`."""
    return _empty_report("lead_conversion", payload)


@router.post("/standard/agent-departure")
async def standard_agent_departure(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/agent_departure_report`."""
    return _empty_report("agent_departure", payload)


@router.post("/standard/team-by-month")
async def standard_team_by_month(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Sprint A8 — team performance grouped by month."""
    return _empty_report("team_by_month", payload)


@router.post("/standard/lead-source-funnel")
async def standard_lead_source_funnel(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Sprint A8 — funnel breakdown by lead source."""
    return _empty_report("lead_source_funnel", payload)


@router.post("/standard/owner-conversion")
async def standard_owner_conversion(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Sprint A8 — per-owner conversion rates."""
    return _empty_report("owner_conversion", payload)


@router.post("/standard/agent-bookings")
async def standard_agent_bookings(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Sprint A8 — agent booking volumes."""
    return _empty_report("agent_bookings", payload)


# ============== FOLDERS ==============

class FolderIn(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[PydanticObjectId] = None
    is_public: Optional[bool] = False


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[PydanticObjectId] = None
    is_public: Optional[bool] = None


@router.get("/custom")
async def list_custom_reports_legacy(
    type: str = Query("accounts"),
    scope: str = Query("recent"),
    current_user: User = Depends(get_current_user),
):
    """
    Old TFC custom report listing shape.

    Mirrors:
      - /rest_reports
      - /rest_reports_created_by_me
      - /rest_public_reports
      - /rest_private_reports
      - /rest_folders
      - /rest_folders_created_by_me
      - /rest_shared_with_me_folders
    """
    try:
        entity_type = _entity_for_report_type(type)
        tenant_id = current_user.tenant_id
        user_id = str(current_user.id)

        if scope in {"all_folders", "folders"}:
            folders = await ReportFolder.find(
                {
                    "tenant_id": tenant_id,
                    "parent_id": None,
                    "name": {"$nin": ["private_folder", "public_folder"]},
                }
            ).sort("-updated_at").to_list()
            return await _legacy_report_payload([], tenant_id, folders)

        if scope in {"folders_created_by_me", "created_by_me_folders"}:
            folders = await ReportFolder.find(
                {
                    "tenant_id": tenant_id,
                    "parent_id": None,
                    "created_by": current_user.id,
                    "name": {"$nin": ["private_folder", "public_folder"]},
                }
            ).sort("-updated_at").to_list()
            return await _legacy_report_payload([], tenant_id, folders)

        if scope in {"shared_with_me", "shared_folders"}:
            folders = await ReportFolder.find(
                {"tenant_id": tenant_id, "shared_with_user_ids": current_user.id}
            ).sort("-updated_at").to_list()
            return await _legacy_report_payload([], tenant_id, folders)

        query: Dict[str, Any] = {
            "tenant_id": tenant_id,
            "report_type": "custom",
            "entity_type": entity_type,
        }

        if scope == "created_by_me":
            query["created_by"] = user_id
        elif scope == "public":
            public_folder = await _ensure_default_report_folder(tenant_id, current_user.id, "public_folder", True)
            query["$or"] = [{"chart_config.folder_id": str(public_folder.id)}, {"chart_config.folder_name": "public_folder"}]
        elif scope == "private":
            private_folder = await _ensure_default_report_folder(tenant_id, current_user.id, "private_folder", False)
            query["$or"] = [{"chart_config.folder_id": str(private_folder.id)}, {"chart_config.folder_name": "private_folder"}]
        else:
            query["$or"] = [
                {"created_by": user_id},
                {"owner_id": user_id},
                {"is_public": True},
                {"shared_with": user_id},
            ]

        reports = await Report.find(query).sort("-updated_at").to_list()
        reports = [report for report in reports if _report_matches_type(report, type)]
        return await _legacy_report_payload(reports, tenant_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Custom reports failed: {type(exc).__name__}: {exc}") from exc


@router.post("/custom/folders")
async def create_custom_report_folder_legacy(
    payload: LegacyFolderIn,
    current_user: User = Depends(get_current_user),
):
    folder = ReportFolder(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        parent_id=payload.parent_id,
        created_by=current_user.id,
        last_modified_by_id=current_user.id,
    )
    await folder.insert()
    return {
        "error": False,
        "message": f"Folder {folder.name} created successfully.",
        "folder_id": str(folder.id),
        "folder": _legacy_folder_row(folder),
    }


@router.get("/custom/folders")
async def list_custom_report_folders_legacy(
    current_user: User = Depends(get_current_user),
):
    public_folder = await _ensure_default_report_folder(current_user.tenant_id, current_user.id, "public_folder", True)
    private_folder = await _ensure_default_report_folder(current_user.tenant_id, current_user.id, "private_folder", False)
    folders = await ReportFolder.find(
        {
            "tenant_id": current_user.tenant_id,
            "parent_id": None,
        }
    ).sort("name").to_list()
    normal_folders = [folder for folder in folders if folder.name not in {"public_folder", "private_folder"}]
    folder_rows = [
        _legacy_folder_row(folder)
        for folder in [*normal_folders, public_folder, private_folder]
    ]
    return {
        "error": False,
        "all_folders": folder_rows,
        "total": len(normal_folders),
        "parent_id": None,
        "users": await _legacy_users(current_user.tenant_id),
    }


@router.post("/custom/save")
async def save_custom_report_builder_legacy(
    payload: BuilderSaveIn,
    current_user: User = Depends(get_current_user),
):
    entity_type = _entity_for_report_type(payload.entity_type)
    folder: Optional[ReportFolder] = None

    if payload.folder_id:
        folder = await ReportFolder.get(payload.folder_id)
        if not folder or folder.tenant_id != current_user.tenant_id:
            raise HTTPException(404, "Folder not found")
    elif payload.folder_name:
        folder = await ReportFolder.find_one(
            {
                "tenant_id": current_user.tenant_id,
                "name": payload.folder_name,
                "parent_id": None,
            }
        )
        if not folder:
            folder = ReportFolder(
                tenant_id=current_user.tenant_id,
                name=payload.folder_name,
                parent_id=None,
                is_public=payload.is_public,
                created_by=current_user.id,
                last_modified_by_id=current_user.id,
            )
            await folder.insert()

    chart_config: Dict[str, Any] = {}
    if folder:
        chart_config["folder_id"] = str(folder.id)
        chart_config["folder_name"] = folder.name

    report = Report(
        name=payload.name,
        description=payload.description,
        report_type="custom",
        entity_type=entity_type,
        columns=payload.columns,
        filters=payload.filters,
        order_by=payload.order_by,
        order_direction=payload.order_direction,
        limit=None,
        chart_config=chart_config,
        is_public=payload.is_public or bool(folder and folder.name == "public_folder"),
        tenant_id=current_user.tenant_id,
        created_by=str(current_user.id),
        owner_id=str(current_user.id),
        last_modified_by_id=str(current_user.id),
    )
    await report.insert()

    if folder and report.id not in folder.report_ids:
        folder.report_ids.append(report.id)
        folder.updated_at = datetime.utcnow()
        folder.last_modified_by_id = current_user.id
        await folder.save()

    return {
        "error": False,
        "message": f"Report {report.name} saved successfully.",
        "report": await _legacy_report_row(report, current_user.tenant_id),
        "id": str(report.id),
    }


@router.get("/custom/folders/{folder_id}")
async def show_custom_report_folder_legacy(
    folder_id: PydanticObjectId,
    type: str = Query("accounts"),
    current_user: User = Depends(get_current_user),
):
    folder = await ReportFolder.get(folder_id)
    if not folder or folder.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")

    sub_folders = await ReportFolder.find(
        {"tenant_id": current_user.tenant_id, "parent_id": folder.id}
    ).sort("name").to_list()

    reports: List[Report] = []
    if folder.report_ids:
        reports = await Report.find(
            {"tenant_id": current_user.tenant_id, "_id": {"$in": folder.report_ids}}
        ).sort("-updated_at").to_list()

    folder_id_text = str(folder.id)
    chart_reports = await Report.find(
        {
            "tenant_id": current_user.tenant_id,
            "report_type": "custom",
            "$or": [
                {"chart_config.folder_id": folder_id_text},
                {"chart_config.folder_name": folder.name},
            ],
        }
    ).sort("-updated_at").to_list()

    report_by_id = {str(report.id): report for report in reports}
    report_by_id.update({str(report.id): report for report in chart_reports})
    report_rows = [
        await _legacy_report_row(report, current_user.tenant_id)
        for report in report_by_id.values()
        if _report_matches_type(report, type)
    ]
    folder_rows = [_legacy_folder_row(sub_folder) for sub_folder in sub_folders]

    return {
        "error": False,
        "folder": _legacy_folder_row(folder, folder_flag=1),
        "sub_folders": folder_rows,
        "total_sub_folders": len(folder_rows),
        "reports": report_rows,
        "total_reports": len(report_rows),
        "users": await _legacy_users(current_user.tenant_id),
    }


@router.post("/custom/clone")
async def clone_custom_report_legacy(
    payload: LegacyCloneIn,
    current_user: User = Depends(get_current_user),
):
    src = await Report.get(payload.id)
    if not src or src.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Report not found")

    folder_id = None
    folder_name = None
    if payload.folder_id:
        folder_id = payload.folder_id.get("id")
        folder_name = payload.folder_id.get("name")

    data = src.model_dump(exclude={"id", "_id", "created_at", "updated_at", "last_run_at"})
    data["name"] = payload.name
    data["description"] = payload.description
    data["created_by"] = str(current_user.id)
    data["owner_id"] = str(current_user.id)
    data["last_modified_by_id"] = str(current_user.id)
    data["is_default"] = False
    data["is_favorite"] = False
    data["tenant_id"] = current_user.tenant_id
    chart_config = dict(data.get("chart_config") or {})
    if folder_id:
        chart_config["folder_id"] = str(folder_id)
    if folder_name:
        chart_config["folder_name"] = str(folder_name)
    data["chart_config"] = chart_config

    report = Report(**data)
    await report.insert()

    if folder_id:
        try:
            folder = await ReportFolder.get(PydanticObjectId(str(folder_id)))
            if folder and folder.tenant_id == current_user.tenant_id and report.id not in folder.report_ids:
                folder.report_ids.append(report.id)
                folder.updated_at = datetime.utcnow()
                await folder.save()
        except Exception:
            pass

    return {
        "error": False,
        "message": f"Report {report.name} cloned successfully.",
        "report": await _legacy_report_row(report, current_user.tenant_id),
    }


@router.get("/custom/metadata")
async def get_custom_report_builder_metadata(
    type: str = Query("accounts"),
    current_user: User = Depends(get_current_user),
):
    entity_type = _entity_for_report_type(type)
    columns = REPORT_BUILDER_COLUMNS.get(type) or REPORT_BUILDER_COLUMNS.get(entity_type, [])
    default_columns = REPORT_DEFAULT_COLUMNS.get(type) or [column[0] for column in columns[:5]]
    preview_report = Report(
        name="Preview",
        report_type="custom",
        entity_type=entity_type,
        columns=default_columns,
        filters=_default_report_filters(type),
        order_direction="desc",
        limit=5,
        tenant_id=current_user.tenant_id,
        created_by=str(current_user.id),
        owner_id=str(current_user.id),
    )
    rows, total = await report_service._execute_report_query(preview_report)
    display_columns = [
        {"id": index + 1, "name": name, "alias_name": label, "is_additional": 0}
        for index, (name, label) in enumerate(columns)
        if name in default_columns
    ]
    return {
        "error": False,
        "reportable_type": {"id": type, "name": type},
        "all_columns": [
            {"id": index + 1, "name": name, "alias_name": label, "is_additional": 0}
            for index, (name, label) in enumerate(columns)
        ],
        "display_columns": display_columns,
        "additional_columns": [],
        "group_bys": display_columns,
        "operators": REPORT_FILTER_OPERATORS,
        "default_filters": _default_report_filter_labels(type),
        "users": await _legacy_users(current_user.tenant_id),
        "report_results": rows,
        "total": total,
    }


@router.get("/folders")
async def list_folders(current_user: User = Depends(get_current_user)):
    rows = await ReportFolder.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list()
    visible = [
        f for f in rows
        if f.is_public
        or f.created_by == current_user.id
        or current_user.id in (f.shared_with_user_ids or [])
    ]
    return [r.model_dump() for r in visible]


@router.post("/folders", status_code=201)
async def create_folder(
    payload: FolderIn,
    current_user: User = Depends(get_current_user),
):
    obj = ReportFolder(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/folders/created-by-me")
async def list_folders_created_by_me(current_user: User = Depends(get_current_user)):
    rows = await ReportFolder.find(
        {"tenant_id": current_user.tenant_id, "created_by": current_user.id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.get("/folders/shared-with-me")
async def list_shared_folders(current_user: User = Depends(get_current_user)):
    rows = await ReportFolder.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list()
    out = [
        f for f in rows
        if current_user.id in (f.shared_with_user_ids or [])
    ]
    return [r.model_dump() for r in out]


@router.get("/folders/{folder_id}")
async def get_folder(
    folder_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ReportFolder.get(folder_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")
    return obj.model_dump()


@router.put("/folders/{folder_id}")
async def update_folder(
    folder_id: PydanticObjectId,
    payload: FolderUpdate,
    current_user: User = Depends(get_current_user),
):
    obj = await ReportFolder.get(folder_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")
    if obj.created_by != current_user.id:
        raise HTTPException(403, "Only the folder owner can edit")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/folders/{folder_id}", status_code=204)
async def delete_folder(
    folder_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ReportFolder.get(folder_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")
    if obj.created_by != current_user.id:
        raise HTTPException(403, "Only the folder owner can delete")
    await ReportFolderShare.find(
        ReportFolderShare.folder_id == folder_id,
    ).delete()
    await obj.delete()


class FolderShareIn(BaseModel):
    user_ids: List[PydanticObjectId]
    permission: str = "read"


@router.post("/folders/{folder_id}/share")
async def share_folder(
    folder_id: PydanticObjectId,
    payload: FolderShareIn,
    current_user: User = Depends(get_current_user),
):
    folder = await ReportFolder.get(folder_id)
    if not folder or folder.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")
    if folder.created_by != current_user.id:
        raise HTTPException(403, "Only the owner can share")
    folder.shared_with_user_ids = list(set(folder.shared_with_user_ids + payload.user_ids))
    folder.updated_at = datetime.utcnow()
    await folder.save()
    for uid in payload.user_ids:
        existing = await ReportFolderShare.find_one(
            {"tenant_id": current_user.tenant_id, "folder_id": folder_id, "user_id": uid},
        )
        if not existing:
            share = ReportFolderShare(
                tenant_id=current_user.tenant_id,
                folder_id=folder_id,
                user_id=uid,
                permission=payload.permission,
            )
            await share.insert()
    return folder.model_dump()


# ============== REPORT PREVIEW + CLONE + EXPORT FORMAT ==============

class PreviewIn(BaseModel):
    entity_type: str
    columns: List[str] = []
    filters: Dict[str, Any] = {}
    limit: int = 50


@router.post("/preview")
async def preview_report(
    payload: BuilderPreviewIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_report_previews` for the custom builder."""
    entity_type = _entity_for_report_type(payload.entity_type)
    base_filters = _default_report_filters(payload.entity_type)
    base_filters.update(payload.filters or {})
    report = Report(
        name="Preview",
        report_type="custom",
        entity_type=entity_type,
        columns=payload.columns or REPORT_DEFAULT_COLUMNS.get(payload.entity_type, []),
        filters=base_filters,
        order_by=payload.order_by,
        order_direction=payload.order_direction,
        limit=payload.limit or 5,
        tenant_id=current_user.tenant_id,
        created_by=str(current_user.id),
        owner_id=str(current_user.id),
    )
    rows, total = await report_service._execute_report_query(report)
    column_defs = dict(REPORT_BUILDER_COLUMNS.get(payload.entity_type) or REPORT_BUILDER_COLUMNS.get(entity_type, []))
    return {
        "error": False,
        "reportable_type": {"id": payload.entity_type, "name": payload.entity_type},
        "display_columns": [
            {"name": column, "alias_name": column_defs.get(column, column.replace("_", " ").title())}
            for column in report.columns
        ],
        "report_results": rows,
        "total": total,
    }


@router.post("/{report_id}/clone")
async def clone_report(
    report_id: PydanticObjectId,
    name_override: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/report_clone`."""
    src = await Report.get(report_id)
    if not src or src.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Report not found")
    data = src.model_dump(exclude={"id", "_id", "created_at", "updated_at", "last_run_at"})
    data["name"] = name_override or f"{src.name} (copy)"
    data["is_default"] = False
    data["created_by"] = str(current_user.id)
    data["owner_id"] = str(current_user.id)
    new_obj = Report(**data)
    await new_obj.insert()
    return new_obj.model_dump()


class ExportFormatIn(BaseModel):
    format: str                       # csv | xlsx | pdf
    rows: List[Dict[str, Any]]
    columns: Optional[List[str]] = None
    filename: Optional[str] = None


@router.post("/export/format")
async def format_data_export(
    payload: ExportFormatIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/format_data_export`. Returns metadata; actual
    file generation handled by background task."""
    return {
        "format": payload.format,
        "filename": payload.filename or f"export-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{payload.format}",
        "row_count": len(payload.rows),
        "queued": True,
    }


@router.get("/sample/{template_type}")
async def download_sample(
    template_type: str,
    current_user: User = Depends(get_current_user),
):
    """
    Mirror old `/rest_sample_download/{type}`. Returns metadata + suggested
    column layout for the import sample template.
    """
    samples = {
        "lead": ["first_name", "last_name", "email", "mobile", "company", "lead_status"],
        "account": ["name", "email", "website", "industry", "phone", "billing_country"],
        "contact": ["first_name", "last_name", "email", "phone", "title", "account"],
        "opportunity": ["name", "amount", "close_date", "sales_stage", "owner"],
        "supplier": ["name", "supplier_type", "email", "phone", "country"],
        "personal_account": ["first_name", "last_name", "email", "mobile"],
        "task": ["name", "due_date", "priority", "status", "assigned_to"],
    }
    if template_type not in samples:
        raise HTTPException(404, f"Unknown sample type: {template_type}")
    return {
        "type": template_type,
        "filename": f"{template_type}_import_sample.csv",
        "headers": samples[template_type],
        "rows_example": 0,
    }


# ============== USER PERFORMANCE REPORTS ==============

@router.get("/user-performance")
async def get_user_performance(
    user_id: Optional[PydanticObjectId] = None,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/get_user_report_performance` and `/get_user_report`.
    Returns a stub aggregate; service-side computation wired in follow-on."""
    target = user_id or current_user.id
    return {
        "user_id": str(target),
        "leads": 0,
        "opportunities": 0,
        "won_amount": 0,
        "lost_amount": 0,
        "tasks_due": 0,
        "tasks_overdue": 0,
    }


# ============== CREATED-BY-ME REPORTS ==============

@router.get("/created-by-me")
async def list_reports_created_by_me(current_user: User = Depends(get_current_user)):
    rows = await Report.find(
        {"tenant_id": current_user.tenant_id, "created_by": str(current_user.id)},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.get("/private")
async def list_private_reports(current_user: User = Depends(get_current_user)):
    rows = await Report.find(
        {"tenant_id": current_user.tenant_id, "created_by": str(current_user.id), "is_public": False},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.get("/public")
async def list_public_reports(current_user: User = Depends(get_current_user)):
    rows = await Report.find(
        {"tenant_id": current_user.tenant_id, "is_public": True},
    ).to_list()
    return [r.model_dump() for r in rows]
