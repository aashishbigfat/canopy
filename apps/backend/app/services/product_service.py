"""
Product service layer - Business logic for product management
"""
from typing import List, Optional
from bson import ObjectId
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    """Service for Product business logic"""
    
    async def create_product(
        self,
        product_data: ProductCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Product:
        """Create a new product"""
        
        # Check if product code already exists for this tenant
        existing = await Product.find_one(
            Product.product_code == product_data.product_code,
            Product.tenant_id == tenant_id,
            Product.deleted_at == None
        )
        
        if existing:
            raise ValueError(f"Product with code '{product_data.product_code}' already exists")
        
        # Create product
        product = Product(
            **product_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        await product.insert()
        return product
    
    async def get_product(
        self,
        product_id: str,
        tenant_id: ObjectId
    ) -> Optional[Product]:
        """Get product by ID"""
        product = await Product.get(ObjectId(product_id))
        
        if product and product.tenant_id == tenant_id and not product.deleted_at:
            return product
        return None
    
    async def get_product_by_code(
        self,
        product_code: str,
        tenant_id: ObjectId
    ) -> Optional[Product]:
        """Get product by product code"""
        product = await Product.find_one(
            Product.product_code == product_code,
            Product.tenant_id == tenant_id,
            Product.deleted_at == None
        )
        return product
    
    async def update_product(
        self,
        product_id: str,
        product_data: ProductUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Product]:
        """Update a product"""
        product = await self.get_product(product_id, tenant_id)
        
        if not product:
            return None
        
        # Check if product code is being changed to a different existing code
        if product_data.product_code and product_data.product_code != product.product_code:
            existing = await Product.find_one(
                Product.product_code == product_data.product_code,
                Product.tenant_id == tenant_id,
                Product.deleted_at == None,
                Product.id != ObjectId(product_id)  # Exclude current product
            )
            if existing:
                raise ValueError(f"Product with code '{product_data.product_code}' already exists")
        
        # Update fields
        update_data = product_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)
        
        product.last_modified_by_id = user_id
        await product.save()
        
        return product
    
    async def delete_product(
        self,
        product_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Soft delete a product"""
        product = await self.get_product(product_id, tenant_id)
        
        if not product:
            return False
        
        await product.soft_delete()
        return True
    
    async def get_products_by_tenant(
        self,
        tenant_id: ObjectId,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_featured: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """Get products for a tenant with filters"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if category:
            query["category"] = category
        
        if is_active is not None:
            query["is_active"] = is_active
        
        if is_featured is not None:
            query["is_featured"] = is_featured
        
        products = await Product.find(query).skip(skip).limit(limit).sort("+name").to_list()
        return products
    
    async def search_products(
        self,
        query: str,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 50
    ) -> List[Product]:
        """Search products"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"product_code": {"$regex": query, "$options": "i"}},
                {"category": {"$regex": query, "$options": "i"}}
            ]
        }
        
        products = await Product.find(search_query).skip(skip).limit(limit).sort("+name").to_list()
        return products
    
    async def get_featured_products(
        self,
        tenant_id: ObjectId,
        limit: int = 10
    ) -> List[Product]:
        """Get featured products"""
        
        products = await Product.find(
            Product.tenant_id == tenant_id,
            Product.is_featured == True,
            Product.is_active == True,
            Product.deleted_at == None
        ).limit(limit).sort("+name").to_list()
        
        return products
    
    async def get_products_by_category(
        self,
        category: str,
        tenant_id: ObjectId
    ) -> List[Product]:
        """Get all products for a specific category"""
        
        products = await Product.find(
            Product.category == category,
            Product.tenant_id == tenant_id,
            Product.is_active == True,
            Product.deleted_at == None
        ).sort("+name").to_list()
        
        return products
