"""
Product model for travel products and services
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Product(BaseDocument):
    """Product model for travel products and services"""
    
    # Basic Information
    name: Indexed(str)
    description: Optional[str] = None
    product_code: Indexed(str)  # Unique code per tenant
    
    # Category & Type
    category: str  # Tour, Package, Add-on, Service, Transport, Accommodation, etc.
    product_type: Optional[str] = None  # Further classification
    
    # Pricing
    price: float = 0.0
    currency: str = "USD"
    cost_price: Optional[float] = None  # Cost to company
    
    # Availability
    is_active: bool = True
    is_featured: bool = False
    stock_quantity: Optional[int] = None  # For inventory tracking
    
    # Additional Details
    duration: Optional[str] = None  # e.g., "3 days", "2 hours"
    max_capacity: Optional[int] = None  # Max people
    min_capacity: Optional[int] = None  # Min people
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Metadata
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    class Settings:
        name = "products"
        # indexes = [
        # "tenant_id",
        # "product_code",
        # "category",
        # "is_featured",
        # [("tenant_id", 1), ("product_code", 1)],
            # [("tenant_id", 1), ("category", 1)],
            # [("tenant_id", 1), ("is_featured", 1)],
        # ]
