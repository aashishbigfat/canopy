"""
Opportunity Financial API endpoints - Costing, Payment Schedule, Transactions
Routes are mounted under /api/v1/opportunities/{opportunity_id}/...
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId

from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.opportunity_financial import (
    OpportunityCosting, PaymentScheduleItem, OpportunityTransaction,
    COSTING_ITEM_TYPES, FIXED_ITEM_TYPES
)
from app.models.supplier import Supplier
from app.models.destination import Destination
from app.schemas.opportunity_financial import (
    CostingCreateUpdate, CostingResponse,
    PaymentScheduleItemCreate, PaymentScheduleItemUpdate, PaymentScheduleItemResponse,
    TransactionCreate, TransactionUpdate, TransactionResponse
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

@router.get("/financial-config")
async def get_financial_config(
    current_user: User = Depends(get_current_user),
):
    """Return tenant-specific financial configuration (e.g. default supplier for Tax/Misc rows)"""
    from app.models.settings import TenantSettings
    from app.models.tenant import Tenant

    supplier_name = None

    # 1. Fetch Tenant record directly as primary source of company name
    try:
        tenant = await Tenant.get(current_user.tenant_id)
        if tenant and tenant.company_name:
            supplier_name = tenant.company_name
    except Exception as e:
        print(f"Error fetching tenant {current_user.tenant_id}: {e}")

    # 2. If not found, or if we want to allow override via settings, check TenantSettings
    if not supplier_name:
        try:
            settings = await TenantSettings.find_one(
                TenantSettings.tenant_id == current_user.tenant_id
            )
            if settings:
                supplier_name = getattr(settings, 'default_tax_misc_supplier', None) or getattr(settings, 'company_name', None)
        except Exception:
            pass

    # 3. Final fallback
    if not supplier_name:
        supplier_name = "Your Company"

    return {"default_tax_misc_supplier": supplier_name}


@router.get("/{opportunity_id}/costing/item-types")
async def get_costing_item_types(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return available item types merged with opportunity inclusions"""
    opp = await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    # Merge: global selectable types + opportunity-specific inclusions, deduplicated, preserve order
    merged = list(COSTING_ITEM_TYPES)  # start with global list
    for inclusion in (opp.inclusions or []):
        if inclusion and inclusion not in merged and inclusion not in FIXED_ITEM_TYPES:
            merged.append(inclusion)

    return {"item_types": merged, "fixed_item_types": FIXED_ITEM_TYPES}


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

    # BI-DIRECTIONAL SYNC: Immediately push selected_item_types back up to Opportunity record
    opp = await get_opportunity_or_404(opportunity_id, current_user.tenant_id)
    if set(opp.inclusions or []) != set(data.selected_item_types):
        opp.inclusions = data.selected_item_types
        await opp.save()

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
            transaction_id=str(item.transaction_id) if item.transaction_id else None,
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
        transaction_id=str(item.transaction_id) if item.transaction_id else None,
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
    """Update a payment schedule item. When status changes to 'Received', auto-create a Receive transaction."""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    try:
        item = await PaymentScheduleItem.get(ObjectId(item_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Payment schedule item not found")

    update_data = data.model_dump(exclude_none=True)
    from datetime import datetime

    old_status = item.status
    new_status = update_data.get("status", old_status)

    # When marking as Received: set paid_at (use provided or now), then create a Receive transaction
    if new_status == "Received" and old_status != "Received":
        # Use provided paid_at or fall back to now
        paid_at_value = update_data.get("paid_at") or datetime.utcnow()
        update_data["paid_at"] = paid_at_value

        # Auto-create the Receive transaction in the ledger
        txn = OpportunityTransaction(
            opportunity_id=ObjectId(opportunity_id),
            tenant_id=current_user.tenant_id,
            transaction_type="Receive",
            amount=item.amount,
            transaction_date=paid_at_value,
            payment_mode=update_data.get("payment_method"),
            reference_id=update_data.get("reference_number"),
            note=update_data.get("notes"),
            payment_schedule_item_id=item.id,
            created_by=current_user.id,
        )
        await txn.insert()

        # Link transaction back to the payment schedule item
        # Store as PydanticObjectId so it matches the model's field type
        update_data["transaction_id"] = txn.id  # txn.id is already PydanticObjectId

    # If reverting from Received back to Pending, clear paid_at and delete the linked transaction
    if new_status == "Pending" and old_status == "Received":
        update_data["paid_at"] = None
        # Delete the linked Receive transaction if it exists
        if item.transaction_id:
            try:
                linked_txn = await OpportunityTransaction.get(item.transaction_id)
                if linked_txn:
                    await linked_txn.delete()
            except Exception:
                pass
        update_data["transaction_id"] = None

    # Apply updates — coerce transaction_id string (from client schema) to PydanticObjectId
    from beanie import PydanticObjectId as PyObjId
    for field, value in update_data.items():
        if field == "transaction_id" and isinstance(value, str):
            # Shouldn't normally arrive as str, but guard defensively
            try:
                value = PyObjId(value)
            except Exception:
                value = None
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
        transaction_id=str(item.transaction_id) if item.transaction_id else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.delete("/{opportunity_id}/payment-schedule/{item_id}")
async def delete_payment_schedule_item(
    opportunity_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a payment schedule item (only if status is Pending)"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    try:
        item = await PaymentScheduleItem.get(ObjectId(item_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")

    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Payment schedule item not found")

    # Cannot delete if already received
    if item.status == "Received":
        raise HTTPException(status_code=400, detail="Cannot delete a received payment. Edit it instead.")

    await item.delete()
    return {"message": "Payment schedule item deleted"}


# ─────────────────────────── TRANSACTION CRUD ─────────────────────────────────

def _txn_to_response(txn: OpportunityTransaction) -> TransactionResponse:
    """Helper to convert an OpportunityTransaction model to a response schema"""
    return TransactionResponse(
        id=str(txn.id),
        opportunity_id=str(txn.opportunity_id),
        tenant_id=str(txn.tenant_id),
        transaction_type=txn.transaction_type,
        amount=txn.amount,
        transaction_date=txn.transaction_date,
        payment_mode=txn.payment_mode,
        reference_id=txn.reference_id,
        supplier=txn.supplier,
        service=txn.service,
        destination=txn.destination,
        note=txn.note,
        payment_schedule_item_id=str(txn.payment_schedule_item_id) if txn.payment_schedule_item_id else None,
        created_at=txn.created_at,
        updated_at=txn.updated_at,
    )


@router.get("/{opportunity_id}/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get all transactions for an opportunity"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    txns = await OpportunityTransaction.find(
        OpportunityTransaction.opportunity_id == ObjectId(opportunity_id),
        OpportunityTransaction.tenant_id == current_user.tenant_id
    ).sort("+created_at").to_list()

    return [_txn_to_response(t) for t in txns]


@router.post("/{opportunity_id}/transactions", response_model=TransactionResponse)
async def create_transaction(
    opportunity_id: str,
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new standalone transaction (Pay Amount or Refund Amount)"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    if data.transaction_type not in ("Pay", "Refund", "Receive"):
        raise HTTPException(status_code=400, detail="Transaction type must be 'Pay', 'Refund', or 'Receive'")

    from datetime import datetime
    txn = OpportunityTransaction(
        opportunity_id=ObjectId(opportunity_id),
        tenant_id=current_user.tenant_id,
        transaction_type=data.transaction_type,
        amount=data.amount,
        transaction_date=data.transaction_date or datetime.utcnow(),
        payment_mode=data.payment_mode,
        reference_id=data.reference_id,
        supplier=data.supplier,
        service=data.service,
        destination=data.destination,
        note=data.note,
        created_by=current_user.id,
    )
    await txn.insert()

    return _txn_to_response(txn)


@router.put("/{opportunity_id}/transactions/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    opportunity_id: str,
    txn_id: str,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update an existing transaction"""
    await get_opportunity_or_404(opportunity_id, current_user.tenant_id)

    try:
        txn = await OpportunityTransaction.get(ObjectId(txn_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    if not txn or txn.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = data.model_dump(exclude_none=True)
    from datetime import datetime

    for field, value in update_data.items():
        setattr(txn, field, value)

    from datetime import datetime
    txn.updated_at = datetime.utcnow()
    # Note: OpportunityTransaction has no last_modified_by_id field
    await txn.save()

    return _txn_to_response(txn)
