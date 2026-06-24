"""
Account API endpoints matching Laravel RestAccountController
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from beanie import PydanticObjectId
from bson import ObjectId
from pydantic import BaseModel

from app.models.user import User
from app.models.account import Account
from app.schemas.account import (
    AccountCreate, AccountUpdate, AccountResponse,
    AccountListResponse, AccountOwnerChange, AccountSearch, AccountMerge
)
from app.services.account_service import AccountService
from app.api.deps import get_current_user, check_permission
from app.models.tenant import Tenant
from app.core.industry_guard import resolve_industry_data
from app.services.directory_cache import get_active_users

router = APIRouter()

def account_to_response(account: Account) -> AccountResponse:
    """Convert Account model to AccountResponse with proper string conversion and name enrichment"""
    # Try to get names from the object (if they were populated by the service)
    # Fallback to None if not present
    owner_name = getattr(account, 'owner_name', None)
    created_by_name = getattr(account, 'created_by_name', None)
    last_modified_by_name = getattr(account, 'last_modified_by_name', None)
    account_type_name = getattr(account, 'account_type_name', None)
    category_name = getattr(account, 'category_name', None)

    return AccountResponse(
        id=str(account.id),
        name=account.name,
        email=account.email,
        phone=account.phone,
        mobile=getattr(account, "mobile", None),
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
        account_type_name=account_type_name,
        acc_parent_id=str(account.acc_parent_id) if account.acc_parent_id else None,
        industry_id=str(account.industry_id) if account.industry_id else None,
        category_id=str(account.category_id) if getattr(account, 'category_id', None) else None,
        category_name=category_name,
        tenant_id=str(account.tenant_id),
        owner_id=str(account.owner_id),
        owner_name=owner_name,
        created_by=str(account.created_by),
        created_by_name=created_by_name,
        last_modified_by_id=str(account.last_modified_by_id) if account.last_modified_by_id else None,
        last_modified_by_name=last_modified_by_name,
        view_count=account.view_count,
        is_favorite=account.is_favorite,
        created_at=account.created_at,
        updated_at=account.updated_at,
        deleted_at=account.deleted_at,
        industry_data=getattr(account, 'industry_data', {})
    )

# Fields on the Account model that hold ObjectId references.
_VIEW_OBJECTID_FIELDS = {
    "owner_id", "acc_type_id", "acc_parent_id", "industry_id", "category_id",
    "territory_state_id", "territory_country_id", "territory_id",
    "region_id", "bd_owner_id", "reporting_manager_id",
    "created_by", "last_modified_by_id",
}
_VIEW_BOOL_FIELDS = {"is_person_account", "is_favorite"}
# Free-text fields matched case-insensitively as "contains".
_VIEW_STRING_FIELDS = {
    "name", "email", "phone", "website", "segment", "first_name", "last_name",
    "billing_street", "billing_city", "billing_state", "billing_zip", "billing_country",
    "shipping_street", "shipping_city", "shipping_state", "shipping_zip", "shipping_country",
}


def _coerce_bool(value) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        if value.lower() in ("true", "1", "yes"):
            return True
        if value.lower() in ("false", "0", "no"):
            return False
    return None


def _view_condition_for_field(field: str, value) -> Optional[dict]:
    """Translate a single saved-view filter entry into a Mongo condition.

    Returns None when the value is empty/unrecognized so the filter is skipped
    rather than producing an impossible-match query.
    """
    # Unwrap operator-style values like {"value": "Agra"} or {"values": [...]}.
    if isinstance(value, dict):
        value = value.get("value", value.get("values"))

    if value is None or value == "" or value == []:
        return None

    try:
        if field in _VIEW_OBJECTID_FIELDS:
            if isinstance(value, (list, tuple)):
                oids = [ObjectId(v) for v in value if ObjectId.is_valid(str(v))]
                return {field: {"$in": oids}} if oids else None
            return {field: ObjectId(value)} if ObjectId.is_valid(str(value)) else None

        if field in _VIEW_BOOL_FIELDS:
            b = _coerce_bool(value)
            return {field: b} if b is not None else None

        if field in _VIEW_STRING_FIELDS:
            import re as _re
            if isinstance(value, (list, tuple)):
                patterns = [
                    {field: {"$regex": _re.compile(f".*{_re.escape(str(v))}.*", _re.IGNORECASE)}}
                    for v in value if str(v).strip()
                ]
                return {"$or": patterns} if patterns else None
            return {field: {"$regex": _re.compile(f".*{_re.escape(str(value))}.*", _re.IGNORECASE)}}
    except Exception:
        return None

    # Unknown field -> ignore (don't apply raw user data to the query).
    return None


def translate_account_view_filters(filters: dict) -> List[dict]:
    """Turn a saved AccountView.filters dict into a list of Mongo conditions.

    The returned clauses are meant to be ANDed into the base query, so existing
    tenant + data-visibility scoping is always preserved.
    """
    clauses: List[dict] = []
    for raw_key, raw_val in (filters or {}).items():
        cond = _view_condition_for_field(str(raw_key), raw_val)
        if cond:
            clauses.append(cond)
    return clauses


@router.get("/form-data")
async def get_account_form_data(current_user: User = Depends(get_current_user)):
    """Get metadata for account creation/editing forms.
    
    Account types are industry-scoped in the multi-industry architecture.
    Only types matching the tenant's industry (or global types with
    industry=None) are returned.
    """
    from app.models.picklists import Industry, AccountType, AccountSource, AccountCategory
    from app.models.tenant import Tenant
    from app.core.picklist_query import build_picklist_query, dedup_picklist_items

    # Resolve the tenant's industry so we can serve the right picklists
    tenant = await Tenant.get(current_user.tenant_id)
    tenant_industry = tenant.industry if tenant else None   # e.g. "travel"

    # Multi-tenant SaaS query: platform defaults + tenant overrides
    # picklist_type prevents cross-contamination in shared 'picklists' collection
    industries = dedup_picklist_items(await Industry.find(build_picklist_query(current_user.tenant_id, industry=tenant_industry, picklist_type="industry")).sort("+sorting").to_list())
    acc_types = dedup_picklist_items(await AccountType.find(build_picklist_query(current_user.tenant_id, industry=tenant_industry, picklist_type="account_type")).sort("+sorting").to_list())
    sources = dedup_picklist_items(await AccountSource.find(build_picklist_query(current_user.tenant_id, picklist_type="account_source")).sort("+sorting").to_list())
    categories = dedup_picklist_items(await AccountCategory.find(build_picklist_query(current_user.tenant_id, picklist_type="account_category")).sort("+sorting").to_list())

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
        "account_types": [{"id": str(t.id), "name": t.name} for t in acc_types],
        "sources": [{"id": str(s.id), "name": s.name} for s in sources],
        "categories": [{"id": str(c.id), "name": c.name} for c in categories],
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
        account_data.industry_data = await resolve_industry_data(
            current_user.tenant_id,
            account_data.industry_data or {},
            mode="account",
        )
        
        service = AccountService()
        account = await service.create_account(
            account_data,
            current_user.id,
            current_user.tenant_id,
            custom_fields=getattr(account_data, "custom_fields", None),
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
    acc_type_id: Optional[str] = None,
    billing_city: Optional[str] = None,
    is_person_account: Optional[bool] = None,
    search: Optional[str] = Query(None, description="Free-text search across name, email, phone, city"),
    view_id: Optional[str] = Query(None, description="Apply a saved AccountView's filters"),
    cursor: Optional[str] = Query(None, description="Keyset cursor for 'load more' — when set, returns the next page after this cursor and skips the COUNT (O(1) deep pagination)."),
    current_user: User = Depends(check_permission("view_account"))
):
    """Get all accounts with pagination, views, and columns"""
    # Validate the keyset cursor up-front (BEFORE the broad try/except, which
    # would otherwise swallow this HTTPException into a 500). A malformed/stale
    # cursor is a client error → 400, not a server error.
    if cursor is not None:
        from app.core.pagination import decode_cursor
        try:
            decode_cursor(cursor)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid pagination cursor")
    try:
        import asyncio
        from app.models.user_account_view import UserAccountView
        from app.models.account_views import AccountView, AccountColumn, AccountPinView
        from app.models.picklists import Industry, AccountType, AccountCategory
        from app.services.visibility_scope import get_visible_owner_ids
        from app.core.picklist_query import build_picklist_query, dedup_picklist_items
        from app.services.industry_service import get_tenant_industry, TenantNotFoundError

        # Resolve tenant industry for picklist scoping (cross-request cached —
        # avoids a ~one-RTT Tenant.get on every list request).
        try:
            tenant_industry = await get_tenant_industry(current_user.tenant_id)
        except TenantNotFoundError:
            tenant_industry = None
        # Base query
        query = {
            "tenant_id": current_user.tenant_id,
            "deleted_at": None
        }
        
        if is_person_account is not None:
            query["is_person_account"] = is_person_account

        # --- Free-text search across the visible columns ---
        if search and search.strip():
            import re as _re
            pattern = {"$regex": _re.compile(f".*{_re.escape(search.strip())}.*", _re.IGNORECASE)}
            query["$or"] = [
                {"name": pattern},
                {"email": pattern},
                {"phone": pattern},
                {"billing_city": pattern},
                {"billing_street": pattern},
            ]

        # --- Data visibility scoping (owner + hierarchy) ---
        visible_owner_ids = await get_visible_owner_ids(current_user)
        
        # If caller explicitly filters by owner_id, validate it's within their visibility
        if owner_id:
            try:
                requested_oid = ObjectId(owner_id)
                if visible_owner_ids is not None and requested_oid not in visible_owner_ids:
                    # User is requested an owner they can't see -- force an impossible match
                    query["_id"] = ObjectId() 
                else:
                    query["owner_id"] = requested_oid
            except Exception:
                query["_id"] = ObjectId() # Invalid format
        elif visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}

        # --- Structured filters from the Filter popover ---
        if acc_type_id and ObjectId.is_valid(acc_type_id):
            query["acc_type_id"] = ObjectId(acc_type_id)
        if billing_city and billing_city.strip():
            import re as _re
            query["billing_city"] = {
                "$regex": _re.compile(f".*{_re.escape(billing_city.strip())}.*", _re.IGNORECASE)
            }

        # --- Saved view filters (ANDed in; visibility scoping preserved) ---
        # Accounts now use the polymorphic EntityView system (entity_type
        # account / personal_account), like Contacts/Leads. The structured
        # filter_rules are translated by app.core.entity_filter with a strict
        # per-entity field whitelist.
        active_view = None
        view_entity_type = "personal_account" if is_person_account else "account"
        if view_id and ObjectId.is_valid(view_id):
            from app.models.entity_views import EntityView
            from app.core.entity_filter import build_filter_clauses

            active_view = await EntityView.find_one({
                "_id": ObjectId(view_id),
                "tenant_id": current_user.tenant_id,
                "entity_type": view_entity_type,
                "$or": [
                    {"created_by": current_user.id},
                    {"is_public": True},
                ],
            })
            if active_view:
                rules = getattr(active_view, "filter_rules", None) or []
                # Standard fields → whitelisted Mongo clauses (custom rules dropped here).
                view_clauses = build_filter_clauses(
                    view_entity_type,
                    rules,
                    scope=getattr(active_view, "scope", None),
                    current_user_id=current_user.id,
                )
                if view_clauses:
                    query.setdefault("$and", []).extend(view_clauses)
                # Custom/"additional:" fields → resolve matching ids from the
                # custom-value collection and AND them in (empty set ⇒ no match).
                from app.services.field_registry_service import match_custom_field_entity_ids
                for cr in rules:
                    if str(cr.get("field", "")).startswith("additional:"):
                        ids = await match_custom_field_entity_ids(view_entity_type, cr, current_user.tenant_id)
                        if ids is not None:  # None ⇒ unsupported op, skip (don't empty the result)
                            query.setdefault("$and", []).append({"_id": {"$in": ids}})

        # --- Server-side pagination (no full-collection load) ---
        skip = (page - 1) * per_page

        # Saved views are scoped to the list type (B2C person vs B2B company) so a
        # view saved on one list never leaks into the other. Legacy views without
        # the flag are treated as company views ($ne True matches missing + False).
        account_view_query: dict = {
            "tenant_id": current_user.tenant_id,
            "$or": [
                {"created_by": current_user.id},
                {"public_view": True},
            ],
        }
        if is_person_account is True:
            account_view_query["is_person_account"] = True
        elif is_person_account is False:
            account_view_query["is_person_account"] = {"$ne": True}

        # --- Page fetch: keyset "load more" when a cursor is given, else offset ---
        # Both orderings are (updated_at desc, _id desc) so the offset page-1 and
        # the keyset continuation share an exact, index-backed sort with no
        # duplicate/skipped rows at the page boundary.
        from app.core.pagination import keyset_page, encode_cursor

        async def _fetch_page():
            if cursor is not None:
                return await keyset_page(
                    Account, query, sort_field="updated_at",
                    direction="desc", limit=per_page, cursor=cursor,
                )
            rows = await Account.find(query).sort(
                [("updated_at", -1), ("_id", -1)]
            ).skip(skip).limit(per_page).to_list()
            nc = encode_cursor(rows[-1].updated_at, rows[-1].id) if rows else None
            return {"items": rows, "next_cursor": nc, "has_more": len(rows) == per_page}

        async def _count():
            # The COUNT is the expensive full-filtered-set scan. Run it only on the
            # first (offset) load so deep "load more" pages stay O(1).
            if cursor is not None:
                return None
            return await Account.find(query).count()

        # Run page fetch, count, and all metadata queries in parallel.
        # picklist_type prevents cross-contamination in shared 'picklists' collection
        (
            page_result,
            total,
            account_views,
            users,
            industries_raw,
            acc_types_raw,
            categories_raw,
        ) = await asyncio.gather(
            _fetch_page(),
            _count(),
            # Account views (scoped to this list type)
            AccountView.find(account_view_query).to_list(),
            # Users for owner selection (cached per tenant, 60s TTL)
            get_active_users(tenant_id=str(current_user.tenant_id)),
            # Industries (platform defaults + tenant overrides)
            Industry.find(build_picklist_query(current_user.tenant_id, industry=tenant_industry, picklist_type="industry")).sort("+sorting").to_list(),
            # Account types (platform defaults + tenant overrides)
            AccountType.find(build_picklist_query(current_user.tenant_id, industry=tenant_industry, picklist_type="account_type")).sort("+sorting").to_list(),
            # Account categories (platform defaults + tenant overrides)
            AccountCategory.find(build_picklist_query(current_user.tenant_id, picklist_type="account_category")).sort("+sorting").to_list(),
        )

        accounts = page_result["items"]
        next_cursor = page_result["next_cursor"]
        has_more = page_result["has_more"]

        # If the active view displays any custom/"additional:" columns, batch-read
        # their values for just this page (single query — no N+1). Skipped entirely
        # when the view has no additional columns, so the default list pays nothing.
        custom_values_by_id: Dict[str, Dict[str, Any]] = {}
        if active_view and any(
            str(c).startswith("additional:") for c in (getattr(active_view, "display_columns", None) or [])
        ):
            from app.services.field_registry_service import bulk_read_custom_field_values
            try:
                custom_values_by_id = await bulk_read_custom_field_values(
                    view_entity_type, [a.id for a in accounts], current_user.tenant_id
                )
            except Exception:
                custom_values_by_id = {}

        # If the active view shows the Account Parent column, resolve parent names
        # for this page (one tenant-scoped query) — the bounded form-data parent
        # list can't cover thousands of accounts.
        parent_name_map: Dict[str, str] = {}
        if active_view and "acc_parent_id" in (getattr(active_view, "display_columns", None) or []):
            parent_ids = list({a.acc_parent_id for a in accounts if getattr(a, "acc_parent_id", None)})
            if parent_ids:
                parents = await Account.find(
                    {"_id": {"$in": parent_ids}, "tenant_id": current_user.tenant_id}
                ).to_list()
                parent_name_map = {str(p.id): p.name for p in parents}

        # Tenant items shadow platform defaults with same name
        industries = dedup_picklist_items(industries_raw)
        acc_types = dedup_picklist_items(acc_types_raw)
        categories = dedup_picklist_items(categories_raw)

        pages = ((total + per_page - 1) // per_page) if total is not None else None

        # Build lookup maps (users come from the cached directory as dicts)
        user_map = {u["id"]: u["name"] for u in users}
        acc_type_map = {str(t.id): t.name for t in acc_types}
        category_map = {str(c.id): c.name for c in categories}
        
        # Get default columns - temporarily return empty list to avoid ObjectId/int mismatch
        display_columns = []
        
        return {
            "accounts": [
                {
                    "id": str(acc.id),
                    "name": acc.name,
                    "email": acc.email,
                    "phone": acc.phone,
                    "mobile": acc.mobile,
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
                    "acc_parent_name": parent_name_map.get(str(acc.acc_parent_id)) if acc.acc_parent_id else None,
                    "industry_id": str(acc.industry_id) if acc.industry_id else None,
                    "category_id": str(acc.category_id) if getattr(acc, 'category_id', None) else None,
                    "category_name": category_map.get(str(acc.category_id)) if getattr(acc, 'category_id', None) else None,
                    "tenant_id": str(acc.tenant_id),
                    "owner_id": str(acc.owner_id),
                    "owner_name": user_map.get(str(acc.owner_id)),
                    "created_by": str(acc.created_by),
                    "last_modified_by_id": str(acc.last_modified_by_id) if acc.last_modified_by_id else None,
                    "view_count": acc.view_count,
                    "is_favorite": acc.is_favorite,
                    "created_at": acc.created_at,
                    "updated_at": acc.updated_at,
                    "deleted_at": acc.deleted_at,
                    "industry_data": getattr(acc, 'industry_data', {}),
                    # {additional_field_id: {value, type, name, label}} — populated
                    # only when the active view shows custom columns (else empty).
                    "custom_fields": custom_values_by_id.get(str(acc.id), {}),
                }
                for acc in accounts
            ],
            "pagination": {
                "current_page": page,
                "total": total,
                "per_page": per_page,
                "pages": pages
            },
            # Keyset cursor for "load more" — O(1) deep pagination. `next_cursor`
            # is null when there are no more rows.
            "next_cursor": next_cursor,
            "has_more": has_more,
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
                {"id": u["id"], "name": u["name"], "email": u["email"]}
                for u in users
            ],
            "industries": [
                {"id": str(i.id), "name": i.name}
                for i in industries
            ],
        }
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_accounts: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error fetching accounts: {str(e)}")


class AccountViewCreate(BaseModel):
    """Payload to save the current account-list filters as a named view."""
    name: str
    filters: Dict[str, Any] = {}
    public_view: bool = False
    is_person_account: bool = False


@router.post("/views", status_code=201)
async def create_account_view(
    payload: AccountViewCreate,
    current_user: User = Depends(check_permission("view_account")),
):
    """Save the current account-list filters as a named list view.

    `filters` is a flat dict of the applied criteria (e.g. {"owner_id": "..",
    "search": "delhi", "billing_city": "Agra"}) — the same shape get_accounts
    applies when the view is later selected.
    """
    from app.models.account_views import AccountView
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(400, "View name is required")
    # Drop empty values so a "view" never stores blank filters.
    clean_filters = {
        k: v for k, v in (payload.filters or {}).items()
        if v not in (None, "", [], {})
    }
    view = AccountView(
        name=name,
        filters=clean_filters,
        public_view=bool(payload.public_view),
        is_person_account=bool(payload.is_person_account),
        created_by=current_user.id,
        tenant_id=current_user.tenant_id,
    )
    await view.insert()
    return {
        "id": str(view.id),
        "name": view.name,
        "public_view": view.public_view,
        "created_at": view.created_at.strftime("%Y-%m-%d"),
    }


@router.delete("/views/{view_id}", status_code=204)
async def delete_account_view(
    view_id: str,
    current_user: User = Depends(check_permission("view_account")),
):
    """Delete a saved view. Only the user who created it may delete it."""
    from app.models.account_views import AccountView
    if not ObjectId.is_valid(view_id):
        raise HTTPException(404, "View not found")
    view = await AccountView.find_one({
        "_id": ObjectId(view_id),
        "tenant_id": current_user.tenant_id,
        "created_by": current_user.id,
    })
    if not view:
        raise HTTPException(404, "View not found")
    await view.delete()
    return None


@router.get("/search", response_model=List[AccountResponse])
async def search_accounts(
    query: Optional[str] = None,
    acc_type_id: Optional[str] = None,
    industry_id: Optional[str] = None,
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
        owner_id=owner_id,
        billing_country=billing_country,
        billing_state=billing_state
    )
    
    skip = (page - 1) * per_page
    from app.services.visibility_scope import get_visible_owner_ids
    visible_owner_ids = await get_visible_owner_ids(current_user)
    accounts, total = await service.search_accounts(
        search_params,
        current_user.tenant_id,
        skip=skip,
        limit=per_page,
        visible_owner_ids=visible_owner_ids
    )
    
    return [account_to_response(acc) for acc in accounts]


@router.get("/search-email")
async def search_account_by_email(
    s: str = Query(..., description="Search term"),
    current_user: User = Depends(get_current_user)
):
    """Search accounts by email for email selection (autocomplete)"""
    from app.services.visibility_scope import get_visible_owner_ids
    query = {
        "tenant_id": current_user.tenant_id,
        "email": {"$regex": s, "$options": "i"},
        "deleted_at": None
    }
    
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if visible_owner_ids is not None:
        query["owner_id"] = {"$in": visible_owner_ids}

    accounts = await Account.find(query).limit(10).to_list()
    
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
    from app.services.visibility_scope import get_visible_owner_ids
    query: dict = {
        "tenant_id": current_user.tenant_id,
        "name": {"$regex": s, "$options": "i"},
        "deleted_at": None
    }
    if is_person_account is not None:
        query["is_person_account"] = is_person_account
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if visible_owner_ids is not None:
        query["owner_id"] = {"$in": visible_owner_ids}
        
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
    from app.services.visibility_scope import get_visible_owner_ids
    service = AccountService()
    
    if include_related:
        # Get account with all related records
        account_data = await service.get_account_with_relations(account_id, current_user.tenant_id)
        
        if not account_data:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Visibility check
        visible_owner_ids = await get_visible_owner_ids(current_user)
        acc_owner = account_data.get("account", {}).get("owner_id") if isinstance(account_data, dict) else None
        if visible_owner_ids is not None and acc_owner:
            from bson import ObjectId as OID
            if OID(acc_owner) not in visible_owner_ids:
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
            
        # Visibility check
        visible_owner_ids = await get_visible_owner_ids(current_user)
        from app.services.visibility_scope import is_record_visible
        if not is_record_visible(account.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Track view
        await service._track_user_view(
            current_user.id,
            account.id,
            current_user.tenant_id
        )
        
        # Increment view count
        await account.increment_view_count()

        # Sprint D — populate custom_fields
        resp = account_to_response(account)
        try:
            from app.services import field_registry_service
            resp.custom_fields = await field_registry_service.read_custom_field_values(
                "account", account.id, current_user.tenant_id,
            )
        except Exception:
            resp.custom_fields = {}
        return resp


@router.get("/{account_id}/address-to-contact")
async def get_account_address_for_contact(
    account_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get account address fields for copying to contact"""
    try:
        oid = PydanticObjectId(account_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Account not found")
    account = await Account.find_one(
        {"_id": oid, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if not account:
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
        from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
        
        if account_data.industry_data is not None:
            account_data.industry_data = await resolve_industry_data(
                current_user.tenant_id,
                account_data.industry_data,
                mode="account",
            )
            
        service = AccountService()
        
        # Visibility pre-check
        existing = await service.get_account(account_id, current_user.tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Account not found")
            
        visible_owner_ids = await get_visible_owner_ids(current_user)
        if not is_record_visible(existing.owner_id, visible_owner_ids):
            raise HTTPException(status_code=404, detail="Account not found")
            
        account = await service.update_account(
            account_id,
            account_data,
            current_user.id,
            current_user.tenant_id,
            custom_fields=getattr(account_data, "custom_fields", None),
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
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    service = AccountService()
    
    # Visibility pre-check
    existing = await service.get_account(account_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_record_visible(existing.owner_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Account not found")
        
    success = await service.delete_account(account_id, current_user.tenant_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Account not found")
    
    from app.core.cache import invalidate_tenant_cache
    await invalidate_tenant_cache(str(current_user.tenant_id))
    
    return {
        "error": False,
        "message": "Account deleted successfully"
    }


@router.post("/{account_id}/change-owner")
async def change_account_owner(
    account_id: str,
    owner_change: AccountOwnerChange,
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


@router.post("/merge")
async def merge_accounts(
    payload: AccountMerge,
    current_user: User = Depends(check_permission("edit_account"))
):
    """Merge a duplicate account into a primary account.

    Re-points related records (contacts, opportunities, tasks) from the
    duplicate onto the primary, backfills any blank scalar fields on the
    primary from the duplicate, then soft-deletes the duplicate.
    """
    from datetime import datetime
    from app.models.contact import Contact
    from app.models.account_contact import AccountContact
    from app.models.opportunity import Opportunity
    from app.models.task import Task
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible

    if payload.primary_id == payload.duplicate_id:
        raise HTTPException(status_code=400, detail="Cannot merge an account into itself")

    try:
        primary_oid = PydanticObjectId(payload.primary_id)
        duplicate_oid = PydanticObjectId(payload.duplicate_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid account id")

    tenant_id = current_user.tenant_id
    primary = await Account.find_one({"_id": primary_oid, "tenant_id": tenant_id, "deleted_at": None})
    duplicate = await Account.find_one({"_id": duplicate_oid, "tenant_id": tenant_id, "deleted_at": None})
    if not primary or not duplicate:
        raise HTTPException(status_code=404, detail="Account not found")

    # Visibility: caller must be able to see both accounts
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_record_visible(primary.owner_id, visible_owner_ids) or not is_record_visible(duplicate.owner_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Account not found")

    scope = {"tenant_id": tenant_id, "account_id": duplicate_oid}

    # Re-point related records onto the primary account
    await Contact.find(scope).update({"$set": {"account_id": primary_oid}})
    await Opportunity.find(scope).update({"$set": {"account_id": primary_oid}})
    await AccountContact.find({"tenant_id": tenant_id, "account_id": duplicate_oid}).update(
        {"$set": {"account_id": primary_oid}}
    )
    await Task.find(scope).update({"$set": {"account_id": primary_oid}})
    await Task.find(
        {"tenant_id": tenant_id, "taskable_type": "Account", "taskable_id": duplicate_oid}
    ).update({"$set": {"taskable_id": primary_oid}})

    # Backfill blank scalar fields on the primary from the duplicate
    backfill_fields = [
        "email", "phone", "website", "description",
        "billing_street", "billing_city", "billing_state", "billing_zip", "billing_country",
        "shipping_street", "shipping_city", "shipping_state", "shipping_zip", "shipping_country",
        "acc_type_id", "industry_id",
    ]
    changed = False
    for f in backfill_fields:
        if not getattr(primary, f, None) and getattr(duplicate, f, None):
            setattr(primary, f, getattr(duplicate, f))
            changed = True
    if changed:
        primary.last_modified_by_id = current_user.id
        await primary.save()

    # Soft-delete the duplicate
    duplicate.deleted_at = datetime.utcnow()
    duplicate.last_modified_by_id = current_user.id
    await duplicate.save()

    from app.core.cache import invalidate_tenant_cache
    await invalidate_tenant_cache(str(tenant_id))

    return {
        "error": False,
        "message": "Accounts merged successfully",
        "primary_id": str(primary_oid),
        "merged_id": str(duplicate_oid),
    }


@router.post("/single-column")
async def update_single_column(
    account_id: str = Query(...),
    field_name: str = Query(...),
    field_value: str = Query(...),
    current_user: User = Depends(check_permission("edit_account"))
):
    """Update a single column of an account"""
    from app.services.visibility_scope import get_visible_owner_ids, is_record_visible
    try:
        oid = PydanticObjectId(account_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Account not found")
    account = await Account.find_one(
        {"_id": oid, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    # Visibility pre-check
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_record_visible(account.owner_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Account not found")
    
    from app.core.inline_field_validation import validate_inline_field_update

    if not hasattr(account, field_name):
        raise HTTPException(status_code=400, detail=f"Invalid field: {field_name}")

    normalized = validate_inline_field_update(
        "account",
        field_name,
        field_value,
        is_person_account=account.is_person_account,
    )
    setattr(account, field_name, normalized)
    account.last_modified_by_id = current_user.id
    await account.save()
        
    return {
        "error": False,
        "message": f"{field_name} updated successfully",
        "account": account_to_response(account)
    }
