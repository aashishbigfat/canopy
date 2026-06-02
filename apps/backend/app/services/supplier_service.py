"""
Supplier service layer - Business logic for supplier management
"""
from typing import List, Optional, Tuple
from bson import ObjectId
import json
from app.models.supplier import Supplier, OpportunitySupplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.models.opportunity import Opportunity
from app.services import field_registry_service
from app.schemas.field_registry import CustomFieldValuePayload
from app.mixins.activity_mixin import ActivityMixin

class SupplierService(ActivityMixin):
    """Service for Supplier business logic"""

    async def create_supplier(
        self,
        supplier_data: SupplierCreate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: list = None,
    ) -> Supplier:
        """Create a new supplier"""

        supplier = Supplier(
            **supplier_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )

        await supplier.insert()

        # Custom fields write (Phase 1 §A)
        if custom_fields:
            payloads = [
                CustomFieldValuePayload(
                    additional_field_id=ObjectId(f["id"]),
                    field_value=json.dumps(f["value"]) if not isinstance(f.get("value"), str) else f["value"],
                )
                for f in custom_fields if f.get("id") is not None
            ]
            await field_registry_service.write_custom_field_values(
                "supplier", supplier.id, payloads, tenant_id,
            )

        # Log creation
        await self.log_entity_created(entity=supplier, entity_type="supplier")

        return supplier

    async def get_supplier(
        self,
        supplier_id: str,
        tenant_id: ObjectId
    ) -> Optional[Supplier]:
        """Get supplier by ID, scoped to tenant."""
        try:
            oid = ObjectId(supplier_id)
        except Exception:
            return None
        return await Supplier.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )
    
    async def update_supplier(
        self,
        supplier_id: str,
        supplier_data: SupplierUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: list = None,
    ) -> Optional[Supplier]:
        """Update a supplier"""
        supplier = await self.get_supplier(supplier_id, tenant_id)

        if not supplier:
            return None

        # Update fields (tracking old values for the activity log)
        old_values = {}
        updated_fields = {}
        update_data = supplier_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            old_values[field] = getattr(supplier, field, None)
            setattr(supplier, field, value)
            updated_fields[field] = value

        supplier.last_modified_by_id = user_id
        await supplier.save()

        # Custom fields write (Phase 1 §A)
        if custom_fields:
            payloads = [
                CustomFieldValuePayload(
                    additional_field_id=ObjectId(f["id"]),
                    field_value=json.dumps(f["value"]) if not isinstance(f.get("value"), str) else f["value"],
                )
                for f in custom_fields if f.get("id") is not None
            ]
            await field_registry_service.write_custom_field_values(
                "supplier", supplier.id, payloads, tenant_id,
            )

        # Log update
        await self.log_entity_updated(
            entity=supplier,
            entity_type="supplier",
            old_values=old_values,
            updated_fields=updated_fields,
        )

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

        # Log deletion
        await self.log_entity_deleted(entity=supplier, entity_type="supplier")

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
        
        # Verify both entities exist and belong to the current tenant
        opportunity = await Opportunity.find_one(
            Opportunity.id == ObjectId(opportunity_id),
            Opportunity.tenant_id == tenant_id
        )
        if not opportunity:
            raise ValueError("Opportunity not found or access denied")
            
        supplier = await Supplier.find_one(
            Supplier.id == ObjectId(supplier_id),
            Supplier.tenant_id == tenant_id
        )
        if not supplier:
            raise ValueError("Supplier not found or access denied")
        
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
        supplier_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Unlink supplier from opportunity"""
        
        link = await OpportunitySupplier.find_one({
            "opportunity_id": ObjectId(opportunity_id),
            "supplier_id": ObjectId(supplier_id),
            "tenant_id": tenant_id
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

        if not links:
            return []

        # Bulk tenant-scoped fetch
        sup_ids = [link.supplier_id for link in links]
        suppliers = await Supplier.find(
            {"_id": {"$in": sup_ids}, "tenant_id": tenant_id, "deleted_at": None}
        ).to_list()
        sup_map = {s.id: s for s in suppliers}

        result = []
        for link in links:
            supplier = sup_map.get(link.supplier_id)
            if supplier:
                result.append({
                    "supplier": supplier,
                    "cost": link.cost,
                    "notes": link.notes,
                    "email_subject": link.email_subject,
                    "email_body": link.email_body
                })

        return result
