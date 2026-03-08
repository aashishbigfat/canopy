"""
Product API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
)
from app.services.product_service import ProductService
from app.api.deps import get_current_user, check_permission

router = APIRouter()


@router.post("/", response_model=ProductResponse, status_code=201)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(check_permission("create_product"))
):
    """Create a new product"""
    service = ProductService()
    
    try:
        product = await service.create_product(
            product_data,
            current_user.id,
            current_user.tenant_id
        )
        
        return ProductResponse.from_orm(product)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=ProductListResponse)
async def get_products(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_permission("view_product"))
):
    """Get all products with filters"""
    service = ProductService()
    
    products = await service.get_products_by_tenant(
        current_user.tenant_id,
        category=category,
        is_active=is_active,
        is_featured=is_featured,
        skip=skip,
        limit=limit
    )
    
    return ProductListResponse(
        products=[ProductResponse.from_orm(p) for p in products],
        total=len(products)
    )


@router.get("/search")
async def search_products(
    query: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(check_permission("view_product"))
):
    """Search products"""
    service = ProductService()
    
    products = await service.search_products(
        query,
        current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    
    return {
        "products": [ProductResponse.from_orm(p) for p in products],
        "total": len(products)
    }


@router.get("/featured")
async def get_featured_products(
    limit: int = 10,
    current_user: User = Depends(check_permission("view_product"))
):
    """Get featured products"""
    service = ProductService()
    
    products = await service.get_featured_products(
        current_user.tenant_id,
        limit=limit
    )
    
    return {
        "products": [ProductResponse.from_orm(p) for p in products],
        "total": len(products)
    }


@router.get("/category/{category}")
async def get_products_by_category(
    category: str,
    current_user: User = Depends(check_permission("view_product"))
):
    """Get all products for a category"""
    service = ProductService()
    
    products = await service.get_products_by_category(
        category,
        current_user.tenant_id
    )
    
    return {
        "products": [ProductResponse.from_orm(p) for p in products],
        "total": len(products)
    }


@router.get("/code/{product_code}", response_model=ProductResponse)
async def get_product_by_code(
    product_code: str,
    current_user: User = Depends(check_permission("view_product"))
):
    """Get product by product code"""
    service = ProductService()
    
    product = await service.get_product_by_code(
        product_code,
        current_user.tenant_id
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductResponse.from_orm(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: User = Depends(check_permission("view_product"))
):
    """Get product by ID"""
    service = ProductService()
    
    product = await service.get_product(product_id, current_user.tenant_id)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductResponse.from_orm(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: User = Depends(check_permission("edit_product"))
):
    """Update a product"""
    service = ProductService()
    
    try:
        product = await service.update_product(
            product_id,
            product_data,
            current_user.id,
            current_user.tenant_id
        )
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return ProductResponse.from_orm(product)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(check_permission("delete_product"))
):
    """Delete a product (soft delete)"""
    service = ProductService()
    
    success = await service.delete_product(product_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {
        "error": False,
        "message": "Product deleted successfully"
    }
