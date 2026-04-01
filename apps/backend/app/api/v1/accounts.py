"""
Account API endpoints matching Laravel RestAccountController
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from beanie import PydanticObjectId
from bson import ObjectId

from app.models.user import User
from app.models.account import Account
from app.schemas.account import (
    AccountCreate, AccountUpdate, AccountResponse,
    AccountListResponse, AccountOwnerChange, AccountSearch
)
from app.services.account_service import AccountService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

def account_to_response(account: Account) -> AccountResponse:
    """Convert Account model to AccountResponse with proper string conversion"""
    return AccountResponse(
        id=str(account.id),
        name=account.name,
        email=account.email,
        phone=account.phone,
        website=account.website,
        description=account.description,
        is_person_account=account.is_person_account,
        salutation=account.salutation,
        first_name=account.first_name,
        last_name=account.last_name,
        billing_street=account.billing_street,
        billing_city=account.billing_city,
        billing_state=account.billing_state,
        billing_zip=account.billing_zip,
        billing_country=account.billing_country,
        shipping_street=account.shipping_street,
        shipping_city=account.shipping_city,
        shipping_state=account.shipping_state,
        shipping_zip=account.shipping_zip,
        shipping_country=account.shipping_country,
        acc_type_id=str(account.acc_type_id) if account.acc_type_id else None,
        account_type_name=getattr(account, 'account_type_name', None),
        acc_parent_id=str(account.acc_parent_id) if account.acc_parent_id else None,
        industry_id=str(account.industry_id) if account.industry_id else None,
        rating_id=str(account.rating_id) if account.rating_id else None,
        tenant_id=str(account.tenant_id),
        owner_id=str(account.owner_id),
        created_by=str(account.created_by),
        created_by_name=getattr(account, 'created_by_name', None),
        last_modified_by_id=str(account.last_modified_by_id) if account.last_modified_by_id else None,
        last_modified_by_name=getattr(account, 'last_modified_by_name', None),
        view_count=account.view_count,
        is_favorite=account.is_favorite,
        created_at=account.created_at,
        updated_at=account.updated_at,
        deleted_at=account.deleted_at
    )

@router.get("/form-data")
async def get_account_form_data(current_user: User = Depends(get_current_user)):
    """Get metadata for account creation/editing forms"""
    from app.models.picklists import Industry, Rating, AccountType
    
    industries = await Industry.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+sorting").to_list()
    
    ratings = await Rating.find({
        "is_active": True
    }).sort("+sorting").to_list()
    
    acc_types = await AccountType.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+sorting").to_list()
    
    users = await User.find({
        "tenant_id": current_user.tenant_id,
        "is_active": True
    }).sort("+name").to_list()
    
    parent_accounts = await Account.find({
        "tenant_id": current_user.tenant_id,
        "is_person_account": False,
        "deleted_at": None
    }).sort("+name").limit(100).to_list()
    
    return {
        "industries": [{"id": str(i.id), "name": i.name} for i in industries],
        "ratings": [{"id": str(r.id), "name": r.name} for r in ratings],
        "account_types": [{"id": str(t.id), "name": t.name} for t in acc_types],
        "users": [{"id": str(u.id), "name": u.name} for u in users],
        "parent_accounts": [{"id": str(a.id), "name": a.name} for a in parent_accounts],
        "current_user_name": current_user.name
    }


import logging
logger = logging.getLogger(__name__)

@router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(check_permission("create_account"))
):
    """Create a new account"""
    try:
        service = AccountService()
        account = await service.create_account(
            account_data,
            current_user.id,
            current_user.tenant_id
        )
        
        from app.core.cache import invalidate_tenant_cache
        await invalidate_tenant_cache(str(current_user.tenant_id))
        
        return account_to_response(account)
    except Exception as e:
        logger.error(f"Error creating account: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating account: {str(e)}")


@router.get("/", response_model=dict)
async def get_accounts(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    owner_id: Optional[str] = None,
    is_person_account: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all accounts with pagination, views, and columns"""
    try:
        import asyncio
        from app.models.user_account_view import UserAccountView
        from app.models.account_views import AccountView, AccountColumn, AccountPinView
        from app.models.picklists import Industry, Rating, AccountType
        
        # Base query
        query = {
            "tenant_id": current_user.tenant_id,
            "deleted_at": None
        }
        
        if is_person_account is not None:
            query["is_person_account"] = is_person_account

        # --- Server-side pagination (no full-collection load) ---
        skip = (page - 1) * per_page

        # Run total count, paginated accounts fetch, and all metadata queries in parallel
        (
            total,
            accounts,
            account_views,
            users,
            industries,
            ratings,
            acc_types,
        ) = await asyncio.gather(
            # 1. Total count
            Account.find(query).count(),
            # 2. Paginated accounts (sorted by most-recently-updated)
            Account.find(query).sort("-updated_at").skip(skip).limit(per_page).to_list(),
            # 3. Account views
            AccountView.find({
                "tenant_id": current_user.tenant_id,
                "$or": [
                    {"created_by": current_user.id},
                    {"public_view": True}
                ]
            }).to_list(),
            # 4. Users for owner selection
            User.find({
                "tenant_id": current_user.tenant_id,
                "is_active": True
            }).sort("+name").to_list(),
            # 5. Industries
            Industry.find({
                "tenant_id": current_user.tenant_id,
                "is_active": True
            }).sort("+sorting").to_list(),
            # 6. Ratings
            Rating.find({
                "is_active": True
            }).sort("+sorting").to_list(),
            # 7. Account types
            AccountType.find({
                "tenant_id": current_user.tenant_id,
                "is_active": True
            }).sort("+sorting").to_list(),
        )

        pages = (total + per_page - 1) // per_page
        
        # Build lookup maps
        user_map = {str(u.id): u.name for u in users}
        acc_type_map = {str(t.id): t.name for t in acc_types}
        
        # Get default columns - temporarily return empty list to avoid ObjectId/int mismatch
        display_columns = []
        
        return {
            "accounts": [
                {
                    "id": str(acc.id),
                    "name": acc.name,
                    "email": acc.email,
                    "phone": acc.phone,
                    "salutation": acc.salutation,
                    "first_name": acc.first_name,
                    "last_name": acc.last_name,
                    "website": acc.website,
                    "description": acc.description,
                    "is_person_account": acc.is_person_account,
                    "billing_street": acc.billing_street,
                    "billing_city": acc.billing_city,
                    "billing_state": acc.billing_state,
                    "billing_zip": acc.billing_zip,
                    "billing_country": acc.billing_country,
                    "shipping_street": acc.shipping_street,
                    "shipping_city": acc.shipping_city,
                    "shipping_state": acc.shipping_state,
                    "shipping_zip": acc.shipping_zip,
                    "shipping_country": acc.shipping_country,
                    "acc_type_id": str(acc.acc_type_id) if acc.acc_type_id else None,
                    "account_type_name": acc_type_map.get(str(acc.acc_type_id)) if acc.acc_type_id else None,
                    "acc_parent_id": str(acc.acc_parent_id) if acc.acc_parent_id else None,
                    "industry_id": str(acc.industry_id) if acc.industry_id else None,
                    "rating_id": str(acc.rating_id) if acc.rating_id else None,
                    "tenant_id": str(acc.tenant_id),
                    "owner_id": str(acc.owner_id),
                    "owner_name": user_map.get(str(acc.owner_id)),
                    "created_by": str(acc.created_by),
                    "last_modified_by_id": str(acc.last_modified_by_id) if acc.last_modified_by_id else None,
                    "view_count": acc.view_count,
                    "is_favorite": acc.is_favorite,
                    "created_at": acc.created_at,
                    "updated_at": acc.updated_at,
                    "deleted_at": acc.deleted_at
                }
                for acc in accounts
            ],
            "pagination": {
                "current_page": page,
                "total": total,
                "per_page": per_page,
                "pages": pages
            },
            "account_views": [
                {
                    "id": str(v.id),
                    "name": v.name,
                    "public_view": v.public_view,
                    "created_at": v.created_at.strftime("%Y-%m-%d")
                } for v in account_views
            ],
            "display_columns": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "alias_name": c.alias_name,
                    "editable_flag": c.editable_flag
                } for c in display_columns
            ],
            "users": [
                {"id": str(u.id), "name": u.name, "email": u.email}
                for u in users
            ],
            "industries": [
                {"id": str(i.id), "name": i.name}
                for i in industries
            ],
            "ratings": [
                {"id": str(r.id), "name": r.name}
                for r in ratings
            ]
        }
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_accounts: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error fetching accounts: {str(e)}")



