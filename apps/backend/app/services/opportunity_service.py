"""
Opportunity service layer - Business logic for sales pipeline management
"""
from typing import List, Optional, Dict, Tuple
from bson import ObjectId
from datetime import datetime
from app.models.opportunity import Opportunity
from app.models.opportunity_picklists import OpportunityHistory
from app.models.destination import DestinationOpportunity
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate, OpportunityStageChange
from app.services.notification_service import NotificationService
from app.mixins.activity_mixin import ActivityMixin

class OpportunityService(ActivityMixin):
    """Service for Opportunity business logic"""
    
    def __init__(self):
        super().__init__()
        self.notification_service = NotificationService()
    
    async def create_opportunity(
        self,
        opp_data: OpportunityCreate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: list = None,
        destination_ids: list = None
    ) -> Opportunity:
        """Create a new opportunity"""
        
        try:
            print(f"DEBUG: Creating opportunity with data: {opp_data.model_dump()}")
            print(f"DEBUG: User ID: {user_id}, Tenant ID: {tenant_id}")
            
            # Prepare opportunity data
            opp_dict = opp_data.model_dump(exclude_unset=True, exclude={'destination_ids', 'origin_ids', 'team_member_ids'})
            
            # Convert string IDs to ObjectId where needed
            if 'sales_stage_id' in opp_dict:
                opp_dict['sales_stage_id'] = ObjectId(opp_dict['sales_stage_id'])
            if 'account_id' in opp_dict and opp_dict['account_id']:
                opp_dict['account_id'] = ObjectId(opp_dict['account_id'])
            if 'contact_id' in opp_dict and opp_dict['contact_id']:
                opp_dict['contact_id'] = ObjectId(opp_dict['contact_id'])
            if 'opportunity_type_id' in opp_dict and opp_dict['opportunity_type_id']:
                opp_dict['opportunity_type_id'] = ObjectId(opp_dict['opportunity_type_id'])
            if 'experience_id' in opp_dict and opp_dict['experience_id']:
                opp_dict['experience_id'] = ObjectId(opp_dict['experience_id'])
            if 'source_id' in opp_dict and opp_dict['source_id']:
                opp_dict['source_id'] = ObjectId(opp_dict['source_id'])
            if 'source_medium_id' in opp_dict and opp_dict['source_medium_id']:
                opp_dict['source_medium_id'] = ObjectId(opp_dict['source_medium_id'])
            
            print(f"DEBUG: Processed opportunity dict: {opp_dict}")
            
            opportunity = Opportunity(
                **opp_dict,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
            
            print("DEBUG: Opportunity object created successfully")
            
            # Set destination/origin IDs
            if opp_data.destination_ids:
                opportunity.destination_ids = [ObjectId(d) for d in opp_data.destination_ids]
            if opp_data.origin_ids:
                opportunity.origin_ids = [ObjectId(o) for o in opp_data.origin_ids]
            if opp_data.team_member_ids:
                opportunity.team_member_ids = [ObjectId(t) for t in opp_data.team_member_ids]
            
            await opportunity.insert()
            print("DEBUG: Opportunity inserted successfully")
            
            # Log opportunity creation
            await self.log_entity_created(
                entity=opportunity,
                entity_type="opportunity",
                additional_data={
                    "name": opportunity.name,
                    "amount": opportunity.amount,
                    "probability": opportunity.probability,
                    "sales_stage": str(opportunity.sales_stage_id)
                }
            )
            
            # Link destinations (pivot table)
            if destination_ids or opp_data.destination_ids:
                dest_ids = destination_ids or opp_data.destination_ids
                for dest_id in dest_ids:
                    pivot = DestinationOpportunity(
                        opportunity_id=opportunity.id,
                        destination_id=ObjectId(dest_id),
                        tenant_id=tenant_id
                    )
                    await pivot.insert()
            
            print("DEBUG: Opportunity creation completed successfully")
            
            # Create notification for opportunity creation
            await self.notification_service.notify_user(
                user_id=user_id,
                tenant_id=tenant_id,
                title="New Opportunity Created",
                message=f"Opportunity '{opportunity.name}' worth ${opportunity.amount:,.2f} has been created",
                type="opportunity",
                entity_type="opportunity",
                entity_id=opportunity.id,
                action_url=f"/opportunities/{opportunity.id}"
            )
            
            return opportunity
            
        except Exception as e:
            print(f"DEBUG: Error creating opportunity: {e}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            raise ValueError(f"Failed to create opportunity: {str(e)}")
        
        # Save custom fields
        if custom_fields:
            from app.models.opportunity_custom_fields import OpportunityCustomField
            import json
            
            for field in custom_fields:
                custom_field = OpportunityCustomField(
                    opportunity_id=opportunity.id,
                    opp_additional_field_id=ObjectId(field['id']),
                    field_value=json.dumps(field['value']),
                    type=field.get('type', 'text'),
                    tenant_id=tenant_id
                )
                await custom_field.insert()
        
        return opportunity
    
    async def get_opportunity(self, opp_id: str, tenant_id: ObjectId) -> Optional[Opportunity]:
        """Get opportunity by ID"""
        opp = await Opportunity.get(ObjectId(opp_id))
        
        if opp and opp.tenant_id == tenant_id and not opp.deleted_at:
            return opp
        return None
    
    async def update_opportunity(
        self,
        opp_id: str,
        opp_data: OpportunityUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Update an opportunity"""
        opp = await self.get_opportunity(opp_id, tenant_id)
        
        if not opp:
            return None
        
        # Check if locked
        if opp.is_locked and opp.locked_by != user_id:
            raise ValueError("Opportunity is locked by another user")
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        # Update fields
        update_data = opp_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            old_values[field] = getattr(opp, field, None)
            setattr(opp, field, value)
            updated_fields[field] = value
        
        opp.last_modified_by_id = user_id
        await opp.save()
        
        # Log update
        await self.log_entity_updated(
            entity=opp,
            entity_type="opportunity",
            old_values=old_values,
            updated_fields=updated_fields
        )
        
        return opp
    
    async def delete_opportunity(self, opp_id: str, tenant_id: ObjectId, user_id: ObjectId = None) -> bool:
        """Soft delete an opportunity"""
        opp = await self.get_opportunity(opp_id, tenant_id)
        
        if not opp:
            return False
        
        await opp.soft_delete()
        
        # Log deletion
        await self.log_entity_deleted(
            entity=opp,
            entity_type="opportunity",
            additional_data={
                "name": opp.name,
                "amount": opp.amount,
                "probability": opp.probability
            }
        )
        
        return True
    
    async def change_opportunity_owner(
        self,
        opp_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Change opportunity owner with activity logging"""
        opp = await self.get_opportunity(opp_id, tenant_id)
        
        if not opp:
            return None
        
        old_owner = opp.owner_id
        
        opp.owner_id = new_owner_id
        opp.last_modified_by_id = current_user_id
        await opp.save()
        
        # Log assignment change
        await self.log_assignment_changed(
            entity=opp,
            entity_type="opportunity",
            old_assigned_to=str(old_owner),
            new_assigned_to=str(new_owner_id)
        )
        
        # Create notification for opportunity assignment
        await self.notification_service.notify_user(
            user_id=new_owner_id,
            tenant_id=tenant_id,
            title="Opportunity Assigned",
            message=f"Opportunity '{opp.name}' has been assigned to you",
            type="opportunity",
            entity_type="opportunity",
            entity_id=opp.id,
            action_url=f"/opportunities/{opp.id}"
        )
        
        return opp
    
    async def get_opportunities_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10,
        owner_id: Optional[ObjectId] = None,
        sales_stage_id: Optional[ObjectId] = None
    ) -> Tuple[List[Opportunity], int]:
        """Get opportunities for a tenant with pagination"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if owner_id:
            query["owner_id"] = owner_id
        
        if sales_stage_id:
            query["sales_stage_id"] = sales_stage_id
        
        # Get total count
        total = await Opportunity.find(query).count()
        
        # Get paginated results
        opportunities = await Opportunity.find(query)\
            .sort("-created_at")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return opportunities, total
    
    async def change_stage(
        self,
        opp_id: str,
        stage_change: OpportunityStageChange,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Change opportunity sales stage"""
        opp = await self.get_opportunity(opp_id, tenant_id)
        
        if not opp:
            return None
        
        old_stage_id = opp.sales_stage_id
        new_stage_id = ObjectId(stage_change.new_stage_id)
        
        # Update stage
        opp.sales_stage_id = new_stage_id
        opp.last_modified_by_id = user_id
        
        # Update probability based on stage
        from app.models.opportunity_picklists import SalesStage
        new_stage = await SalesStage.get(new_stage_id)
        if new_stage:
            opp.probability = new_stage.probability
        
        await opp.save()
        
        # Log history
        history = OpportunityHistory(
            opportunity_id=opp.id,
            tenant_id=tenant_id,
            field_name="sales_stage_id",
            old_value=str(old_stage_id),
            new_value=str(new_stage_id),
            changed_by=user_id
        )
        await history.insert()
        
        return opp
    
    async def lock_opportunity(
        self,
        opp_id: str,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Lock opportunity for editing"""
        opp = await self.get_opportunity(opp_id, tenant_id)
        
        if not opp:
            return None
        
        if opp.is_locked and opp.locked_by != user_id:
            raise ValueError("Opportunity already locked by another user")
        
        await opp.lock(user_id)
        return opp
    
    async def unlock_opportunity(
        self,
        opp_id: str,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Unlock opportunity"""
        opp = await self.get_opportunity(opp_id, tenant_id)
        
        if not opp:
            return None
        
        if opp.is_locked and opp.locked_by != user_id:
            raise ValueError("Cannot unlock - locked by another user")
        
        await opp.unlock()
        return opp
    
    async def change_owner(
        self,
        opp_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Change opportunity owner"""
        opp = await self.get_opportunity(opp_id, tenant_id)
        
        if not opp:
            return None
        
        opp.owner_id = new_owner_id
        opp.last_modified_by_id = current_user_id
        await opp.save()
        
        return opp
