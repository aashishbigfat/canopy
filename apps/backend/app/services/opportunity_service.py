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
from app.core.cache import invalidate_tenant_cache
from app.repositories.opportunity_repository import OpportunityRepository

class OpportunityService(ActivityMixin):
    """Service for Opportunity business logic"""
    
    def __init__(self):
        super().__init__()
        self.notification_service = NotificationService()
        self.repository = OpportunityRepository()
    
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
            
            opportunity = Opportunity(
                **opp_dict,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
            
            # Set destination/origin IDs
            if opp_data.destination_ids:
                opportunity.destination_ids = [ObjectId(d) for d in opp_data.destination_ids]
            if opp_data.origin_ids:
                opportunity.origin_ids = [ObjectId(o) for o in opp_data.origin_ids]
            if opp_data.team_member_ids:
                opportunity.team_member_ids = [ObjectId(t) for t in opp_data.team_member_ids]
            
            await opportunity.insert()
            
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
            
            # Create notification for opportunity creation
            await self.notification_service.notify_user(
                user_id=user_id,
                tenant_id=tenant_id,
                title="New Opportunity Created",
                message=f"Opportunity '{opportunity.name}' worth ₹{opportunity.amount:,.2f} has been created",
                type="opportunity",
                entity_type="opportunity",
                entity_id=opportunity.id,
                action_url=f"/opportunities/{opportunity.id}"
            )
            
            # Invalidate dashboard cache for this tenant
            await invalidate_tenant_cache(str(tenant_id))
            
            return opportunity
            
        except Exception as e:
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
        return await self.repository.get_by_id(id=opp_id, tenant_id=tenant_id)
    
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
        
        # Auto-update probability if stage changed
        if "sales_stage_id" in update_data and str(update_data["sales_stage_id"]) != str(opp.sales_stage_id):
            from app.models.opportunity_picklists import SalesStage
            new_stage_id = ObjectId(update_data["sales_stage_id"])
            new_stage = await SalesStage.get(new_stage_id)
            if new_stage:
                # Only auto-update if probability wasn't explicitly provided in update_data
                if "probability" not in update_data:
                    opp.probability = new_stage.probability
                    updated_fields["probability"] = new_stage.probability

        for field, value in update_data.items():
            old_values[field] = getattr(opp, field, None)
            
            # Handle conversion of ID fields
            if field.endswith("_id") and value and isinstance(value, str):
                try:
                    value = ObjectId(value)
                except:
                    pass
            elif field in ["destination_ids", "origin_ids", "team_member_ids"] and isinstance(value, list):
                clean_ids = []
                for vid in value:
                    if isinstance(vid, (str, ObjectId)):
                        try:
                            clean_ids.append(ObjectId(vid))
                        except:
                            pass
                value = clean_ids

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
        
        # Invalidate dashboard cache for this tenant
        await invalidate_tenant_cache(str(tenant_id))
        
        return opp
    
    async def delete_opportunity(self, opp_id: str, tenant_id: ObjectId, user_id: ObjectId = None) -> bool:
        """Soft delete an opportunity and remove its history"""
        from app.models.opportunity_picklists import OpportunityHistory
        
        opp = await self.get_opportunity(opp_id, tenant_id)
        
        if not opp:
            return False
            
        # Hard delete all history records for this opportunity
        await OpportunityHistory.find(
            OpportunityHistory.opportunity_id == opp.id
        ).delete()
        
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
        
        # Invalidate dashboard cache for this tenant
        await invalidate_tenant_cache(str(tenant_id))
        
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
        sales_stage_id: Optional[ObjectId] = None,
        **kwargs
    ) -> Tuple[List[Opportunity], int]:
        """Get opportunities for a tenant with pagination"""
        return await self.repository.get_filtered_opportunities(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            owner_id=owner_id,
            sales_stage_id=sales_stage_id,
            **kwargs
        )
    
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
        
        # Guard: Only change if stage is different
        if old_stage_id == new_stage_id:
            return opp

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
        
        # Invalidate dashboard cache for this tenant
        await invalidate_tenant_cache(str(tenant_id))
        
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

    async def seed_standard_stages(self, tenant_id: ObjectId):
        """
        Seed/normalize sales stages for a tenant.

        After this runs, the tenant will only have these active stages:
        - Received (10%)
        - Qualified (20%)
        - Proposal (30%)
        - Closed Won (100%, won)
        - Closed Lost (0%, lost)

        Any other existing stages for this tenant are marked inactive so they
        no longer appear in picklists, but existing opportunities that still
        reference them will keep working.
        """
        from app.models.opportunity_picklists import SalesStage

        desired_stages = [
            {"name": "Received", "probability": 10, "sorting": 10, "is_default": True, "is_won": False, "is_lost": False},
            {"name": "Qualified", "probability": 20, "sorting": 20, "is_default": False, "is_won": False, "is_lost": False},
            {"name": "Proposal", "probability": 30, "sorting": 30, "is_default": False, "is_won": False, "is_lost": False},
            {"name": "Closed Won", "probability": 100, "sorting": 40, "is_default": False, "is_won": True, "is_lost": False},
            {"name": "Closed Lost", "probability": 0, "sorting": 50, "is_default": False, "is_won": False, "is_lost": True},
        ]

        desired_names = {s["name"] for s in desired_stages}

        # Upsert desired stages
        for stage_data in desired_stages:
            existing = await SalesStage.find_one(
                SalesStage.tenant_id == tenant_id,
                SalesStage.name == stage_data["name"],
            )

            if existing:
                existing.probability = stage_data["probability"]
                existing.sorting = stage_data["sorting"]
                existing.is_default = stage_data["is_default"]
                existing.is_won = stage_data["is_won"]
                existing.is_lost = stage_data["is_lost"]
                existing.is_active = True
                await existing.save()
            else:
                stage = SalesStage(
                    **stage_data,
                    tenant_id=tenant_id,
                    is_active=True,
                )
                await stage.insert()

        # Deactivate any other stages for this tenant
        other_stages_cursor = SalesStage.find(
            SalesStage.tenant_id == tenant_id,
            SalesStage.name.not_in(list(desired_names)),
        )
        async for stage in other_stages_cursor:
            if stage.is_active:
                stage.is_active = False
                await stage.save()
