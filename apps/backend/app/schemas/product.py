"""
Pydantic schemas for Product API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProductBase(BaseModel):
    """Base schema for Product"""
    name: str
    description: Optional[str] = None
    product_code: str
    category: str
    product_type: Optional[str] = None
    price: float = 0.0
    currency: str = "USD"
    cost_price: Optional[float] = None
    is_featured: bool = False
    stock_quantity: Optional[int] = None
    duration: Optional[str] = None
    max_capacity: Optional[int] = None
    min_capacity: Optional[int] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class ProductCreate(ProductBase):
    """Schema for creating product"""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating product"""
    name: Optional[str] = None
    description: Optional[str] = None
    product_code: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    cost_price: Optional[float] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    stock_quantity: Optional[int] = None
    duration: Optional[str] = None
    max_capacity: Optional[int] = None
    min_capacity: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class ProductResponse(ProductBase):
    """Schema for product response"""
    id: str
    tenant_id: str
    is_active: bool
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
            
            return cls(**data)
        return cls()


class ProductListResponse(BaseModel):
    """Schema for list of products"""
    products: List[ProductResponse]
    total: int
