"""
Territory service for managing sales territories and regions.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId

from app.models.territory import Region, Territory
from app.schemas.territory import (
    RegionCreate, RegionUpdate,
    TerritoryCreate, TerritoryUpdate,
    TerritoryAssignmentResponse
)


class TerritoryService:
    """Service for territory and region management."""
    
    # ==================== Region CRUD ====================
    
    async def create_region(
        self,
        data: RegionCreate,
        user_id: str,
        tenant_id: str
    ) -> Region:
        """Create a new region."""
        region = Region(
            **data.model_dump(),
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_id
        )
        await region.insert()
        return region
    
    async def get_region(
        self,
        region_id: str,
        tenant_id: str
    ) -> Optional[Region]:
        """Get a region by ID."""
        return await Region.find_one(
            Region.id == PydanticObjectId(region_id),
            Region.tenant_id == tenant_id
        )
    
    async def update_region(
        self,
        region_id: str,
        data: RegionUpdate,
        tenant_id: str
    ) -> Optional[Region]:
        """Update a region."""
        region = await self.get_region(region_id, tenant_id)
        if not region:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(region, key, value)
        
        await region.save()
        return region
    
    async def delete_region(
        self,
        region_id: str,
        tenant_id: str
    ) -> bool:
        """Delete a region."""
        region = await self.get_region(region_id, tenant_id)
        if not region:
            return False
        
        # Check for child territories
        child_territories = await Territory.find(
            Territory.region_id == region_id,
            Territory.tenant_id == tenant_id
        ).count()
        if child_territories > 0:
            raise ValueError("Cannot delete region with associated territories")
        
        # Check for child regions
        child_regions = await Region.find(
            Region.parent_id == region_id,
            Region.tenant_id == tenant_id
        ).count()
        if child_regions > 0:
            raise ValueError("Cannot delete region with child regions")
            
        await region.delete()
        return True
    
    async def list_regions(
        self,
        tenant_id: str,
        parent_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[Region], int]:
        """List regions with filtering."""
        query = {"tenant_id": tenant_id}
        
        if parent_id:
            query["parent_id"] = parent_id
            
        if is_active is not None:
            query["is_active"] = is_active
            
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
            
        total = await Region.find(query).count()
        
        regions = await Region.find(query)\
            .sort(Region.name)\
            .skip((page - 1) * per_page)\
            .limit(per_page)\
            .to_list()
            
        return regions, total
    
    # ==================== Territory CRUD ====================
    
    async def create_territory(
        self,
        data: TerritoryCreate,
        user_id: str,
        tenant_id: str
    ) -> Territory:
        """Create a new territory."""
        # Verify region exists
        region = await self.get_region(data.region_id, tenant_id)
        if not region:
            raise ValueError("Region not found")
            
        territory = Territory(
            **data.model_dump(),
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_id
        )
        await territory.insert()
        return territory
    
    async def get_territory(
        self,
        territory_id: str,
        tenant_id: str
    ) -> Optional[Territory]:
        """Get a territory by ID."""
        return await Territory.find_one(
            Territory.id == PydanticObjectId(territory_id),
            Territory.tenant_id == tenant_id
        )
    
    async def update_territory(
        self,
        territory_id: str,
        data: TerritoryUpdate,
        tenant_id: str
    ) -> Optional[Territory]:
        """Update a territory."""
        territory = await self.get_territory(territory_id, tenant_id)
        if not territory:
            return None
            
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(territory, key, value)
            
        await territory.save()
        return territory
    
    async def delete_territory(
        self,
        territory_id: str,
        tenant_id: str
    ) -> bool:
        """Delete a territory."""
        territory = await self.get_territory(territory_id, tenant_id)
        if not territory:
            return False
            
        # Check parent relationship
        child_territories = await Territory.find(
            Territory.parent_territory_id == territory_id,
            Territory.tenant_id == tenant_id
        ).count()
        if child_territories > 0:
            raise ValueError("Cannot delete territory with child territories")
            
        await territory.delete()
        return True
    
    async def list_territories(
        self,
        tenant_id: str,
        region_id: Optional[str] = None,
        parent_id: Optional[str] = None,
        user_id: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[Territory], int]:
        """List territories with filtering."""
        query = {"tenant_id": tenant_id}
        
        if region_id:
            query["region_id"] = region_id
            
        if parent_id:
            query["parent_territory_id"] = parent_id
            
        if user_id:
            query["$or"] = [
                {"users": user_id},
                {"manager_id": user_id}
            ]
            
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
            
        total = await Territory.find(query).count()
        
        territories = await Territory.find(query)\
            .sort(Territory.name)\
            .skip((page - 1) * per_page)\
            .limit(per_page)\
            .to_list()
            
        return territories, total
    
    # ==================== Assignment Logic ====================
    
    async def find_territory_for_address(
        self,
        tenant_id: str,
        country: Optional[str] = None,
        state: Optional[str] = None,
        postal_code: Optional[str] = None
    ) -> Optional[TerritoryAssignmentResponse]:
        """Find matching territory based on address."""
        if not any([country, state, postal_code]):
            return None
            
        # Fetch active territories with rules
        territories = await Territory.find(
            Territory.tenant_id == tenant_id,
            Territory.is_active == True
        ).to_list()
        
        # Priority 1: Postal Code Match (Exact)
        if postal_code:
            for t in territories:
                if postal_code in t.postal_codes:
                    return await self._build_assignment_response(t, "postal_code")
        
        # Priority 2: Postal Code Wildcard
        if postal_code:
            for t in territories:
                for pc in t.postal_codes:
                    if pc.endswith("*") and postal_code.startswith(pc[:-1]):
                        return await self._build_assignment_response(t, "postal_code_pattern")
        
        # Priority 3: State Match
        if state:
            for t in territories:
                if state in t.states:
                    return await self._build_assignment_response(t, "state")
                    
        # Priority 4: Country Match
        if country:
            for t in territories:
                if country in t.countries:
                    return await self._build_assignment_response(t, "country")
                    
        return None

    async def _build_assignment_response(
        self, 
        territory: Territory, 
        matched_by: str
    ) -> TerritoryAssignmentResponse:
        """Helper to build assignment response."""
        region = await Region.get(territory.region_id)
        return TerritoryAssignmentResponse(
            territory_id=str(territory.id),
            territory_name=territory.name,
            region_id=str(region.id) if region else None,
            region_name=region.name if region else None,
            matched_by=matched_by
        )


# Singleton instance
territory_service = TerritoryService()
