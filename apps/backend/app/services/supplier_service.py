"""
Supplier service layer - Business logic for supplier management
"""
from typing import List, Optional, Tuple
from bson import ObjectId
from app.models.supplier import Supplier, OpportunitySupplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate

class SupplierService:
    """Service for Supplier business logic"""
    
    async def create_supplier(
        self,
        supplier_data: SupplierCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Supplier:
        """Create a new supplier"""
        
        supplier = Supplier(
            **supplier_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        await supplier.insert()
        return supplier
    
    async def get_supplier(
        self,
        supplier_id: str,
        tenant_id: ObjectId
    ) -> Optional[Supplier]:
        """Get supplier by ID"""
        supplier = await Supplier.get(ObjectId(supplier_id))
        
        if supplier and supplier.tenant_id == tenant_id and not supplier.deleted_at:
            return supplier
        return None
    
    async def update_supplier(
        self,
        supplier_id: str,
        supplier_data: SupplierUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Supplier]:
        """Update a supplier"""
        supplier = await self.get_supplier(supplier_id, tenant_id)
        
        if not supplier:
            return None
        
        # Update fields
        update_data = supplier_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(supplier, field, value)
        
        supplier.last_modified_by_id = user_id
        await supplier.save()
        
        return supplier
    
    async def delete_supplier(
        self,
        supplier_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Soft delete a supplier"""
        supplier = await self.get_supplier(supplier_id, tenant_id)
        
        if not supplier:
            return False
        
        await supplier.soft_delete()
        return True
    
    async def get_suppliers_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10,
        supplier_type: Optional[str] = None,
        is_preferred: Optional[bool] = None
    ) -> Tuple[List[Supplier], int]:
        """Get suppliers for a tenant with pagination"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_active": True
        }
        
        if supplier_type:
            query["supplier_type"] = supplier_type
        
        if is_preferred is not None:
            query["is_preferred"] = is_preferred
        
        # Get total count
        total = await Supplier.find(query).count()
        
        # Get paginated results
        suppliers = await Supplier.find(query)\
            .sort("+name")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return suppliers, total
    
    async def search_suppliers(
        self,
        query: str,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10
    ) -> Tuple[List[Supplier], int]:
        """Search suppliers"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"company_name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"city": {"$regex": query, "$options": "i"}}
            ]
        }
        
        # Get total count
        total = await Supplier.find(search_query).count()
        
        # Get results
        suppliers = await Supplier.find(search_query)\
            .sort("+name")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return suppliers, total
    
    async def link_to_opportunity(
        self,
        opportunity_id: str,
        supplier_id: str,
        tenant_id: ObjectId,
        cost: Optional[float] = None,
        notes: Optional[str] = None,
        email_subject: Optional[str] = None,
        email_body: Optional[str] = None
    ) -> OpportunitySupplier:
        """Link supplier to opportunity"""
        
        # Check if already linked
        existing = await OpportunitySupplier.find_one({
            "opportunity_id": ObjectId(opportunity_id),
            "supplier_id": ObjectId(supplier_id),
            "tenant_id": tenant_id
        })
        
        if existing:
            # Update existing
            if cost is not None:
                existing.cost = cost
            if notes:
                existing.notes = notes
            if email_subject:
                existing.email_subject = email_subject
            if email_body:
                existing.email_body = email_body
            await existing.save()
            return existing
        
        # Create new link
        link = OpportunitySupplier(
            opportunity_id=ObjectId(opportunity_id),
            supplier_id=ObjectId(supplier_id),
            tenant_id=tenant_id,
            cost=cost,
            notes=notes,
            email_subject=email_subject,
            email_body=email_body
        )
        
        await link.insert()
        return link
    
    async def unlink_from_opportunity(
        self,
        opportunity_id: str,
        supplier_id: str
    ) -> bool:
        """Unlink supplier from opportunity"""
        
        link = await OpportunitySupplier.find_one({
            "opportunity_id": ObjectId(opportunity_id),
            "supplier_id": ObjectId(supplier_id)
        })
        
        if link:
            await link.delete()
            return True
        
        return False
    
    async def get_suppliers_for_opportunity(
        self,
        opportunity_id: str,
        tenant_id: ObjectId
    ) -> List[dict]:
        """Get all suppliers linked to an opportunity"""
        
        links = await OpportunitySupplier.find({
            "opportunity_id": ObjectId(opportunity_id),
            "tenant_id": tenant_id
        }).to_list()
        
        result = []
        for link in links:
            supplier = await Supplier.get(link.supplier_id)
            if supplier:
                result.append({
                    "supplier": supplier,
                    "cost": link.cost,
                    "notes": link.notes,
                    "email_subject": link.email_subject,
                    "email_body": link.email_body
                })
        
        return result
