"""
Pydantic schemas for Quote API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class QuoteItemBase(BaseModel):
    """Base schema for QuoteItem"""
    name: str
    description: Optional[str] = None
    product_id: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0
    discount_percent: float = 0.0
    tax_percent: float = 0.0
    notes: Optional[str] = None
    sort_order: int = 0


class QuoteItemCreate(QuoteItemBase):
    """Schema for creating quote item"""
    pass


class QuoteItemUpdate(BaseModel):
    """Schema for updating quote item"""
    name: Optional[str] = None
    description: Optional[str] = None
    product_id: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    discount_percent: Optional[float] = None
    tax_percent: Optional[float] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class QuoteItemResponse(QuoteItemBase):
    """Schema for quote item response"""
    id: str
    quote_id: str
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
            if hasattr(obj, 'quote_id') and obj.quote_id:
                data['quote_id'] = str(obj.quote_id)
            if hasattr(obj, 'product_id') and obj.product_id:
                data['product_id'] = str(obj.product_id)
            
            return cls(**data)
        return cls()


class QuoteBase(BaseModel):
    """Base schema for Quote"""
    name: str
    opportunity_id: Optional[str] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    valid_until: Optional[datetime] = None
    currency: str = "USD"
    discount_percent: float = 0.0
    tax_percent: float = 0.0
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    travel_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    num_adults: int = 0
    num_children: int = 0
    num_infants: int = 0
    destinations: List[str] = Field(default_factory=list)


class QuoteCreate(QuoteBase):
    """Schema for creating quote"""
    items: List[QuoteItemCreate] = Field(default_factory=list)


class QuoteUpdate(BaseModel):
    """Schema for updating quote"""
    name: Optional[str] = None
    opportunity_id: Optional[str] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    status: Optional[str] = None
    valid_until: Optional[datetime] = None
    currency: Optional[str] = None
    discount_percent: Optional[float] = None
    tax_percent: Optional[float] = None
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    travel_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    num_adults: Optional[int] = None
    num_children: Optional[int] = None
    num_infants: Optional[int] = None
    destinations: Optional[List[str]] = None


class QuoteResponse(QuoteBase):
    """Schema for quote response"""
    id: str
    quote_number: str
    tenant_id: str
    owner_id: str
    status: str
    quote_date: datetime
    subtotal: float
    discount_amount: float
    tax_amount: float
    total: float
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
            if hasattr(obj, 'opportunity_id') and obj.opportunity_id:
                data['opportunity_id'] = str(obj.opportunity_id)
            if hasattr(obj, 'contact_id') and obj.contact_id:
                data['contact_id'] = str(obj.contact_id)
            if hasattr(obj, 'account_id') and obj.account_id:
                data['account_id'] = str(obj.account_id)
            
            return cls(**data)
        return cls()


class QuoteDetailResponse(QuoteResponse):
    """Schema for quote with items"""
    items: List[QuoteItemResponse] = Field(default_factory=list)


class QuoteListResponse(BaseModel):
    """Schema for list of quotes"""
    quotes: List[QuoteResponse]
    total: int