@router.get("/search", response_model=List[AccountResponse])
async def search_accounts(
    query: Optional[str] = None,
    acc_type_id: Optional[str] = None,
    industry_id: Optional[str] = None,
    rating_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    billing_country: Optional[str] = None,
    billing_state: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(check_permission("view_account"))
):
    """Search accounts with filters"""
    service = AccountService()
    
    search_params = AccountSearch(
        query=query,
        acc_type_id=acc_type_id,
        industry_id=industry_id,
        rating_id=rating_id,
        owner_id=owner_id,
        billing_country=billing_country,
        billing_state=billing_state
    )
    
    skip = (page - 1) * per_page
    accounts, total = await service.search_accounts(
        search_params,
        current_user.tenant_id,
        skip=skip,
        limit=per_page
    )
    
    return [account_to_response(acc) for acc in accounts]


@router.get("/search-email")
async def search_account_by_email(
    s: str = Query(..., description="Search term"),
    current_user: User = Depends(get_current_user)
):
    """Search accounts by email for email selection (autocomplete)"""
    accounts = await Account.find({
        "tenant_id": current_user.tenant_id,
        "email": {"$regex": s, "$options": "i"},
        "deleted_at": None
    }).limit(10).to_list()
    
    return {
        "error": False,
        "accounts": [
            {"id": str(acc.id), "name": acc.name, "email": acc.email}
            for acc in accounts
        ]
    }


