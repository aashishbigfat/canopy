"""
Billing service for subscription management and plan handling.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId

from app.models.billing import SubscriptionPlan, TenantSubscription, BillingInvoice
from app.schemas.billing import (
    PlanCreate, PlanUpdate,
    SubscriptionCreate, SubscriptionUpdate
)


class BillingService:
    """Service for billing and subscription management."""
    
    # ==================== Plan Management ====================
    
    async def create_plan(
        self,
        data: PlanCreate
    ) -> SubscriptionPlan:
        """Create a new subscription plan."""
        plan = SubscriptionPlan(**data.model_dump())
        await plan.insert()
        return plan
    
    async def get_plan(
        self,
        plan_id: str
    ) -> Optional[SubscriptionPlan]:
        """Get a plan by ID."""
        return await SubscriptionPlan.get(plan_id)
    
    async def get_plan_by_code(
        self,
        code: str
    ) -> Optional[SubscriptionPlan]:
        """Get a plan by code."""
        return await SubscriptionPlan.find_one(SubscriptionPlan.code == code)
    
    async def update_plan(
        self,
        plan_id: str,
        data: PlanUpdate
    ) -> Optional[SubscriptionPlan]:
        """Update a plan."""
        plan = await self.get_plan(plan_id)
        if not plan:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(plan, key, value)
            
        await plan.save()
        return plan
    
    async def list_plans(
        self,
        is_public: Optional[bool] = None,
        is_active: Optional[bool] = None
    ) -> List[SubscriptionPlan]:
        """List subscription plans."""
        query = {}
        if is_public is not None:
            query["is_public"] = is_public
        if is_active is not None:
            query["is_active"] = is_active
            
        return await SubscriptionPlan.find(query).sort(SubscriptionPlan.price_monthly).to_list()
    
    # ==================== Subscription Management ====================
    
    async def get_subscription(
        self,
        tenant_id: str
    ) -> Optional[TenantSubscription]:
        """Get active subscription for a tenant."""
        return await TenantSubscription.find_one(
            TenantSubscription.tenant_id == tenant_id,
            TenantSubscription.status != "canceled"
        )
    
    async def create_subscription(
        self,
        tenant_id: str,
        data: SubscriptionCreate
    ) -> TenantSubscription:
        """Create or upgrade a subscription."""
        # Check plan
        plan = await self.get_plan(data.plan_id)
        if not plan:
            raise ValueError("Plan not found")
            
        # Check existing
        existing = await self.get_subscription(tenant_id)
        if existing:
            # Logic for upgrade/downgrade would go here (prorating etc)
            existing.status = "canceled"
            existing.canceled_at = datetime.utcnow()
            await existing.save()
            
        # Calculate dates
        start_date = datetime.utcnow()
        if data.billing_cycle == "yearly":
            end_date = start_date.replace(year=start_date.year + 1)
        else:
            # Simple month add
            next_month = start_date.replace(day=28) + timedelta(days=4)
            end_date = next_month - timedelta(days=next_month.day)
            
        subscription = TenantSubscription(
            tenant_id=tenant_id,
            plan_id=str(plan.id),
            plan_code=plan.code,
            status="active",
            billing_cycle=data.billing_cycle,
            start_date=start_date,
            end_date=end_date,
            current_users=1, # Default
        )
        await subscription.insert()
        
        # Here we would integrate with Stripe to create subscription
        
        return subscription
    
    async def cancel_subscription(
        self,
        tenant_id: str
    ) -> Optional[TenantSubscription]:
        """Cancel a subscription."""
        sub = await self.get_subscription(tenant_id)
        if not sub:
            return None
            
        sub.status = "canceled"
        sub.canceled_at = datetime.utcnow()
        sub.end_date = datetime.utcnow() # Immediate cancellation for now
        await sub.save()
        return sub
    
    # ==================== Invoices ====================
    
    async def list_invoices(
        self,
        tenant_id: str,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[BillingInvoice], int]:
        """List billing invoices."""
        query = {"tenant_id": tenant_id}
        
        total = await BillingInvoice.find(query).count()
        
        invoices = await BillingInvoice.find(query)\
            .sort(-BillingInvoice.created_at)\
            .skip((page - 1) * per_page)\
            .limit(per_page)\
            .to_list()
            
        return invoices, total


# Singleton instance
billing_service = BillingService()
