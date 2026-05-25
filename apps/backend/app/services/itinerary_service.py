"""
Itinerary service layer - Business logic for itinerary management
"""
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, date
from app.models.itinerary import Itinerary, ItineraryDay, ItineraryOpportunity
from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate, ItineraryDayCreate
from app.models.opportunity import Opportunity

class ItineraryService:
    """Service for Itinerary business logic"""
    
    async def create_itinerary(
        self,
        itinerary_data: ItineraryCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Itinerary:
        """Create a new itinerary with days"""
        
        # Create itinerary
        itinerary = Itinerary(
            **itinerary_data.model_dump(exclude_unset=True, exclude={'days', 'destination_ids'}),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        # Convert destination IDs
        if itinerary_data.destination_ids:
            itinerary.destination_ids = [ObjectId(d) for d in itinerary_data.destination_ids]
        
        await itinerary.insert()
        
        # Create days
        if itinerary_data.days:
            for day_data in itinerary_data.days:
                await self.create_itinerary_day(
                    str(itinerary.id),
                    day_data,
                    tenant_id
                )
        
        return itinerary
    
    async def create_itinerary_day(
        self,
        itinerary_id: str,
        day_data: ItineraryDayCreate,
        tenant_id: ObjectId
    ) -> ItineraryDay:
        """Create a day for an itinerary"""
        
        day = ItineraryDay(
            **day_data.model_dump(exclude_unset=True, exclude={'destination_id'}),
            itinerary_id=ObjectId(itinerary_id),
            tenant_id=tenant_id
        )
        
        if day_data.destination_id:
            day.destination_id = ObjectId(day_data.destination_id)
        
        await day.insert()
        return day
    
    async def get_itinerary(
        self,
        itinerary_id: str,
        tenant_id: ObjectId
    ) -> Optional[Itinerary]:
        """Get itinerary by ID"""
        itinerary = await Itinerary.get(ObjectId(itinerary_id))
        
        if itinerary and itinerary.tenant_id == tenant_id and not itinerary.deleted_at:
            return itinerary
        return None
    
    async def get_itinerary_with_days(
        self,
        itinerary_id: str,
        tenant_id: ObjectId
    ) -> Optional[dict]:
        """Get itinerary with all days"""
        itinerary = await self.get_itinerary(itinerary_id, tenant_id)
        
        if not itinerary:
            return None
        
        # Get all days
        days = await ItineraryDay.find(
            {"itinerary_id": ObjectId(itinerary_id), "tenant_id": tenant_id}
        ).sort("+day_number").to_list()
        
        return {
            "itinerary": itinerary,
            "days": days
        }
    
    async def update_itinerary(
        self,
        itinerary_id: str,
        itinerary_data: ItineraryUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Itinerary]:
        """Update an itinerary"""
        itinerary = await self.get_itinerary(itinerary_id, tenant_id)
        
        if not itinerary:
            return None
        
        # Update fields
        update_data = itinerary_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(itinerary, field, value)
        
        itinerary.last_modified_by_id = user_id
        await itinerary.save()
        
        return itinerary
    
    async def delete_itinerary(
        self,
        itinerary_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Soft delete an itinerary"""
        itinerary = await self.get_itinerary(itinerary_id, tenant_id)
        
        if not itinerary:
            return False
        
        await itinerary.soft_delete()
        return True
    
    async def get_itineraries_by_tenant(
        self,
        tenant_id: ObjectId,
        is_template: Optional[bool] = None
    ) -> List[Itinerary]:
        """Get itineraries for a tenant"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_active": True
        }
        
        if is_template is not None:
            query["is_template"] = is_template
        
        itineraries = await Itinerary.find(query).sort("-created_at").to_list()
        return itineraries
    
    async def link_to_opportunity(
        self,
        itinerary_id: str,
        opportunity_id: str,
        tenant_id: ObjectId,
        notes: Optional[str] = None
    ) -> ItineraryOpportunity:
        """Link itinerary to opportunity"""
        
        # Verify both entities exist and belong to the current tenant
        itinerary = await Itinerary.find_one(
            Itinerary.id == ObjectId(itinerary_id),
            Itinerary.tenant_id == tenant_id
        )
        if not itinerary:
            raise ValueError("Itinerary not found or access denied")
            
        opportunity = await Opportunity.find_one(
            Opportunity.id == ObjectId(opportunity_id),
            Opportunity.tenant_id == tenant_id
        )
        if not opportunity:
            raise ValueError("Opportunity not found or access denied")
        
        # Check if already linked
        existing = await ItineraryOpportunity.find_one(
            ItineraryOpportunity.itinerary_id == ObjectId(itinerary_id),
            ItineraryOpportunity.opportunity_id == ObjectId(opportunity_id),
            ItineraryOpportunity.tenant_id == tenant_id
        )
        
        if existing:
            if notes:
                existing.notes = notes
                await existing.save()
            return existing
        
        # Create new link
        link = ItineraryOpportunity(
            itinerary_id=ObjectId(itinerary_id),
            opportunity_id=ObjectId(opportunity_id),
            tenant_id=tenant_id,
            notes=notes
        )
        
        await link.insert()
        return link
    
    async def unlink_from_opportunity(
        self,
        itinerary_id: str,
        opportunity_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Unlink itinerary from opportunity"""
        
        link = await ItineraryOpportunity.find_one(
            ItineraryOpportunity.itinerary_id == ObjectId(itinerary_id),
            ItineraryOpportunity.opportunity_id == ObjectId(opportunity_id),
            ItineraryOpportunity.tenant_id == tenant_id
        )
        
        if link:
            await link.delete()
            return True
        
        return False
    
    async def get_itineraries_for_opportunity(
        self,
        opportunity_id: str,
        tenant_id: ObjectId
    ) -> List[dict]:
        """Get all itineraries linked to an opportunity"""
        
        links = await ItineraryOpportunity.find(
            {"opportunity_id": ObjectId(opportunity_id), "tenant_id": tenant_id}
        ).to_list()
        
        result = []
        for link in links:
            itinerary = await Itinerary.get(link.itinerary_id)
            if itinerary:
                result.append({
                    "itinerary": itinerary,
                    "notes": link.notes
                })
        
        return result
