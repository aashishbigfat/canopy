"""
Additional Contact API endpoints - create, edit, import, export, single-column
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from io import BytesIO
from bson import ObjectId

from app.models.user import User
from app.models.contact import Contact
from app.models.account import Account
from app.schemas.contact import ContactResponse
from app.services.contact_service import ContactService
from app.api.deps import get_current_user, check_permission
from app.api.v1.contacts import contact_to_response

router = APIRouter()

@router.get("/create")
async def get_create_form_data(
    current_user: User = Depends(get_current_user)
):
    """Get form data for creating a contact"""
    from app.models.contact_views import AdditionalFieldContact
    
    # Get accounts for selection - using direct dict query to avoid field access issues
    accounts = await Account.find({
        "tenant_id": current_user.tenant_id,
        "deleted_at": None
    }).sort("+name").limit(100).to_list()
    
    # Get users for owner selection - using direct dict query to avoid field access issues
    users = await User.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+name").to_list()
    
    # Get custom fields - using direct dict query to avoid field access issues
    custom_fields = await AdditionalFieldContact.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+sorting").to_list()
    
    return {
        "error": False,
        "accounts": [{"id": str(a.id), "name": a.name, "website": a.website} for a in accounts],
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


@router.get("/{contact_id}/edit")
async def get_edit_form_data(
    contact_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get contact data and form data for editing"""
    from app.models.contact_views import AdditionalFieldContact
    from app.models.user_contact_view import ContactCustomField
    
    # Get contact — tenant-scoped lookup
    try:
        cid = ObjectId(contact_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact = await Contact.find_one(
        {"_id": cid, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Get form data - using direct dict query to avoid field access issues
    accounts = await Account.find({
        "tenant_id": current_user.tenant_id,
        "deleted_at": None
    }).sort("+name").limit(100).to_list()

    users = await User.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+name").to_list()

    # Get custom field values for this contact — tenant-scoped to prevent
    # cross-tenant custom-field exposure via a shared contact_id.
    custom_field_values = await ContactCustomField.find({
        "contact_id": contact.id,
        "tenant_id": current_user.tenant_id,
    }).to_list()
    
    return {
        "error": False,
        "contact": contact_to_response(contact),
        "accounts": [{"id": str(a.id), "name": a.name, "website": a.website} for a in accounts],
        "users": [{"id": str(u.id), "name": u.name, "email": u.email} for u in users],
        "custom_field_values": [
            {
                "field_id": str(cf.contact_additional_field_id),
                "value": cf.field_value
            } for cf in custom_field_values
        ]
    }


@router.post("/single-column")
async def update_single_column(
    contact_id: str = Query(...),
    field_name: str = Query(...),
    field_value: str = Query(...),
    current_user: User = Depends(check_permission("edit_contact"))
):
    """Update a single column of a contact, scoped to tenant."""
    try:
        cid = ObjectId(contact_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact = await Contact.find_one(
        {"_id": cid, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    from app.core.inline_field_validation import validate_inline_field_update
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible

    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_record_visible(contact.owner_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Contact not found")

    if not hasattr(contact, field_name):
        raise HTTPException(status_code=400, detail=f"Invalid field: {field_name}")

    normalized = validate_inline_field_update("contact", field_name, field_value)
    setattr(contact, field_name, normalized)
    contact.last_modified_by_id = current_user.id
    await contact.save()

    return {
        "error": False,
        "message": f"{field_name} updated successfully",
        "contact": contact_to_response(contact)
    }


@router.post("/import")
async def import_contacts(
    file: UploadFile = File(...),
    current_user: User = Depends(check_permission("create_contact"))
):
    """Import contacts from CSV or Excel file"""
    from app.services.import_export_service import ImportExportService
    
    service = ImportExportService()
    result = await service.import_contacts_from_file(
        file,
        current_user.tenant_id,
        current_user.id
    )
    
    return {
        "error": False,
        **result
    }


@router.get("/export/{format}")
async def export_contacts(
    format: str,
    current_user: User = Depends(check_permission("view_contact"))
):
    """Export contacts to CSV or Excel"""
    from app.services.import_export_service import ImportExportService
    
    # Get all contacts for export - using direct dict query to avoid field access issues
    contacts = await Contact.find({
        "tenant_id": current_user.tenant_id,
        "deleted_at": None
    }).to_list()
    
    service = ImportExportService()
    file_content = await service.export_contacts_to_excel(contacts, format)
    
    # Set filename and media type
    filename = f"contacts.{format}"
    if format == "xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "text/csv"
    
    return StreamingResponse(
        BytesIO(file_content),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
