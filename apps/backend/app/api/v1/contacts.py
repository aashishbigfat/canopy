"""
Contact API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from bson import ObjectId

from app.models.user import User
from app.models.contact import Contact
from app.schemas.contact import (
    ContactCreate, ContactUpdate, ContactResponse, ContactListResponse
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
        last_modified_by_id=str(contact.last_modified_by_id) if contact.last_modified_by_id else None,
        view_count=contact.view_count,
        is_favorite=contact.is_favorite,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
        deleted_at=contact.deleted_at,
        full_name=contact.full_name  # Add the computed full_name property
    )

@router.post("/", response_model=ContactResponse, status_code=201)
async def create_contact(
    contact_data: ContactCreate,
    current_user: User = Depends(check_permission("create_contact"))
):
    """Create a new contact"""
    service = ContactService()
    contact = await service.create_contact(
        contact_data,
        current_user.id,
        current_user.tenant_id
    )
    
    return contact_to_response(contact)


@router.get("/", response_model=dict)
async def get_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    owner_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all contacts with pagination"""
    try:
        print("DEBUG: Entering get_contacts")
        # from app.models.user_contact_view import UserContactView
        
        service = ContactService()
        
        # Simplified logic: SKIP UserContactView for now
        recent_contact_ids = []
        
        print("DEBUG: Fetching all contacts...")
        # Fetch all contacts directly
        all_contacts = await Contact.find(
            Contact.tenant_id == current_user.tenant_id,
            Contact.deleted_at == None
        ).sort("-updated_at").to_list()
        
        print(f"DEBUG: Found {len(all_contacts)} contacts")
        
        # Paginate
        total = len(all_contacts)
        skip = (page - 1) * per_page
        contacts = all_contacts[skip:skip + per_page]
        pages = (total + per_page - 1) // per_page
        
        # Get users for owner selection
        users = await User.find(
            User.tenant_id == current_user.tenant_id,
            User.is_active == True
        ).sort("+name").to_list()
        
        return {
            "contacts": [
                {
                    "id": str(c.id),
                    "salutation": c.salutation,
                    "first_name": c.first_name,
                    "middle_name": c.middle_name,
                    "last_name": c.last_name,
                    "full_name": c.full_name,
                    "email": c.email,
                    "phone": c.phone,
                    "mobile": c.mobile,
                    "fax": c.fax,
                    "title": c.title,
                    "department": c.department,
                    "mailing_street": c.mailing_street,
                    "mailing_city": c.mailing_city,
                    "mailing_state": c.mailing_state,
                    "mailing_zip": c.mailing_zip,
                    "mailing_country": c.mailing_country,
                    "other_street": c.other_street,
                    "other_city": c.other_city,
                    "other_state": c.other_state,
                    "other_zip": c.other_zip,
                    "other_country": c.other_country,
                    "description": c.description,
                    "assistant": c.assistant,
                    "assistant_phone": c.assistant_phone,
                    "account_id": str(c.account_id) if c.account_id else None,
                    "tenant_id": str(c.tenant_id),
                    "owner_id": str(c.owner_id),
                    "created_by": str(c.created_by),
                    "view_count": c.view_count,
                    "created_at": c.created_at,
                    "updated_at": c.updated_at
                }
                for c in contacts
            ],
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
        import traceback
        print(f"Error in get_contacts: {str(e)}")
        print(traceback.format_exc())
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


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    current_user: User = Depends(check_permission("view_contact"))
):
    """Get contact by ID"""
    service = ContactService()
    contact = await service.get_contact(contact_id, current_user.tenant_id)
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Track view
    await service._track_user_view(
        current_user.id,
        contact.id,
        current_user.tenant_id
    )
    
    # Increment view count
    await contact.increment_view_count()
    
    return contact_to_response(contact)


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
