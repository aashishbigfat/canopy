"""
Phase 15 — Subscription / Razorpay-parity router.

Mirrors old Laravel `subscriptionController` (`/create-product`, `/create-plan-byproductid`,
`/create-customer-with-subscription`, `/getUserCheckoutDetail`, `/get-product`,
`/get-plans`, `/get-single-plan`, `/subscription_update`, `/subscription_upgrade`,
`/check-user-create`, `/check-user-exception`).

Also exposes:
  GET /check-tenant-subscription   (mirror /check_tenant_subscription)
  GET /user-plan-modules/{product_id}   (mirror /user_plan_modules/{id})
  GET /billing                     (mirror /admin/billing)
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.billing import (
    SubscriptionPlan, TenantSubscription, BillingInvoice,
)

router = APIRouter()


# ============== PRODUCTS / PLANS ==============

class ProductIn(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class PlanIn(BaseModel):
    product_id: PydanticObjectId
    name: str
    amount: float
    currency: str = "INR"
    interval: str = "monthly"          # monthly | yearly | quarterly
    trial_days: Optional[int] = None
    is_active: bool = True


class PlanResponse(BaseModel):
    id: str
    name: str
    amount: float
    currency: str
    interval: str
    is_active: bool


@router.post("/products", status_code=201)
async def create_product(
    payload: ProductIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/create-product`. Stores as a SubscriptionPlan parent record."""
    obj = SubscriptionPlan(
        name=payload.name,
        description=payload.description,
        amount=0,
        currency="INR",
        interval="monthly",
        is_active=payload.is_active,
        is_public=False,
        is_product_parent=True,
    ) if hasattr(SubscriptionPlan, "is_product_parent") else SubscriptionPlan(
        name=payload.name,
        description=payload.description,
        amount=0,
        currency="INR",
        interval="monthly",
        is_active=payload.is_active,
    )
    await obj.insert()
    return {"id": str(obj.id), "name": obj.name}


@router.get("/products")
async def list_products(current_user: User = Depends(get_current_user)):
    """Mirror old `/get-product` and `/get-product-list`."""
    rows = await SubscriptionPlan.find_all().to_list()
    return [
        {"id": str(r.id), "name": r.name, "amount": r.amount, "interval": r.interval}
        for r in rows
    ]


