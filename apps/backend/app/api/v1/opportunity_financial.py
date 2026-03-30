"""
Opportunity Financial API endpoints - Costing, Payment Schedule
Routes are mounted under /api/v1/opportunities/{opportunity_id}/...
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId

from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.opportunity_financial import OpportunityCosting, PaymentScheduleItem, COSTING_ITEM_TYPES, FIXED_ITEM_TYPES
from app.models.supplier import Supplier
from app.models.destination import Destination
from app.schemas.opportunity_financial import (
    CostingCreateUpdate, CostingResponse,
    PaymentScheduleItemCreate, PaymentScheduleItemUpdate, PaymentScheduleItemResponse
)
from app.api.deps import get_current_user

router = APIRouter()


# ─────────────────────────── HELPER: verify opportunity ───────────────────────

async def get_opportunity_or_404(opportunity_id: str, tenant_id):
    """Fetch an opportunity verifying tenant ownership"""
    try:
        opp = await Opportunity.get(ObjectId(opportunity_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid opportunity ID")
    if not opp or opp.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


# ─────────────────────────── COSTING ITEM TYPES ───────────────────────────────

@router.get("/{opportunity_id}/costing/item-types")
async def get_costing_item_types(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return the available and fixed item types for costing"""
    return {"item_types": COSTING_ITEM_TYPES, "fixed_item_types": FIXED_ITEM_TYPES}


