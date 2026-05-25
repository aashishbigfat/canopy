"""
Destination service layer - Business logic for destination management
"""
from typing import List, Optional, Dict
from bson import ObjectId
from app.models.destination import Destination, DestinationOpportunity, DestinationLead
from app.schemas.destination import DestinationCreate, DestinationUpdate, DestinationLinkRequest
from app.models.opportunity import Opportunity
from app.models.lead import Lead


class DestinationService:
    """Service for Destination business logic"""
    
    async def create_destination(
        self,
        destination_data: DestinationCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Destination:
        """Create a new destination"""
        
        # 🚨 REMOVED: Strict name uniqueness check
        # Business logic: Multiple destinations can have same name
        # (different packages, vendors, experiences for same location)
        
        # Create destination
        destination = Destination(
            **destination_data.model_dump(exclude_unset=True, exclude={'state_id', 'city_id'}),
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # Convert state_id and city_id if provided
        if destination_data.state_id:
            destination.state_id = ObjectId(destination_data.state_id)
        if destination_data.city_id:
            destination.city_id = ObjectId(destination_data.city_id)
        
        await destination.insert()
        return destination
    
    async def get_destination(
        self,
        destination_id: str,
        tenant_id: ObjectId
    ) -> Optional[Destination]:
        """Get destination by ID"""
        destination = await Destination.get(ObjectId(destination_id))
        
        if destination and destination.tenant_id == tenant_id and not destination.deleted_at:
            return destination
        return None
    
    async def get_destination_with_counts(
        self,
        destination_id: str,
        tenant_id: ObjectId
    ) -> Optional[Dict]:
        """Get destination with relationship counts"""
        destination = await self.get_destination(destination_id, tenant_id)
        
        if not destination:
            return None
        
        # Count relationships
        opportunity_count = await DestinationOpportunity.find(
            {"destination_id": ObjectId(destination_id), "tenant_id": tenant_id}
        ).count()

        lead_count = await DestinationLead.find(
            {"destination_id": ObjectId(destination_id), "tenant_id": tenant_id}
        ).count()
        
        # Count itineraries (if DestinationItinerary exists)
        itinerary_count = 0
        # TODO: Implement when DestinationItinerary model is available
        
        return {
            "destination": destination,
            "opportunity_count": opportunity_count,
            "lead_count": lead_count,
            "itinerary_count": itinerary_count
        }
    
    async def update_destination(
        self,
        destination_id: str,
        destination_data: DestinationUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Destination]:
        """Update a destination"""
        destination = await self.get_destination(destination_id, tenant_id)
        
        if not destination:
            return None
        
        # 🚨 REMOVED: Name uniqueness check for updates
        # Business logic: Allow multiple destinations with same name
        
        # Update fields
        update_data = destination_data.model_dump(exclude_unset=True, exclude={'state_id', 'city_id'})
        for field, value in update_data.items():
            setattr(destination, field, value)
        
        # Handle state_id and city_id
        if destination_data.state_id is not None:
            destination.state_id = ObjectId(destination_data.state_id) if destination_data.state_id else None
        if destination_data.city_id is not None:
            destination.city_id = ObjectId(destination_data.city_id) if destination_data.city_id else None
        
        destination.last_modified_by_id = user_id
        await destination.save()
        
        return destination
    
    async def delete_destination(
        self,
        destination_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Soft delete a destination"""
        destination = await self.get_destination(destination_id, tenant_id)
        
        if not destination:
            return False
        
        await destination.soft_delete()
        return True
    
    async def get_destinations_by_tenant(
        self,
        tenant_id: ObjectId,
        country_id: Optional[str] = None,
        is_popular: Optional[bool] = None,
        is_active: Optional[bool] = None,
        destination_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Destination]:
        """Get destinations for a tenant with filters"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if country_id:
            query["country_id"] = country_id
        
        if is_popular is not None:
            query["is_popular"] = is_popular
        
        if is_active is not None:
            query["is_active"] = is_active
        
        if destination_type:
            query["destination_type"] = destination_type
        
        destinations = await Destination.find(query).skip(skip).limit(limit).sort("+name").to_list()
        return destinations
    
    async def search_destinations(
        self,
        query: str,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 50
    ) -> List[Destination]:
        """Search destinations"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"country_id": {"$regex": query, "$options": "i"}},
                {"destination_type": {"$regex": query, "$options": "i"}}
            ]
        }
        
        destinations = await Destination.find(search_query).skip(skip).limit(limit).sort("+name").to_list()
        return destinations
    
    async def link_to_opportunity(
        self,
        destination_id: str,
        opportunity_id: str,
        tenant_id: ObjectId,
        link_data: DestinationLinkRequest
    ) -> DestinationOpportunity:
        """Link destination to opportunity"""
        
        # Verify both entities exist and belong to the current tenant
        destination = await Destination.find_one(
            Destination.id == ObjectId(destination_id),
            Destination.tenant_id == tenant_id
        )
        if not destination:
            raise ValueError("Destination not found or access denied")
            
        opportunity = await Opportunity.find_one(
            Opportunity.id == ObjectId(opportunity_id),
            Opportunity.tenant_id == tenant_id
        )
        if not opportunity:
            raise ValueError("Opportunity not found or access denied")
        
        # Check if already linked
        existing = await DestinationOpportunity.find_one(
            DestinationOpportunity.destination_id == ObjectId(destination_id),
            DestinationOpportunity.opportunity_id == ObjectId(opportunity_id),
            DestinationOpportunity.tenant_id == tenant_id
        )
        
        if existing:
            # Update existing link
            existing.is_primary = link_data.is_primary
            if link_data.notes:
                existing.notes = link_data.notes
            await existing.save()
            return existing
        
        # Create new link
        link = DestinationOpportunity(
            destination_id=ObjectId(destination_id),
            opportunity_id=ObjectId(opportunity_id),
            tenant_id=tenant_id,
            is_primary=link_data.is_primary,
            notes=link_data.notes
        )
        
        await link.insert()
        return link
    
    async def unlink_from_opportunity(
        self,
        destination_id: str,
        opportunity_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Unlink destination from opportunity"""
        
        link = await DestinationOpportunity.find_one(
            DestinationOpportunity.destination_id == ObjectId(destination_id),
            DestinationOpportunity.opportunity_id == ObjectId(opportunity_id),
            DestinationOpportunity.tenant_id == tenant_id
        )
        
        if link:
            await link.delete()
            return True
        
        return False
    
    async def get_destinations_for_opportunity(
        self,
        opportunity_id: str,
        tenant_id: ObjectId
    ) -> List[Dict]:
        """Get all destinations linked to an opportunity"""
        
        links = await DestinationOpportunity.find(
            {"opportunity_id": ObjectId(opportunity_id), "tenant_id": tenant_id}
        ).to_list()
        
        result = []
        for link in links:
            destination = await Destination.get(link.destination_id)
            if destination and not destination.deleted_at:
                result.append({
                    "destination": destination,
                    "is_primary": link.is_primary,
                    "notes": link.notes
                })
        
        return result
    
    async def link_to_lead(
        self,
        destination_id: str,
        lead_id: str,
        tenant_id: ObjectId,
        link_data: DestinationLinkRequest
    ) -> DestinationLead:
        """Link destination to lead"""
        
        # Verify both entities exist and belong to the current tenant
        destination = await Destination.find_one(
            Destination.id == ObjectId(destination_id),
            Destination.tenant_id == tenant_id
        )
        if not destination:
            raise ValueError("Destination not found or access denied")
            
        lead = await Lead.find_one(
            Lead.id == ObjectId(lead_id),
            Lead.tenant_id == tenant_id
        )
        if not lead:
            raise ValueError("Lead not found or access denied")
        
        # Check if already linked
        existing = await DestinationLead.find_one(
            DestinationLead.destination_id == ObjectId(destination_id),
            DestinationLead.lead_id == ObjectId(lead_id),
            DestinationLead.tenant_id == tenant_id
        )
        
        if existing:
            # Update existing link
            existing.is_primary = link_data.is_primary
            if link_data.notes:
                existing.notes = link_data.notes
            await existing.save()
            return existing
        
        # Create new link
        link = DestinationLead(
            destination_id=ObjectId(destination_id),
            lead_id=ObjectId(lead_id),
            tenant_id=tenant_id,
            is_primary=link_data.is_primary,
            notes=link_data.notes
        )
        
        await link.insert()
        return link
    
    async def unlink_from_lead(
        self,
        destination_id: str,
        lead_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Unlink destination from lead"""
        
        link = await DestinationLead.find_one(
            DestinationLead.destination_id == ObjectId(destination_id),
            DestinationLead.lead_id == ObjectId(lead_id),
            DestinationLead.tenant_id == tenant_id
        )
        
        if link:
            await link.delete()
            return True
        
        return False
    
    async def get_destinations_for_lead(
        self,
        lead_id: str,
        tenant_id: ObjectId
    ) -> List[Dict]:
        """Get all destinations linked to a lead"""
        
        links = await DestinationLead.find(
            {"lead_id": ObjectId(lead_id), "tenant_id": tenant_id}
        ).to_list()
        
        result = []
        for link in links:
            destination = await Destination.get(link.destination_id)
            if destination and not destination.deleted_at:
                result.append({
                    "destination": destination,
                    "is_primary": link.is_primary,
                    "notes": link.notes
                })
        
        return result
    
    async def get_popular_destinations(
        self,
        tenant_id: ObjectId,
        limit: int = 10
    ) -> List[Destination]:
        """Get popular destinations"""
        
        destinations = await Destination.find(
            {"tenant_id": tenant_id, "is_popular": True, "is_active": True, "deleted_at": None}
        ).limit(limit).sort("+name").to_list()
        
        return destinations
    
    async def get_destinations_by_country(
        self,
        country_id: str,
        tenant_id: ObjectId
    ) -> List[Destination]:
        """Get all destinations for a specific country"""
        
        destinations = await Destination.find(
            {"country_id": country_id, "tenant_id": tenant_id, "is_active": True, "deleted_at": None}
        ).sort("+name").to_list()
        
        return destinations
