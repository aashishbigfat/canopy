"""
Package service layer - Business logic for package management
"""
from typing import List, Optional
from bson import ObjectId
from app.models.package import Package, PackagePricing, PackageOpportunity
from app.schemas.package import PackageCreate, PackageUpdate, PackagePricingCreate
from app.models.opportunity import Opportunity

class PackageService:
    """Service for Package business logic"""
    
    async def create_package(
        self,
        package_data: PackageCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Package:
        """Create a new package with pricing tiers"""
        
        # Create package
        package = Package(
            **package_data.model_dump(exclude_unset=True, exclude={'pricing_tiers', 'destination_ids', 'itinerary_id'}),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        # Convert IDs
        if package_data.destination_ids:
            package.destination_ids = [ObjectId(d) for d in package_data.destination_ids]
        
        if package_data.itinerary_id:
            package.itinerary_id = ObjectId(package_data.itinerary_id)
        
        await package.insert()
        
        # Create pricing tiers
        if package_data.pricing_tiers:
            for tier_data in package_data.pricing_tiers:
                await self.create_pricing_tier(
                    str(package.id),
                    tier_data,
                    tenant_id
                )
        
        return package
    
    async def create_pricing_tier(
        self,
        package_id: str,
        tier_data: PackagePricingCreate,
        tenant_id: ObjectId
    ) -> PackagePricing:
        """Create a pricing tier for a package"""
        
        tier = PackagePricing(
            **tier_data.model_dump(exclude_unset=True),
            package_id=ObjectId(package_id),
            tenant_id=tenant_id
        )
        
        await tier.insert()
        return tier
    
    async def get_package(
        self,
        package_id: str,
        tenant_id: ObjectId
    ) -> Optional[Package]:
        """Get package by ID, scoped to tenant."""
        try:
            oid = ObjectId(package_id)
        except Exception:
            return None
        return await Package.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )
    
    async def get_package_with_pricing(
        self,
        package_id: str,
        tenant_id: ObjectId
    ) -> Optional[dict]:
        """Get package with all pricing tiers"""
        package = await self.get_package(package_id, tenant_id)
        
        if not package:
            return None
        
        # Get pricing tiers
        tiers = await PackagePricing.find(
            {"package_id": ObjectId(package_id), "tenant_id": tenant_id}
        ).to_list()
        
        return {
            "package": package,
            "pricing_tiers": tiers
        }
    
    async def update_package(
        self,
        package_id: str,
        package_data: PackageUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Package]:
        """Update a package"""
        package = await self.get_package(package_id, tenant_id)
        
        if not package:
            return None
        
        # Update fields
        update_data = package_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(package, field, value)
        
        package.last_modified_by_id = user_id
        await package.save()
        
        return package
    
    async def delete_package(
        self,
        package_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Soft delete a package"""
        package = await self.get_package(package_id, tenant_id)
        
        if not package:
            return False
        
        await package.soft_delete()
        return True
    
    async def get_packages_by_tenant(
        self,
        tenant_id: ObjectId,
        category: Optional[str] = None,
        is_featured: Optional[bool] = None
    ) -> List[Package]:
        """Get packages for a tenant"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_active": True
        }
        
        if category:
            query["category"] = category
        
        if is_featured is not None:
            query["is_featured"] = is_featured
        
        packages = await Package.find(query).sort("-created_at").to_list()
        return packages
    
    async def search_packages(
        self,
        query: str,
        tenant_id: ObjectId
    ) -> List[Package]:
        """Search packages"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"package_code": {"$regex": query, "$options": "i"}},
                {"category": {"$regex": query, "$options": "i"}}
            ]
        }
        
        packages = await Package.find(search_query).sort("+name").to_list()
        return packages
    
    async def link_to_opportunity(
        self,
        package_id: str,
        opportunity_id: str,
        tenant_id: ObjectId,
        custom_price: Optional[float] = None,
        notes: Optional[str] = None
    ) -> PackageOpportunity:
        """Link package to opportunity"""
        
        # Verify both entities exist and belong to the current tenant
        package = await Package.find_one(
            Package.id == ObjectId(package_id),
            Package.tenant_id == tenant_id
        )
        if not package:
            raise ValueError("Package not found or access denied")
            
        opportunity = await Opportunity.find_one(
            Opportunity.id == ObjectId(opportunity_id),
            Opportunity.tenant_id == tenant_id
        )
        if not opportunity:
            raise ValueError("Opportunity not found or access denied")
        
        # Check if already linked
        existing = await PackageOpportunity.find_one(
            PackageOpportunity.package_id == ObjectId(package_id),
            PackageOpportunity.opportunity_id == ObjectId(opportunity_id),
            PackageOpportunity.tenant_id == tenant_id
        )
        
        if existing:
            if custom_price is not None:
                existing.custom_price = custom_price
            if notes:
                existing.notes = notes
            await existing.save()
            return existing
        
        # Create new link
        link = PackageOpportunity(
            package_id=ObjectId(package_id),
            opportunity_id=ObjectId(opportunity_id),
            tenant_id=tenant_id,
            custom_price=custom_price,
            notes=notes
        )
        
        await link.insert()
        return link
    
    async def unlink_from_opportunity(
        self,
        package_id: str,
        opportunity_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Unlink package from opportunity"""
        
        link = await PackageOpportunity.find_one(
            PackageOpportunity.package_id == ObjectId(package_id),
            PackageOpportunity.opportunity_id == ObjectId(opportunity_id),
            PackageOpportunity.tenant_id == tenant_id
        )
        
        if link:
            await link.delete()
            return True
        
        return False
    
    async def get_packages_for_opportunity(
        self,
        opportunity_id: str,
        tenant_id: ObjectId
    ) -> List[dict]:
        """Get all packages linked to an opportunity"""
        
        links = await PackageOpportunity.find(
            {"opportunity_id": ObjectId(opportunity_id), "tenant_id": tenant_id}
        ).to_list()

        if not links:
            return []

        # Bulk tenant-scoped fetch
        pkg_ids = [link.package_id for link in links]
        packages = await Package.find(
            {"_id": {"$in": pkg_ids}, "tenant_id": tenant_id, "deleted_at": None}
        ).to_list()
        pkg_map = {p.id: p for p in packages}

        result = []
        for link in links:
            package = pkg_map.get(link.package_id)
            if package:
                result.append({
                    "package": package,
                    "custom_price": link.custom_price,
                    "notes": link.notes
                })

        return result
