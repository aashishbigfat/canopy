"""
Contact API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from bson import ObjectId

from app.models.user import User
from app.models.contact import Contact
from app.schemas.contact import (
    ContactCreate, ContactUpdate, ContactResponse, ContactListResponse,
    ContactDetailResponse, ContactOwnerChange
)
from app.services.contact_service import ContactService
from app.api.deps import get_current_user, check_permission
from app.models.tenant import Tenant
from app.schemas.industry_data import validate_industry_data

router = APIRouter()

def contact_to_response(contact: Contact) -> ContactResponse:
    """Convert Contact model to ContactResponse with proper string conversion and name enrichment"""
    # Try to get names from the object (if they were populated by the service)
    # Fallback to None if not present
    owner_name = getattr(contact, 'owner_name', None)
    created_by_name = getattr(contact, 'created_by_name', None)
    last_modified_by_name = getattr(contact, 'last_modified_by_name', None)
    
    return ContactResponse(
        id=str(contact.id),
        salutation=contact.salutation,
        first_name=contact.first_name,
        middle_name=contact.middle_name,
        last_name=contact.last_name,
        email=contact.email,
        phone=contact.phone,
        mobile=contact.mobile,
        fax=contact.fax,
        title=contact.title,
        department=contact.department,
        mailing_street=contact.mailing_street,
        mailing_city=contact.mailing_city,
        mailing_state=contact.mailing_state,
        mailing_zip=contact.mailing_zip,
        mailing_country=contact.mailing_country,
        other_street=contact.other_street,
        other_city=contact.other_city,
        other_state=contact.other_state,
        other_zip=contact.other_zip,
        other_country=contact.other_country,
        description=contact.description,
        assistant=contact.assistant,
        assistant_phone=contact.assistant_phone,
        account_id=str(contact.account_id) if contact.account_id else None,
        tenant_id=str(contact.tenant_id),
        owner_id=str(contact.owner_id),
        owner_name=owner_name,
        created_by=str(contact.created_by),
        created_by_name=created_by_name,
        last_modified_by_id=str(contact.last_modified_by_id) if contact.last_modified_by_id else None,
        last_modified_by_name=last_modified_by_name,
        view_count=contact.view_count,
        is_favorite=contact.is_favorite,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
        deleted_at=contact.deleted_at,
        full_name=contact.full_name,  # Add the computed full_name property
        industry_data=getattr(contact, 'industry_data', {})
    )

@router.get("/form-data")
async def get_contact_form_data(current_user: User = Depends(get_current_user)):
    """Get metadata for contact creation/editing forms"""
    from app.models.account import Account
    
    accounts = await Account.find({
        "tenant_id": current_user.tenant_id,
        "deleted_at": None
    }).sort("+name").to_list()
    
    users = await User.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+name").to_list()
    
    return {
        "accounts": [{"id": str(a.id), "name": a.name} for a in accounts],
        "users": [{"id": str(u.id), "name": u.name} for u in users]
    }


@router.post("/", response_model=ContactResponse, status_code=201)
async def create_contact(
    contact_data: ContactCreate,
    current_user: User = Depends(check_permission("create_contact"))
):
    """Create a new contact"""
    import logging
    from app.models.account import Account
    from bson.errors import InvalidId
    logger = logging.getLogger(__name__)

    try:
        # Validate account_id resolves to a valid account
        try:
            acc_id = ObjectId(contact_data.account_id)
        except InvalidId:
            raise HTTPException(status_code=422, detail="Invalid account_id format")

        account = await Account.find_one(
            {"_id": acc_id, "tenant_id": current_user.tenant_id, "deleted_at": None}
        )
        if not account:
            raise HTTPException(status_code=422, detail="account_id does not resolve to a valid account")

        # Resolve tenant industry — resolver raises if tenant missing
        from app.services.industry_service import get_tenant_industry
        industry = await get_tenant_industry(current_user.tenant_id)
        contact_data.industry_data = validate_industry_data(
            industry=industry,
            data=contact_data.industry_data or {},
            mode="contact"
        )

        service = ContactService()
        contact = await service.create_contact(
            contact_data,
            current_user.id,
            current_user.tenant_id,
            custom_fields=getattr(contact_data, "custom_fields", None),
        )
        
        from app.core.cache import invalidate_tenant_cache
        await invalidate_tenant_cache(str(current_user.tenant_id))
        
        return contact_to_response(contact)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error creating contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating contact: {str(e)}")


@router.get("/", response_model=dict)
async def get_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    owner_id: Optional[str] = None,
    current_user: User = Depends(check_permission("view_contact"))
):
    """Get all contacts with pagination"""
    import asyncio
    import logging
    logger = logging.getLogger(__name__)
    try:
        from app.services.visibility_scope import get_visible_owner_ids
        service = ContactService()
        
        # Build query
        query = {
            "tenant_id": current_user.tenant_id,
            "deleted_at": None
        }
        # --- Data visibility scoping (owner + hierarchy) ---
        visible_owner_ids = await get_visible_owner_ids(current_user)
        
        if owner_id:
            try:
                requested_oid = ObjectId(owner_id)
                if visible_owner_ids is not None and requested_oid not in visible_owner_ids:
                    # User is requested an owner they can't see — force an impossible match
                    query["_id"] = ObjectId() 
                else:
                    query["owner_id"] = requested_oid
            except Exception:
                query["_id"] = ObjectId() # Invalid format
        elif visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}

        # Run count and paginated fetch in parallel
        skip = (page - 1) * per_page

        total, contacts, users = await asyncio.gather(
            Contact.find(query).count(),
            Contact.find(query).sort("-updated_at").skip(skip).limit(per_page).to_list(),
            User.find(
                {"tenant_id": current_user.tenant_id, "is_active": True}
            ).sort("+name").to_list(),
        )

        pages = (total + per_page - 1) // per_page
        
        # Batch fetch accounts for the page of contacts
        from app.models.account import Account
        account_ids = [c.account_id for c in contacts if c.account_id]
        accounts = []
        if account_ids:
            accounts = await Account.find({"_id": {"$in": account_ids}}).to_list()
        
        # Map account ID to name
        account_map = {a.id: a.name for a in accounts}
        # Map owner (user) ID to name so each row can show its owner
        user_name_map = {str(u.id): u.name for u in users}

        # Prepare response
        contact_responses = []
        for c in contacts:
            resp = contact_to_response(c)
            if c.account_id and c.account_id in account_map:
                resp.account_name = account_map[c.account_id]
            resp.owner_name = user_name_map.get(str(c.owner_id))
            contact_responses.append(resp)
        
        return {
            "contacts": [c.model_dump() for c in contact_responses],
            "pagination": {
                "current_page": page,
                "total": total,
                "per_page": per_page,
                "pages": pages
            },
            "users": [
                {"id": str(u.id), "name": u.name, "email": u.email}
                for u in users
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching contacts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching contacts: {str(e)}")



@router.get("/search")
async def search_contacts(
    query: Optional[str] = None,
    account_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(check_permission("view_contact"))
):
    """Search contacts"""
    from app.services.visibility_scope import get_visible_owner_ids
    service = ContactService()
    
    skip = (page - 1) * per_page
    visible_owner_ids = await get_visible_owner_ids(current_user)
    contacts, total = await service.search_contacts(
        query,
        current_user.tenant_id,
        account_id=account_id,
        skip=skip,
        limit=per_page,
        visible_owner_ids=visible_owner_ids
    )
    
    return {
        "contacts": [contact_to_response(c) for c in contacts],
        "total": total
    }


@router.get("/{contact_id}", response_model=ContactDetailResponse)
async def get_contact(
    contact_id: str,
    current_user: User = Depends(check_permission("view_contact"))
):
    """Get contact by ID with related records"""
    from app.services.visibility_scope import get_visible_owner_ids
    service = ContactService()
    contact_data = await service.get_contact_with_relations(contact_id, current_user.tenant_id)
    
    if not contact_data:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Visibility check
    visible_owner_ids = await get_visible_owner_ids(current_user)
    contact_owner = contact_data.get("owner_id") if isinstance(contact_data, dict) else getattr(contact_data, "owner_id", None)
    if visible_owner_ids is not None and contact_owner:
        owner_oid = ObjectId(contact_owner) if isinstance(contact_owner, str) else contact_owner
        if owner_oid not in visible_owner_ids:
            raise HTTPException(status_code=404, detail="Contact not found")
    
    # Track view
    await service._track_user_view(
        current_user.id,
        ObjectId(contact_id),
        current_user.tenant_id
    )
    
    # Increment view count — tenant-scoped lookup
    try:
        _cid = ObjectId(contact_id)
        contact = await Contact.find_one(
            {"_id": _cid, "tenant_id": current_user.tenant_id, "deleted_at": None}
        )
    except Exception:
        contact = None
    if contact:
        await contact.increment_view_count()

    # Sprint D — populate custom_fields
    try:
        from app.services import field_registry_service
        cf = await field_registry_service.read_custom_field_values(
            "contact", ObjectId(contact_id), current_user.tenant_id,
        )
        if isinstance(contact_data, dict):
            contact_data["custom_fields"] = cf
        else:
            try:
                contact_data.custom_fields = cf
            except Exception:
                pass
    except Exception:
        pass

    return contact_data


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    current_user: User = Depends(check_permission("edit_contact"))
):
    """Update a contact"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    service = ContactService()
    
    # Visibility pre-check
    existing = await service.get_contact_with_relations(contact_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    contact_owner = existing.get("owner_id") if isinstance(existing, dict) else getattr(existing, "owner_id", None)
    if not is_record_visible(ObjectId(contact_owner), visible_owner_ids):
        raise HTTPException(status_code=404, detail="Contact not found")
        
    if contact_data.industry_data is not None:
        from app.services.industry_service import get_tenant_industry
        industry = await get_tenant_industry(current_user.tenant_id)
        contact_data.industry_data = validate_industry_data(
            industry=industry,
            data=contact_data.industry_data,
            mode="contact"
        )

    contact = await service.update_contact(
        contact_id,
        contact_data,
        current_user.id,
        current_user.tenant_id,
        custom_fields=getattr(contact_data, "custom_fields", None),
    )
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    from app.core.cache import invalidate_tenant_cache
    await invalidate_tenant_cache(str(current_user.tenant_id))
    
    return contact_to_response(contact)


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: str,
    current_user: User = Depends(check_permission("delete_contact"))
):
    """Delete a contact (soft delete)"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    service = ContactService()
    
    # Visibility pre-check
    existing = await service.get_contact_with_relations(contact_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    contact_owner = existing.get("owner_id") if isinstance(existing, dict) else getattr(existing, "owner_id", None)
    if not is_record_visible(ObjectId(contact_owner), visible_owner_ids):
        raise HTTPException(status_code=404, detail="Contact not found")
        
    success = await service.delete_contact(contact_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    from app.core.cache import invalidate_tenant_cache
    await invalidate_tenant_cache(str(current_user.tenant_id))
    
    return {
        "error": False,
        "message": "Contact deleted successfully"
    }


@router.post("/{contact_id}/change-owner")
async def change_contact_owner(
    contact_id: str,
    owner_change: ContactOwnerChange,
    current_user: User = Depends(check_permission("edit_contact"))
):
    """Change contact owner"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    service = ContactService()
    
    # Visibility pre-check
    existing = await service.get_contact_with_relations(contact_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    contact_owner = existing.get("owner_id") if isinstance(existing, dict) else getattr(existing, "owner_id", None)
    if not is_record_visible(ObjectId(contact_owner), visible_owner_ids):
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact = await service.change_owner(
        contact_id,
        ObjectId(owner_change.new_owner_id),
        current_user.id,
        current_user.tenant_id
    )
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {
        "error": False,
        "message": "Contact ownership updated successfully",
        "contact": contact_to_response(contact)
    }


@router.post("/{contact_id}/link-account")
async def link_contact_to_account(
    contact_id: str,
    account_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_contact"))
):
    """Link contact to an account"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    service = ContactService()
    
    # Visibility pre-check
    existing = await service.get_contact_with_relations(contact_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    contact_owner = existing.get("owner_id") if isinstance(existing, dict) else getattr(existing, "owner_id", None)
    if not is_record_visible(ObjectId(contact_owner), visible_owner_ids):
        raise HTTPException(status_code=404, detail="Contact not found")
        
    try:
        await service.link_to_account(
            contact_id,
            account_id,
            current_user.tenant_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "error": False,
        "message": "Contact linked to account successfully"
    }


@router.delete("/{contact_id}/unlink-account")
async def unlink_contact_from_account(
    contact_id: str,
    account_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_contact"))
):
    """Unlink contact from an account"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    service = ContactService()
    
    # Visibility pre-check
    existing = await service.get_contact_with_relations(contact_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    contact_owner = existing.get("owner_id") if isinstance(existing, dict) else getattr(existing, "owner_id", None)
    if not is_record_visible(ObjectId(contact_owner), visible_owner_ids):
        raise HTTPException(status_code=404, detail="Contact not found")
        
    try:
        await service.unlink_from_account(contact_id, account_id, current_user.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "error": False,
        "message": "Contact unlinked from account successfully"
    }
