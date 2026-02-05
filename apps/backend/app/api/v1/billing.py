"""
API endpoints for Billing and Subscriptions.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user, check_permission
from app.models.user import User
from app.services.billing_service import billing_service
from app.schemas.billing import (
    PlanCreate, PlanUpdate, PlanResponse,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    InvoiceListResponse, InvoiceResponse
)

router = APIRouter()


# ==================== Plans (Public/Admin) ====================

@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(
    is_public: bool = True
):
    """List public subscription plans."""
    plans = await billing_service.list_plans(is_public=is_public, is_active=True)
    return [
        PlanResponse(id=str(p.id), **p.model_dump(exclude={"id"}))
        for p in plans
    ]


@router.post("/plans", response_model=PlanResponse)
async def create_plan(
    data: PlanCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new plan."""
    plan = await billing_service.create_plan(data)
    return PlanResponse(id=str(plan.id), **plan.model_dump(exclude={"id"}))


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: str,
    data: PlanUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a plan."""
    plan = await billing_service.update_plan(plan_id, data)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PlanResponse(id=str(plan.id), **plan.model_dump(exclude={"id"}))


# ==================== Subscription ====================

@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user)
):
    """Get current tenant subscription."""
    sub = await billing_service.get_subscription(str(current_user.tenant_id))
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    # Enrich with plan info
    plan = await billing_service.get_plan(sub.plan_id)
    
    response = SubscriptionResponse(
        id=str(sub.id),
        plan_name=plan.name if plan else "Unknown",
        amount=plan.price_yearly if sub.billing_cycle == "yearly" else plan.price_monthly if plan else 0,
        currency=plan.currency if plan else "USD",
        **sub.model_dump(exclude={"id"})
    )
    return response


@router.post("/subscription", response_model=SubscriptionResponse)
async def create_subscription(
    data: SubscriptionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create or upgrade subscription."""
    try:
        sub = await billing_service.create_subscription(str(current_user.tenant_id), data)
        
        # Enrich
        plan = await billing_service.get_plan(sub.plan_id)
        
        return SubscriptionResponse(
            id=str(sub.id),
            plan_name=plan.name if plan else "Unknown",
            amount=plan.price_yearly if sub.billing_cycle == "yearly" else plan.price_monthly if plan else 0,
            currency=plan.currency if plan else "USD",
            **sub.model_dump(exclude={"id"})
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user)
):
    """Cancel subscription."""
    sub = await billing_service.cancel_subscription(str(current_user.tenant_id))
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found")
    return {"message": "Subscription canceled successfully"}


# ==================== Invoices ====================

@router.get("/invoices", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """List billing invoices."""
    invoices, total = await billing_service.list_invoices(
        tenant_id=str(current_user.tenant_id),
        page=page,
        per_page=per_page
    )
    return InvoiceListResponse(
        invoices=[
            InvoiceResponse(id=str(i.id), **i.model_dump(exclude={"id"}))
            for i in invoices
        ],
        total=total,
        page=page,
        per_page=per_page
    )