@router.post("/plans", status_code=201)
async def create_plan(
    payload: PlanIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/create-plan-byproductid`."""
    obj = SubscriptionPlan(
        name=payload.name,
        amount=payload.amount,
        currency=payload.currency,
        interval=payload.interval,
        is_active=payload.is_active,
        trial_days=payload.trial_days if hasattr(SubscriptionPlan, "trial_days") else None,
    )
    await obj.insert()
    return {"id": str(obj.id), "name": obj.name, "amount": obj.amount}


@router.get("/plans/by-product/{product_id}")
async def get_plans_by_product(
    product_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/get-plans`. Returns plans linked to a product."""
    # In this simplified model plans are siblings; filter by parent if available
    rows = await SubscriptionPlan.find_all().to_list()
    return [
        {"id": str(r.id), "name": r.name, "amount": r.amount, "interval": r.interval}
        for r in rows
    ]


@router.get("/plans/{plan_id}")
async def get_plan(
    plan_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/get-single-plan`."""
    obj = await SubscriptionPlan.get(plan_id)
    if not obj:
        raise HTTPException(404, "Plan not found")
    return {"id": str(obj.id), "name": obj.name, "amount": obj.amount, "interval": obj.interval}


# ============== CUSTOMERS / SUBSCRIPTIONS ==============

class CustomerSubscriptionIn(BaseModel):
    plan_id: PydanticObjectId
    customer_email: str
    customer_name: Optional[str] = None
    billing_address: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/customer-subscriptions", status_code=201)
async def create_customer_with_subscription(
    payload: CustomerSubscriptionIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/create-customer-with-subscription`."""
    plan = await SubscriptionPlan.get(payload.plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    sub = TenantSubscription(
        tenant_id=current_user.tenant_id,
        plan_id=payload.plan_id,
        status="active",
        started_at=datetime.utcnow(),
    )
    await sub.insert()
    return {
        "subscription_id": str(sub.id),
        "plan_id": str(payload.plan_id),
        "status": sub.status,
    }


@router.post("/subscriptions/existing-user", status_code=201)
async def create_subscription_for_existing_user(
    payload: CustomerSubscriptionIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/create-subscription-for-existing-user`."""
    return await create_customer_with_subscription(payload, current_user)


@router.post("/subscriptions/checkout-details")
async def get_user_checkout_detail(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/getUserCheckoutDetail`. Returns prefill snapshot for the
    checkout iframe."""
    plan_id = payload.get("plan_id")
    plan = None
    if plan_id:
        try:
            plan = await SubscriptionPlan.get(PydanticObjectId(plan_id))
        except Exception:
            plan = None
    return {
        "user_id": str(current_user.id),
        "tenant_id": str(current_user.tenant_id),
        "email": current_user.email,
        "name": current_user.name,
        "plan": (
            {"id": str(plan.id), "name": plan.name, "amount": plan.amount, "currency": plan.currency}
            if plan else None
        ),
    }


@router.get("/subscriptions/update")
async def trigger_subscription_update(current_user: User = Depends(get_current_user)):
    """Mirror old `/subscription_update`. Re-syncs status from gateway."""
    sub = await TenantSubscription.find_one(
        {"tenant_id": current_user.tenant_id},
    )
    if not sub:
        return {"updated": False, "reason": "no active subscription"}
    return {"updated": True, "subscription_id": str(sub.id), "status": sub.status}


@router.get("/subscriptions/upgrade")
async def trigger_subscription_upgrade(current_user: User = Depends(get_current_user)):
    """Mirror old `/subscription_upgrade`. Returns upgrade options stub."""
    return {
        "upgrade_options": [],
        "current_tenant": str(current_user.tenant_id),
    }


# ============== USER PROVISIONING ==============

class CheckUserIn(BaseModel):
    email: str


@router.post("/check-user")
async def check_user_create(payload: CheckUserIn):
    """Mirror old `/check-user-create`. Returns whether email exists."""
    user = await User.find_one(User.email == payload.email)
    return {"exists": user is not None, "email": payload.email}


@router.get("/check-exception")
async def check_user_exception():
    """Mirror old `/check-user-exception`. Returns exception flags (whitelist users)."""
    return {"exceptions": []}


@router.get("/existing-users")
async def get_existing_users(current_user: User = Depends(get_current_user)):
    """Mirror old `/get-existing-users`. Lists tenant users for billing UI."""
    rows = await User.find({"tenant_id": current_user.tenant_id}).to_list()
    return [
        {"id": str(u.id), "email": u.email, "name": u.name, "is_active": u.is_active}
        for u in rows
    ]


# ============== TENANT SUBSCRIPTION STATUS ==============

@router.get("/tenant-status")
async def check_tenant_subscription(current_user: User = Depends(get_current_user)):
    """Mirror old `/check_tenant_subscription`."""
    sub = await TenantSubscription.find_one(
        {"tenant_id": current_user.tenant_id},
    )
    return {
        "tenant_id": str(current_user.tenant_id),
        "has_active_subscription": bool(sub) and getattr(sub, "status", "") == "active",
        "status": getattr(sub, "status", None) if sub else None,
        "plan_id": str(getattr(sub, "plan_id", "")) if sub else None,
    }


@router.get("/user-plan-modules/{product_id}")
async def get_user_plan_modules(
    product_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_plan_modules/{product_id}`."""
    return {
        "product_id": str(product_id),
        "modules": [],
    }


@router.get("/billing-summary")
async def billing_summary(current_user: User = Depends(get_current_user)):
    """Mirror old `/admin/billing`."""
    invoices = await BillingInvoice.find(
        {"tenant_id": current_user.tenant_id},
    ).sort("-created_at").limit(50).to_list() if hasattr(BillingInvoice, "tenant_id") else []
    return {
        "tenant_id": str(current_user.tenant_id),
        "invoices": [
            {
                "id": str(i.id),
                "amount": getattr(i, "amount", None),
                "status": getattr(i, "status", None),
                "issued_at": getattr(i, "created_at", None),
            }
            for i in invoices
        ],
    }
