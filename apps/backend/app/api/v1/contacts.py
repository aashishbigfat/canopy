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
    ContactDetailResponse
)
from app.services.contact_service import ContactService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

def contact_to_response(contact: Contact) -> ContactResponse:
    """Convert Contact model to ContactResponse with proper string conversion"""
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
        created_by=str(contact.created_by),
        created_by_name=getattr(contact, 'created_by_name', None),
        last_modified_by_id=str(contact.last_modified_by_id) if contact.last_modified_by_id else None,
        last_modified_by_name=getattr(contact, 'last_modified_by_name', None),
        view_count=contact.view_count,
        is_favorite=contact.is_favorite,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
        deleted_at=contact.deleted_at,
        full_name=contact.full_name  # Add the computed full_name property
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

        account = await Account.get(acc_id)
        if not account or account.tenant_id != current_user.tenant_id or account.deleted_at:
            raise HTTPException(status_code=422, detail="account_id does not resolve to a valid account")

        service = ContactService()
        contact = await service.create_contact(
            contact_data,
            current_user.id,
            current_user.tenant_id
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
    current_user: User = Depends(get_current_user)
):
    """Get all contacts with pagination"""
    import asyncio
    import logging
    logger = logging.getLogger(__name__)
    try:
        service = ContactService()
        
        # Build query
        query = {
            "tenant_id": current_user.tenant_id,
            "deleted_at": None
        }
        if owner_id:
            query["owner_id"] = ObjectId(owner_id)

        # Run count and paginated fetch in parallel
        skip = (page - 1) * per_page

        total, contacts, users = await asyncio.gather(
            Contact.find(query).count(),
            Contact.find(query).sort("-updated_at").skip(skip).limit(per_page).to_list(),
            User.find(
                User.tenant_id == current_user.tenant_id,
                User.is_active == True
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
        
        # Prepare response
        contact_responses = []
        for c in contacts:
            resp = contact_to_response(c)
            if c.account_id and c.account_id in account_map:
                resp.account_name = account_map[c.account_id]
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
    service = ContactService()
    
    skip = (page - 1) * per_page
    contacts, total = await service.search_contacts(
        query,
        current_user.tenant_id,
        account_id=account_id,
        skip=skip,
        limit=per_page
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
    service = ContactService()
    contact_data = await service.get_contact_with_relations(contact_id, current_user.tenant_id)
    
    if not contact_data:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Track view
    await service._track_user_view(
        current_user.id,
        ObjectId(contact_id),
        current_user.tenant_id
    )
    
    # Increment view count
    contact = await Contact.get(ObjectId(contact_id))
    if contact:
        await contact.increment_view_count()
            
    return contact_data


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    current_user: User = Depends(check_permission("edit_contact"))
):
    """Update a contact"""
    service = ContactService()
    contact = await service.update_contact(
        contact_id,
        contact_data,
        current_user.id,
        current_user.tenant_id
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
    service = ContactService()
    success = await service.delete_contact(contact_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    from app.core.cache import invalidate_tenant_cache
    await invalidate_tenant_cache(str(current_user.tenant_id))
    
    return {
        "error": False,
        "message": "Contact deleted successfully"
    }


@router.post("/change-owner")
async def change_contact_owner(
    contact_id: str = Query(...),
    new_owner_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_contact"))
):
    """Change contact owner"""
    service = ContactService()
    
    contact = await service.change_owner(
        contact_id,
        ObjectId(new_owner_id),
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
    service = ContactService()
    await service.link_to_account(
        contact_id,
        account_id,
        current_user.tenant_id
    )
    
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
    service = ContactService()
    await service.unlink_from_account(contact_id, account_id)
    
    return {
        "error": False,
        "message": "Contact unlinked from account successfully"
    }
