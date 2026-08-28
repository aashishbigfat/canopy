"""
Invoice service layer - Business logic for invoice management
"""
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime
import random
import string
from app.models.invoice import Invoice, InvoiceItem, Payment
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceItemCreate, PaymentCreate
from app.mixins.activity_mixin import ActivityMixin


class InvoiceService(ActivityMixin):
    """Service for Invoice business logic"""
    
    def __init__(self):
        super().__init__()
    
    def _generate_invoice_number(self) -> str:
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        return f"INV-{timestamp}-{random_suffix}"
    
    def _calculate_item_totals(self, item: InvoiceItem) -> InvoiceItem:
        subtotal = item.quantity * item.unit_price
        item.discount_amount = subtotal * (item.discount_percent / 100)
        after_discount = subtotal - item.discount_amount
        item.tax_amount = after_discount * (item.tax_percent / 100)
        item.total = after_discount + item.tax_amount
        return item
    
    async def _recalculate_invoice_totals(self, invoice: Invoice) -> Invoice:
        items = await InvoiceItem.find(
            {"invoice_id": invoice.id, "deleted_at": None}
        ).to_list()

        invoice.subtotal = sum(item.quantity * item.unit_price for item in items)
        invoice.discount_amount = invoice.subtotal * (invoice.discount_percent / 100)
        after_discount = invoice.subtotal - invoice.discount_amount
        invoice.tax_amount = after_discount * (invoice.tax_percent / 100)
        invoice.total = after_discount + invoice.tax_amount

        # Calculate payments
        payments = await Payment.find(
            {"invoice_id": invoice.id, "deleted_at": None}
        ).to_list()
        invoice.amount_paid = sum(p.amount for p in payments)
        invoice.balance_due = invoice.total - invoice.amount_paid
        
        # Update status based on payment
        if invoice.amount_paid >= invoice.total:
            invoice.status = "Paid"
        elif invoice.amount_paid > 0:
            invoice.status = "Partially Paid"
        elif invoice.due_date and invoice.due_date.replace(tzinfo=None) < datetime.utcnow() and invoice.status not in ["Draft", "Cancelled"]:
            invoice.status = "Overdue"
        
        await invoice.save()
        return invoice
    
    async def create_invoice(
        self,
        invoice_data: InvoiceCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Invoice:
        invoice_number = self._generate_invoice_number()
        
        invoice = Invoice(
            **invoice_data.model_dump(exclude_unset=True, exclude={'items', 'quote_id', 'opportunity_id', 'contact_id', 'account_id'}),
            invoice_number=invoice_number,
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        for field in ['quote_id', 'opportunity_id', 'contact_id', 'account_id']:
            val = getattr(invoice_data, field, None)
            if val:
                setattr(invoice, field, ObjectId(val))
        
        await invoice.insert()
        
        # Log invoice creation
        await self.log_entity_created(
            entity=invoice,
            entity_type="invoice",
            additional_data={
                "invoice_number": invoice.invoice_number,
                "total": invoice.total,
                "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
                "quote_id": str(invoice.quote_id) if invoice.quote_id else None,
                "opportunity_id": str(invoice.opportunity_id) if invoice.opportunity_id else None,
                "contact_id": str(invoice.contact_id) if invoice.contact_id else None,
                "account_id": str(invoice.account_id) if invoice.account_id else None
            }
        )
        
        for item_data in invoice_data.items:
            item = InvoiceItem(
                **item_data.model_dump(exclude_unset=True, exclude={'product_id'}),
                invoice_id=invoice.id,
                tenant_id=tenant_id
            )
            if item_data.product_id:
                item.product_id = ObjectId(item_data.product_id)
            item = self._calculate_item_totals(item)
            await item.insert()
        
        invoice = await self._recalculate_invoice_totals(invoice)
        return invoice
    
    async def get_invoice(self, invoice_id: str, tenant_id: ObjectId) -> Optional[Invoice]:
        try:
            oid = ObjectId(invoice_id)
        except Exception:
            return None
        return await Invoice.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )
    
    async def get_invoice_with_details(self, invoice_id: str, tenant_id: ObjectId) -> Optional[Dict]:
        invoice = await self.get_invoice(invoice_id, tenant_id)
        if not invoice:
            return None
        
        items = await InvoiceItem.find(
            {"invoice_id": invoice.id, "deleted_at": None}
        ).sort("+sort_order").to_list()

        payments = await Payment.find(
            {"invoice_id": invoice.id, "deleted_at": None}
        ).sort("-payment_date").to_list()
        
        return {"invoice": invoice, "items": items, "payments": payments}
    
    async def update_invoice(self, invoice_id: str, invoice_data: InvoiceUpdate, user_id: ObjectId, tenant_id: ObjectId) -> Optional[Invoice]:
        invoice = await self.get_invoice(invoice_id, tenant_id)
        if not invoice:
            return None
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        update_data = invoice_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            old_values[field] = getattr(invoice, field, None)
            setattr(invoice, field, value)
            updated_fields[field] = value
        
        invoice.last_modified_by_id = user_id
        invoice = await self._recalculate_invoice_totals(invoice)
        
        # Log update
        await self.log_entity_updated(
            entity=invoice,
            entity_type="invoice",
            old_values=old_values,
            updated_fields=updated_fields
        )
        
        return invoice
    
    async def delete_invoice(self, invoice_id: str, tenant_id: ObjectId, user_id: ObjectId = None) -> bool:
        invoice = await self.get_invoice(invoice_id, tenant_id)
        if not invoice:
            return False
        
        items = await InvoiceItem.find(InvoiceItem.invoice_id == invoice.id).to_list()
        for item in items:
            await item.soft_delete()
        
        payments = await Payment.find(Payment.invoice_id == invoice.id).to_list()
        for payment in payments:
            await payment.soft_delete()
        
        await invoice.soft_delete()
        
        # Log deletion
        await self.log_entity_deleted(
            entity=invoice,
            entity_type="invoice",
            additional_data={
                "invoice_number": invoice.invoice_number,
                "total": invoice.total,
                "status": invoice.status
            }
        )
        
        return True
    
    async def get_invoices_by_tenant(
        self,
        tenant_id: ObjectId,
        status: Optional[str] = None,
        owner_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Invoice]:
        query = {"tenant_id": tenant_id, "deleted_at": None}
        if status:
            query["status"] = status
        if owner_id:
            query["owner_id"] = ObjectId(owner_id)
        
        invoices = await Invoice.find(query).skip(skip).limit(limit).sort("-invoice_date").to_list()
        return invoices
    
    async def search_invoices(self, query: str, tenant_id: ObjectId, skip: int = 0, limit: int = 50) -> List[Invoice]:
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"invoice_number": {"$regex": query, "$options": "i"}}
            ]
        }
        return await Invoice.find(search_query).skip(skip).limit(limit).sort("-invoice_date").to_list()
    
    async def record_payment(self, invoice_id: str, payment_data: PaymentCreate, user_id: ObjectId, tenant_id: ObjectId) -> Optional[Payment]:
        invoice = await self.get_invoice(invoice_id, tenant_id)
        if not invoice:
            return None
        
        payment = Payment(
            **payment_data.model_dump(exclude_unset=True),
            invoice_id=invoice.id,
            tenant_id=tenant_id,
            recorded_by=user_id
        )
        if not payment.payment_date:
            payment.payment_date = datetime.utcnow()
        
        await payment.insert()
        
        # Log payment creation
        await self.log_entity_created(
            entity=payment,
            entity_type="payment",
            additional_data={
                "amount": payment.amount,
                "payment_method": payment.payment_method,
                "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
                "invoice_number": invoice.invoice_number,
                "invoice_id": str(invoice.id)
            }
        )
        
        await self._recalculate_invoice_totals(invoice)
        return payment
    
    async def add_item(self, invoice_id: str, item_data: InvoiceItemCreate, tenant_id: ObjectId) -> Optional[InvoiceItem]:
        invoice = await self.get_invoice(invoice_id, tenant_id)
        if not invoice:
            return None
        
        item = InvoiceItem(
            **item_data.model_dump(exclude_unset=True, exclude={'product_id'}),
            invoice_id=invoice.id,
            tenant_id=tenant_id
        )
        if item_data.product_id:
            item.product_id = ObjectId(item_data.product_id)
        
        item = self._calculate_item_totals(item)
        await item.insert()
        await self._recalculate_invoice_totals(invoice)
        return item
