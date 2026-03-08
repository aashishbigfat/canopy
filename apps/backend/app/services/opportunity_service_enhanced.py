"""
Enhanced Opportunity service with comprehensive activity logging
"""
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime

from app.models.opportunity import Opportunity
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate
from app.mixins.activity_mixin import ActivityMixin


class OpportunityService(ActivityMixin):
    """Service for Opportunity business logic with comprehensive activity logging"""
    
    async def create_opportunity(
        self,
        opportunity_data: OpportunityCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Opportunity:
        """Create a new opportunity with activity logging"""
        
        opportunity = Opportunity(
            **opportunity_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            created_by=user_id,
            owner_id=user_id
        )
        
        await opportunity.insert()
        
        # Log opportunity creation
        await self.log_entity_created(
            entity=opportunity,
            entity_type="opportunity",
            additional_data={
                "lead_id": str(opportunity.lead_id) if opportunity.lead_id else None,
                "expected_revenue": opportunity.expected_revenue,
                "probability": opportunity.probability
            }
        )
        
        return opportunity
    
    async def update_opportunity(
        self,
        opportunity_id: str,
        opportunity_data: OpportunityUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Update an opportunity with activity logging"""
        opportunity = await self.get_opportunity(opportunity_id, tenant_id)
        
        if not opportunity:
            return None
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        # Check for status change
        old_status = opportunity.status
        new_status = opportunity_data.status
        
        # Update fields
        update_data = opportunity_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            old_value = getattr(opportunity, field, None)
            old_values[field] = str(old_value) if old_value else None
            setattr(opportunity, field, value)
            updated_fields[field] = str(value) if value else None
        
        opportunity.last_modified_by_id = user_id
        await opportunity.save()
        
        # Log status change if it happened
        if old_status != new_status and new_status:
            await self.log_status_changed(
                entity=opportunity,
                entity_type="opportunity",
                old_status=old_status,
                new_status=new_status
            )
        elif updated_fields:
            await self.log_entity_updated(
                entity=opportunity,
                entity_type="opportunity",
                old_values=old_values,
                updated_fields=updated_fields
            )
        
        return opportunity
    
    async def get_opportunity(
        self,
        opportunity_id: str,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Get opportunity by ID"""
        opportunity = await Opportunity.get(ObjectId(opportunity_id))
        
        if opportunity and opportunity.tenant_id == tenant_id and not opportunity.deleted_at:
            return opportunity
        return None
    
    async def delete_opportunity(
        self,
        opportunity_id: str,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> bool:
        """Soft delete an opportunity with activity logging"""
        opportunity = await self.get_opportunity(opportunity_id, tenant_id)
        
        if not opportunity:
            return False
        
        await opportunity.soft_delete()
        
        # Log deletion
        await self.log_entity_deleted(
            entity=opportunity,
            entity_type="opportunity",
            additional_data={
                "opportunity_name": opportunity.name,
                "expected_revenue": opportunity.expected_revenue,
                "status": opportunity.status
            }
        )
        
        return True
    
    async def change_opportunity_owner(
        self,
        opportunity_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Change opportunity owner with activity logging"""
        opportunity = await self.get_opportunity(opportunity_id, tenant_id)
        
        if not opportunity:
            return None
        
        old_owner = opportunity.owner_id
        
        opportunity.owner_id = new_owner_id
        opportunity.last_modified_by_id = current_user_id
        await opportunity.save()
        
        # Log assignment change
        await self.log_assignment_changed(
            entity=opportunity,
            entity_type="opportunity",
            old_assigned_to=str(old_owner),
            new_assigned_to=str(new_owner_id)
        )
        
        return opportunity
