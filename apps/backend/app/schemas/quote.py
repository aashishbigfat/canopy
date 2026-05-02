"""
Pydantic schemas for Quote API — Industry-agnostic

Travel-specific fields (travel_date, return_date, num_adults, etc.) are no
longer on these schemas.  They live inside `industry_data` and are validated
per-industry by schemas/industry_data/__init__.py.
"""
from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, List, Dict, Any, Annotated
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
    """Base schema for Quote — universal across all industries"""
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

    # Industry-specific data (validated per-industry via validate_industry_data)
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


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

    # Industry-specific data
    industry_data: Optional[Dict[str, Any]] = None


class QuoteResponse(BaseModel):
    """Schema for quote response — industry-agnostic"""
    id: Annotated[str, BeforeValidator(str)]
    quote_number: str
    name: str
    tenant_id: Annotated[str, BeforeValidator(str)]
    owner_id: Annotated[str, BeforeValidator(str)]
    opportunity_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    contact_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    account_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    status: str
    quote_date: datetime
    valid_until: Optional[datetime] = None
    currency: str = "USD"
    discount_percent: float = 0.0
    tax_percent: float = 0.0
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    subtotal: float = 0.0
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0

    # Industry-specific data (all industries)
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)

    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class QuoteDetailResponse(QuoteResponse):
    """Schema for quote with items"""
    items: List[QuoteItemResponse] = Field(default_factory=list)


class QuoteListResponse(BaseModel):
    """Schema for list of quotes"""
    quotes: List[QuoteResponse]
    total: int
