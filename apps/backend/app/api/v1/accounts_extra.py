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


@router.post("/import")
async def import_accounts(
    file: UploadFile = File(...),
    current_user: User = Depends(check_permission("create_account"))
):
    """Import accounts from CSV or Excel file"""
    from app.services.import_export_service import ImportExportService
    
    service = ImportExportService()
    result = await service.import_accounts_from_file(
        file,
        current_user.tenant_id,
        current_user.id
    )
    
    return {
        "error": False,
        **result
    }


@router.get("/export/{format}")
async def export_accounts(
    format: str,
    current_user: User = Depends(check_permission("view_account"))
):
    """Export accounts to CSV or Excel"""
    from app.services.import_export_service import ImportExportService
    
    # Get all accounts for export
    accounts = await Account.find(
        {"tenant_id": current_user.tenant_id, "deleted_at": None}
    ).to_list()
    
    service = ImportExportService()
    file_content = await service.export_accounts_to_excel(accounts, format)
    
    # Set filename and media type
    filename = f"accounts.{format}"
    if format == "xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "text/csv"
    
    return StreamingResponse(
        BytesIO(file_content),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
