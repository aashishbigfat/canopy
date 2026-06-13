"""
Additional Account API endpoints - create, edit, import, export
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from io import BytesIO
from bson import ObjectId

from app.models.user import User
from app.models.account import Account
from app.schemas.account import AccountResponse
from app.api.deps import get_current_user, check_permission

router = APIRouter()

@router.get("/create")
async def get_create_form_data(
    current_user: User = Depends(get_current_user)
):
    """Get form data for creating an account"""
    from app.models.picklists import AccountType, Industry, AccountSource
    from app.models.custom_fields import AdditionalFieldAccount
    from app.core.picklist_query import build_picklist_query, dedup_picklist_items
    from app.models.tenant import Tenant
    
    # Resolve tenant industry for picklist scoping
    tenant = await Tenant.get(current_user.tenant_id)
    tenant_industry = tenant.industry if tenant else None
    
    # Get account types (platform defaults + tenant overrides)
    # picklist_type prevents cross-contamination in shared 'picklists' collection
    account_types = dedup_picklist_items(await AccountType.find(build_picklist_query(current_user.tenant_id, industry=tenant_industry, picklist_type="account_type")).sort("+sorting").to_list())

    # Get industries (platform defaults + tenant overrides)
    industries = dedup_picklist_items(await Industry.find(build_picklist_query(current_user.tenant_id, industry=tenant_industry, picklist_type="industry")).sort("+sorting").to_list())

    # Get account sources (platform defaults + tenant overrides)
    sources = dedup_picklist_items(await AccountSource.find(build_picklist_query(current_user.tenant_id, picklist_type="account_source")).sort("+sorting").to_list())

    # Get users for owner selection
    users = await User.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).sort("+name").to_list()

    # Get custom fields
    custom_fields = await AdditionalFieldAccount.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).sort("+sorting").to_list()
    
    return {
        "error": False,
        "account_types": [{"id": str(at.id), "name": at.name} for at in account_types],
        "industries": [{"id": str(i.id), "name": i.name} for i in industries],
        "sources": [{"id": str(s.id), "name": s.name} for s in sources],
        "users": [{"id": str(u.id), "name": u.name, "email": u.email} for u in users],
        "custom_fields": [
            {
                "id": str(cf.id),
                "name": cf.name,
                "field_type": cf.field_type,
                "is_mandatory": cf.is_mandatory,
                "options": cf.options
            } for cf in custom_fields
        ]
    }


@router.get("/{account_id}/edit")
async def get_edit_form_data(
    account_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get account data and form data for editing"""
    from app.models.picklists import AccountType, Industry, AccountSource
    from app.models.custom_fields import AdditionalFieldAccount, AccountCustomField
    from app.core.picklist_query import build_picklist_query, dedup_picklist_items
    from app.models.tenant import Tenant
    
    # Get account — tenant-scoped lookup
    try:
        aid = ObjectId(account_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Account not found")
    account = await Account.find_one(
        {"_id": aid, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Resolve tenant industry for picklist scoping
    tenant = await Tenant.get(current_user.tenant_id)
    tenant_industry = tenant.industry if tenant else None
    
    # Get form data (platform defaults + tenant overrides)
    # picklist_type prevents cross-contamination in shared 'picklists' collection
    account_types = dedup_picklist_items(await AccountType.find(build_picklist_query(current_user.tenant_id, industry=tenant_industry, picklist_type="account_type")).sort("+sorting").to_list())
    industries = dedup_picklist_items(await Industry.find(build_picklist_query(current_user.tenant_id, industry=tenant_industry, picklist_type="industry")).sort("+sorting").to_list())

    users = await User.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).sort("+name").to_list()
    
    # Get custom field values for this account
    custom_field_values = await AccountCustomField.find(
        AccountCustomField.account_id == account.id
    ).to_list()
    
    return {
        "error": False,
        "account": AccountResponse.from_orm(account),
        "account_types": [{"id": str(at.id), "name": at.name} for at in account_types],
        "industries": [{"id": str(i.id), "name": i.name} for i in industries],
        "users": [{"id": str(u.id), "name": u.name, "email": u.email} for u in users],
        "custom_field_values": [
            {
                "field_id": str(cf.account_additional_field_id),
                "value": cf.field_value
            } for cf in custom_field_values
        ]
    }


@router.get("/import/sample")
async def download_account_import_sample(
    is_person_account: bool = False,
    current_user: User = Depends(check_permission("create_account"))
):
    """Download the sample CSV whose columns match the account importer.

    `is_person_account=true` returns the Person Account sample instead.
    """
    from app.services.import_export_service import generate_sample_csv
    from app.services.industry_service import get_tenant_industry

    tenant_industry = await get_tenant_industry(current_user.tenant_id)
    entity = "personal_account" if is_person_account else "account"
    content = generate_sample_csv(entity, tenant_industry)
    filename = f"{'person_accounts' if is_person_account else 'accounts'}_import_sample.csv"
    return StreamingResponse(
        BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/import")
async def import_accounts(
    file: UploadFile = File(...),
    is_person_account: bool = False,
    current_user: User = Depends(check_permission("create_account"))
):
    """Import company or person accounts from a CSV or Excel file."""
    from app.services.import_export_service import ImportExportService

    service = ImportExportService()
    try:
        result = await service.import_accounts_from_file(
            file,
            current_user.tenant_id,
            current_user.id,
            is_person_account=is_person_account,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    label = "person accounts" if is_person_account else "accounts"
    return {
        "error": False,
        "message": f"Successfully imported {result['imported']} {label}, skipped {result['skipped']} duplicates/errors.",
        "data": result,
        **result,
    }


@router.get("/export/{format}")
async def export_accounts(
    format: str,
    is_person_account: bool = False,
    current_user: User = Depends(check_permission("view_account"))
):
    """Export all visible company or person accounts to CSV or Excel."""
    from app.services.import_export_service import ImportExportService
    from app.services.industry_service import get_tenant_industry
    from app.services.visibility_scope import get_visible_owner_ids

    if format not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Unsupported format. Use csv or xlsx.")

    # Tenant + ownership/hierarchy scope, same as the list endpoint.
    # is_person_account keeps the company and person exports separate.
    query = {
        "tenant_id": current_user.tenant_id,
        "deleted_at": None,
        "is_person_account": is_person_account,
    }
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if visible_owner_ids is not None:
        query["owner_id"] = {"$in": visible_owner_ids}

    accounts = await Account.find(query).sort("-created_at").to_list()
    tenant_industry = await get_tenant_industry(current_user.tenant_id)

    service = ImportExportService()
    file_content = await service.export_accounts_to_file(
        accounts,
        format,
        tenant_id=current_user.tenant_id,
        is_person_account=is_person_account,
        tenant_industry=tenant_industry,
    )

    from datetime import datetime
    prefix = "person_accounts" if is_person_account else "accounts"
    filename = f"{prefix}_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format}"
    if format == "xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "text/csv"

    return StreamingResponse(
        BytesIO(file_content),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