@router.get("/{opportunity_id}/costing/destinations")
async def get_costing_destinations(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return ONLY the destinations selected on this opportunity (scoped)"""
    opp = await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    result = []
    for did in (opp.destination_ids or []):
        try:
            dest = await Destination.get(did)
            if dest:
                result.append({"id": str(dest.id), "name": dest.name})
        except Exception:
            pass
    return {"destinations": result}


# ─────────────────────────── COSTING CRUD ─────────────────────────────────────

@router.get("/{opportunity_id}/costing", response_model=CostingResponse)
async def get_costing(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get the costing sheet for an opportunity"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    costing = await OpportunityCosting.find_one(
        OpportunityCosting.opportunity_id == ObjectId(opportunity_id),
        OpportunityCosting.tenant_id == current_user.tenant_id
    )

    if not costing:
        # Return empty costing structure
        return CostingResponse(
            opportunity_id=opportunity_id,
            tenant_id=str(current_user.tenant_id),
            selected_item_types=[],
            items=[],
            total_amount=0.0,
            total_cost=0.0,
            profit=0.0,
            profit_percent=0.0,
        )

    return CostingResponse(
        id=str(costing.id),
        opportunity_id=str(costing.opportunity_id),
        tenant_id=str(costing.tenant_id),
        selected_item_types=costing.selected_item_types,
        items=[item.model_dump() for item in costing.items],
        total_amount=costing.total_amount,
        total_cost=costing.total_cost,
        profit=costing.profit,
        profit_percent=costing.profit_percent,
        created_at=costing.created_at,
        updated_at=costing.updated_at,
    )


@router.post("/{opportunity_id}/costing", response_model=CostingResponse)
async def upsert_costing(
    opportunity_id: str,
    data: CostingCreateUpdate,
    current_user: User = Depends(get_current_user),
):
    """Create or update the costing sheet for an opportunity"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    # Enrich supplier & destination names for submitted items
    for item in data.items:
        if item.supplier_id and not item.supplier_name:
            try:
                supplier = await Supplier.get(ObjectId(item.supplier_id))
                if supplier:
                    item.supplier_name = supplier.name
            except Exception:
                pass

        if item.destination_ids and not item.destination_names:
            names = []
            for did in item.destination_ids:
                try:
                    dest = await Destination.get(ObjectId(did))
                    if dest:
                        names.append(dest.name)
                except Exception:
                    pass
            item.destination_names = names

    # Calculate totals
    total_amount = sum(i.amount for i in data.items)
    total_cost = sum(i.cost_amount for i in data.items)
    profit = total_amount - total_cost
    profit_percent = round((profit / total_amount * 100), 2) if total_amount > 0 else 0.0

    # Check if costing already exists
    costing = await OpportunityCosting.find_one(
        OpportunityCosting.opportunity_id == ObjectId(opportunity_id),
        OpportunityCosting.tenant_id == current_user.tenant_id
    )

    from app.models.opportunity_financial import CostingLineItem
    items_objs = [CostingLineItem(**item.model_dump()) for item in data.items]

    if costing:
        # Update existing
        costing.selected_item_types = data.selected_item_types
        costing.items = items_objs
        costing.total_amount = total_amount
        costing.total_cost = total_cost
        costing.profit = profit
        costing.profit_percent = profit_percent
        from datetime import datetime
        costing.updated_at = datetime.utcnow()
        await costing.save()
    else:
        # Create new
        costing = OpportunityCosting(
            opportunity_id=ObjectId(opportunity_id),
            tenant_id=current_user.tenant_id,
            selected_item_types=data.selected_item_types,
            items=items_objs,
            total_amount=total_amount,
            total_cost=total_cost,
            profit=profit,
            profit_percent=profit_percent,
        )
        await costing.insert()

    return CostingResponse(
        id=str(costing.id),
        opportunity_id=str(costing.opportunity_id),
        tenant_id=str(costing.tenant_id),
        selected_item_types=costing.selected_item_types,
        items=[item.model_dump() for item in costing.items],
        total_amount=costing.total_amount,
        total_cost=costing.total_cost,
        profit=costing.profit,
        profit_percent=costing.profit_percent,
        created_at=costing.created_at,
        updated_at=costing.updated_at,
    )


# ─────────────────────────── PAYMENT SCHEDULE CRUD ────────────────────────────

@router.get("/{opportunity_id}/payment-schedule", response_model=List[PaymentScheduleItemResponse])
async def get_payment_schedule(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get all payment schedule items for an opportunity"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    items = await PaymentScheduleItem.find(
        PaymentScheduleItem.opportunity_id == ObjectId(opportunity_id),
        PaymentScheduleItem.tenant_id == current_user.tenant_id
    ).sort("+created_at").to_list()

    return [
        PaymentScheduleItemResponse(
            id=str(item.id),
            opportunity_id=str(item.opportunity_id),
            tenant_id=str(item.tenant_id),
            description=item.description,
            due_date=item.due_date,
            amount=item.amount,
            status=item.status,
            payment_method=item.payment_method,
            reference_number=item.reference_number,
            notes=item.notes,
            paid_at=item.paid_at,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]


@router.post("/{opportunity_id}/payment-schedule", response_model=PaymentScheduleItemResponse)
async def create_payment_schedule_item(
    opportunity_id: str,
    data: PaymentScheduleItemCreate,
    current_user: User = Depends(get_current_user),
):
    """Add a payment schedule item to an opportunity"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    item = PaymentScheduleItem(
        opportunity_id=ObjectId(opportunity_id),
        tenant_id=current_user.tenant_id,
        description=data.description,
        due_date=data.due_date,
        amount=data.amount,
        status=data.status,
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        notes=data.notes,
        created_by=current_user.id,
    )
    await item.insert()

    return PaymentScheduleItemResponse(
        id=str(item.id),
        opportunity_id=str(item.opportunity_id),
        tenant_id=str(item.tenant_id),
        description=item.description,
        due_date=item.due_date,
        amount=item.amount,
        status=item.status,
        payment_method=item.payment_method,
        reference_number=item.reference_number,
        notes=item.notes,
        paid_at=item.paid_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.put("/{opportunity_id}/payment-schedule/{item_id}", response_model=PaymentScheduleItemResponse)
async def update_payment_schedule_item(
    opportunity_id: str,
    item_id: str,
    data: PaymentScheduleItemUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update a payment schedule item"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    try:
        item = await PaymentScheduleItem.get(ObjectId(item_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Payment schedule item not found")

    update_data = data.model_dump(exclude_none=True)
    from datetime import datetime

    # If marking as paid and no paid_at set, auto-set it
    if update_data.get("status") == "Paid" and not item.paid_at:
        update_data["paid_at"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(item, field, value)

    item.updated_at = datetime.utcnow()
    item.last_modified_by_id = current_user.id
    await item.save()

    return PaymentScheduleItemResponse(
        id=str(item.id),
        opportunity_id=str(item.opportunity_id),
        tenant_id=str(item.tenant_id),
        description=item.description,
        due_date=item.due_date,
        amount=item.amount,
        status=item.status,
        payment_method=item.payment_method,
        reference_number=item.reference_number,
        notes=item.notes,
        paid_at=item.paid_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.delete("/{opportunity_id}/payment-schedule/{item_id}")
async def delete_payment_schedule_item(
    opportunity_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a payment schedule item"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    try:
        item = await PaymentScheduleItem.get(ObjectId(item_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Payment schedule item not found")

    await item.delete()
    return {"message": "Payment schedule item deleted"}
