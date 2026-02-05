"""
Invoice API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceDetailResponse,
    InvoiceListResponse, InvoiceItemCreate, InvoiceItemResponse, PaymentCreate, PaymentResponse
)
from app.services.invoice_service import InvoiceService
from app.api.deps import get_current_user, check_permission

router = APIRouter()


@router.post("/", response_model=InvoiceDetailResponse, status_code=201)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(check_permission("create_invoice"))
):
    """Create a new invoice with items"""
    service = InvoiceService()
    invoice = await service.create_invoice(invoice_data, current_user.id, current_user.tenant_id)
    result = await service.get_invoice_with_details(str(invoice.id), current_user.tenant_id)
    
    return InvoiceDetailResponse(
        **InvoiceResponse.from_orm(result["invoice"]).model_dump(),
        items=[InvoiceItemResponse.from_orm(i) for i in result["items"]],
        payments=[PaymentResponse.from_orm(p) for p in result["payments"]]
    )


@router.get("/", response_model=InvoiceListResponse)
async def get_invoices(
    status: Optional[str] = None,
    owner_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_permission("view_invoice"))
):
    """Get all invoices with filters"""
    service = InvoiceService()
    invoices = await service.get_invoices_by_tenant(
        current_user.tenant_id, status=status, owner_id=owner_id, skip=skip, limit=limit
    )
    return InvoiceListResponse(invoices=[InvoiceResponse.from_orm(i) for i in invoices], total=len(invoices))


@router.get("/search")
async def search_invoices(
    query: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(check_permission("view_invoice"))
):
    """Search invoices"""
    service = InvoiceService()
    invoices = await service.search_invoices(query, current_user.tenant_id, skip=skip, limit=limit)
    return {"invoices": [InvoiceResponse.from_orm(i) for i in invoices], "total": len(invoices)}


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
async def get_invoice(
    invoice_id: str,
    current_user: User = Depends(check_permission("view_invoice"))
):
    """Get invoice by ID with items and payments"""
    service = InvoiceService()
    result = await service.get_invoice_with_details(invoice_id, current_user.tenant_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return InvoiceDetailResponse(
        **InvoiceResponse.from_orm(result["invoice"]).model_dump(),
        items=[InvoiceItemResponse.from_orm(i) for i in result["items"]],
        payments=[PaymentResponse.from_orm(p) for p in result["payments"]]
    )


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(check_permission("edit_invoice"))
):
    """Update an invoice"""
    service = InvoiceService()
    invoice = await service.update_invoice(invoice_id, invoice_data, current_user.id, current_user.tenant_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceResponse.from_orm(invoice)


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    current_user: User = Depends(check_permission("delete_invoice"))
):
    """Delete an invoice (soft delete)"""
    service = InvoiceService()
    success = await service.delete_invoice(invoice_id, current_user.tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"error": False, "message": "Invoice deleted successfully"}


@router.post("/{invoice_id}/payments", response_model=PaymentResponse)
async def record_payment(
    invoice_id: str,
    payment_data: PaymentCreate,
    current_user: User = Depends(check_permission("edit_invoice"))
):
    """Record a payment for an invoice"""
    service = InvoiceService()
    payment = await service.record_payment(invoice_id, payment_data, current_user.id, current_user.tenant_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return PaymentResponse.from_orm(payment)


@router.post("/{invoice_id}/items", response_model=InvoiceItemResponse)
async def add_invoice_item(
    invoice_id: str,
    item_data: InvoiceItemCreate,
    current_user: User = Depends(check_permission("edit_invoice"))
):
    """Add item to invoice"""
    service = InvoiceService()
    item = await service.add_item(invoice_id, item_data, current_user.tenant_id)
    if not item:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceItemResponse.from_orm(item)