@router.get("/search-account")
async def search_account_autocomplete(
    s: str = Query(..., description="Search term"),
    is_person_account: Optional[bool] = Query(None, description="Filter by person account status"),
    current_user: User = Depends(get_current_user)
):
    """Search accounts by name (autocomplete)"""
    query: dict = {
        "tenant_id": current_user.tenant_id,
        "name": {"$regex": s, "$options": "i"},
        "deleted_at": None
    }
    if is_person_account is not None:
        query["is_person_account"] = is_person_account
        
    accounts = await Account.find(query).limit(10).to_list()
    
    return {
        "error": False,
        "accounts": [
            {"id": str(acc.id), "name": acc.name, "is_person_account": acc.is_person_account}
            for acc in accounts
        ]
    }


@router.get("/parent-accounts")
async def get_parent_accounts(
    current_user: User = Depends(get_current_user)
):
    """Get accounts that can be parents"""
    service = AccountService()
    accounts = await service.get_parent_accounts(current_user.tenant_id)
    
    return {
        "error": False,
        "accounts": [
            {"id": str(acc.id), "name": acc.name}
            for acc in accounts
        ]
    }


@router.get("/{account_id}")
async def get_account(
    account_id: str,
    include_related: bool = Query(False, description="Include related contacts, opportunities, and tasks"),
    current_user: User = Depends(check_permission("view_account"))
):
    """Get account by ID, optionally with related records"""
    service = AccountService()
    
    if include_related:
        # Get account with all related records
        account_data = await service.get_account_with_relations(account_id, current_user.tenant_id)
        
        if not account_data:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Track view
        await service._track_user_view(
            current_user.id,
            ObjectId(account_id),
            current_user.tenant_id
        )
        
        return account_data
    else:
        # Get basic account
        account = await service.get_account(account_id, current_user.tenant_id)
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Track view
        await service._track_user_view(
            current_user.id,
            account.id,
            current_user.tenant_id
        )
        
        # Increment view count
        await account.increment_view_count()
        
        return account_to_response(account)


@router.get("/{account_id}/address-to-contact")
async def get_account_address_for_contact(
    account_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get account address fields for copying to contact"""
    account = await Account.get(PydanticObjectId(account_id))
    
    if not account or account.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {
        "error": False,
        "account": {
            "id": str(account.id),
            "name": account.name,
            "billing_country": account.billing_country,
            "billing_state": account.billing_state,
            "billing_city": account.billing_city,
            "billing_street": account.billing_street,
            "billing_zip": account.billing_zip
        }
    }


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account_data: AccountUpdate,
    current_user: User = Depends(check_permission("edit_account"))
):
    """Update an account"""
    try:
        service = AccountService()
        account = await service.update_account(
            account_id,
            account_data,
            current_user.id,
            current_user.tenant_id
        )
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        from app.core.cache import invalidate_tenant_cache
        await invalidate_tenant_cache(str(current_user.tenant_id))
        
        return account_to_response(account)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    current_user: User = Depends(check_permission("delete_account"))
):
    """Delete an account (soft delete)"""
    service = AccountService()
    success = await service.delete_account(account_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Account not found")
    
    from app.core.cache import invalidate_tenant_cache
    await invalidate_tenant_cache(str(current_user.tenant_id))
    
    return {
        "error": False,
        "message": "Account deleted successfully"
    }


@router.post("/change-owner")
async def change_account_owner(
    owner_change: AccountOwnerChange,
    account_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_account"))
):
    """Change account owner"""
    service = AccountService()
    
    account = await service.change_owner(
        account_id,
        PydanticObjectId(owner_change.new_owner_id),
        current_user.id,
        current_user.tenant_id
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {
        "error": False,
        "message": "Account ownership updated successfully",
        "account": account_to_response(account)
    }


@router.post("/single-column")
async def update_single_column(
    account_id: str = Query(...),
    field_name: str = Query(...),
    field_value: str = Query(...),
    current_user: User = Depends(check_permission("edit_account"))
):
    """Update a single column of an account"""
    account = await Account.get(PydanticObjectId(account_id))
    
    if not account or account.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Update the field
    if hasattr(account, field_name):
        setattr(account, field_name, field_value)
        account.last_modified_by_id = current_user.id
        await account.save()
        
        return {
            "error": False,
            "message": f"{field_name} updated successfully",
            "account": account_to_response(account)
        }
    else:
        raise HTTPException(status_code=400, detail=f"Invalid field: {field_name}")
