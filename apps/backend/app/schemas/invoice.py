"""
Pydantic schemas for Invoice API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class InvoiceItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    product_id: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0
    discount_percent: float = 0.0
    tax_percent: float = 0.0
    notes: Optional[str] = None
    sort_order: int = 0


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: str
    invoice_id: str
    discount_amount: float
    tax_amount: float
    total: float
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'invoice_id') and obj.invoice_id:
                data['invoice_id'] = str(obj.invoice_id)
            if hasattr(obj, 'product_id') and obj.product_id:
                data['product_id'] = str(obj.product_id)
            
            return cls(**data)
        return cls()


class PaymentBase(BaseModel):
    amount: float
    payment_date: Optional[datetime] = None
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    id: str
    invoice_id: str
    recorded_by: str
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'invoice_id') and obj.invoice_id:
                data['invoice_id'] = str(obj.invoice_id)
            if hasattr(obj, 'recorded_by') and obj.recorded_by:
                data['recorded_by'] = str(obj.recorded_by)
            
            return cls(**data)
        return cls()


class InvoiceBase(BaseModel):
    name: str
    quote_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    due_date: Optional[datetime] = None
    currency: str = "USD"
    discount_percent: float = 0.0
    tax_percent: float = 0.0
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate] = Field(default_factory=list)


class InvoiceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    discount_percent: Optional[float] = None
    tax_percent: Optional[float] = None
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    id: str
    invoice_number: str
    tenant_id: str
    owner_id: str
    status: str
    invoice_date: datetime
    subtotal: float
    discount_amount: float
    tax_amount: float
    total: float
    amount_paid: float
    balance_due: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            if hasattr(obj, 'owner_id') and obj.owner_id:
                data['owner_id'] = str(obj.owner_id)
            if hasattr(obj, 'quote_id') and obj.quote_id:
                data['quote_id'] = str(obj.quote_id)
            if hasattr(obj, 'opportunity_id') and obj.opportunity_id:
                data['opportunity_id'] = str(obj.opportunity_id)
            if hasattr(obj, 'contact_id') and obj.contact_id:
                data['contact_id'] = str(obj.contact_id)
            if hasattr(obj, 'account_id') and obj.account_id:
                data['account_id'] = str(obj.account_id)
            
            return cls(**data)
        return cls()


class InvoiceDetailResponse(InvoiceResponse):
    items: List[InvoiceItemResponse] = Field(default_factory=list)
    payments: List[PaymentResponse] = Field(default_factory=list)


class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceResponse]
    total: int
