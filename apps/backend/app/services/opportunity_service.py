"""
Opportunity service layer - Business logic for sales pipeline management
"""
from typing import List, Optional, Dict, Tuple
from bson import ObjectId
from datetime import datetime
from app.models.opportunity import Opportunity
from app.models.opportunity_picklists import OpportunityHistory
from app.models.destination import DestinationOpportunity
from app.models.user import User
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate, OpportunityStageChange
from app.services.notification_service import NotificationService
from app.mixins.activity_mixin import ActivityMixin
from app.core.cache import invalidate_tenant_cache
from app.repositories.opportunity_repository import OpportunityRepository
from app.services.webhook_service import webhook_service
from app.services import field_registry_service
from app.schemas.field_registry import CustomFieldValuePayload

class OpportunityService(ActivityMixin):
    """Service for Opportunity business logic"""
    
    def __init__(self):
        super().__init__()
        self.notification_service = NotificationService()
        self.repository = OpportunityRepository()
    
    async def reassign_bd(
        self,
        opportunity_id: str,
        tenant_id: ObjectId,
        current_user_id: ObjectId,
        bd_owner_id: Optional[ObjectId] = None,
        reporting_manager_id: Optional[ObjectId] = None,
        reason: Optional[str] = None,
    ):
        """Manually override the BD triple on an opportunity."""
        from app.models.user import User
        from app.services.bd_assignment_service import bd_assignment_service
        opp = await self.get_opportunity(opportunity_id, tenant_id)
        if not opp:
            return None
        previous_bd = str(opp.bd_owner_id) if opp.bd_owner_id else None
        previous_manager = str(opp.reporting_manager_id) if opp.reporting_manager_id else None
        if bd_owner_id is not None:
            owner = await User.find_one(
                {"_id": bd_owner_id, "tenant_id": tenant_id, "is_active": True, "deleted_at": None}
            )
            if not owner:
                raise ValueError("bd_owner_id must reference an active user in this tenant")
            opp.bd_owner_id = bd_owner_id
            if reporting_manager_id is None:
                opp.reporting_manager_id = await bd_assignment_service.resolve_manager_for_user(
                    tenant_id, bd_owner_id
                )
        if reporting_manager_id is not None:
            mgr = await User.find_one(
                {"_id": reporting_manager_id, "tenant_id": tenant_id, "is_active": True, "deleted_at": None}
            )
            if not mgr:
                raise ValueError("reporting_manager_id must reference an active user in this tenant")
            opp.reporting_manager_id = reporting_manager_id
        opp.territory_match_source = "manual"
        opp.territory_assigned_at = datetime.utcnow()
        opp.last_modified_by_id = current_user_id
        await opp.save()
        await self.log_custom_activity(
            action="bd_reassigned",
            entity_type="opportunity",
            entity=opp,
            description=f"BD reassigned (reason: {reason or 'manual override'})",
            changes={
                "bd_owner_id": {"old": previous_bd, "new": str(opp.bd_owner_id) if opp.bd_owner_id else None},
                "reporting_manager_id": {"old": previous_manager, "new": str(opp.reporting_manager_id) if opp.reporting_manager_id else None},
            },
        )
        return opp

    async def resolve_territory(
        self,
        opportunity_id: str,
        tenant_id: ObjectId,
        current_user_id: ObjectId,
    ):
        """Re-run automatic BD resolution for an existing opportunity (from
        account billing address, then lead address as fallback)."""
        from app.services.bd_assignment_service import bd_assignment_service
        opp = await self.get_opportunity(opportunity_id, tenant_id)
        if not opp:
            return None
        country = state = zip_code = None
        if opp.account_id:
            from app.models.account import Account
            acct = await Account.find_one({"_id": opp.account_id, "tenant_id": tenant_id, "deleted_at": None})
            if acct:
                country, state, zip_code = acct.billing_country, acct.billing_state, acct.billing_zip
        if not (country or state or zip_code) and opp.lead_id:
            from app.models.lead import Lead
            ld = await Lead.find_one({"_id": opp.lead_id, "tenant_id": tenant_id})
            if ld:
                country, state, zip_code = ld.country, ld.state, ld.zip
        if not (country or state or zip_code):
            return opp
        assignment = await bd_assignment_service.resolve_for_address(
            tenant_id=tenant_id, country=country, state=state, zip_code=zip_code,
        )
        if assignment.is_empty():
            return opp
        opp.territory_id = assignment.territory_id
        opp.region_id = assignment.region_id
        opp.bd_owner_id = assignment.bd_owner_id
        opp.reporting_manager_id = assignment.reporting_manager_id
        opp.territory_match_source = assignment.match_source
        opp.territory_assigned_at = datetime.utcnow()
        opp.last_modified_by_id = current_user_id
        await opp.save()
        return opp

    async def create_opportunity(
        self,
        opp_data,  # OpportunityCreate (unified for all industries)
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
            
            opp_dict.pop("owner_id", None)
            opp_dict['owner_id'] = user_id
            
            opportunity = Opportunity(
                **opp_dict,
                tenant_id=tenant_id,
                created_by=user_id
            )

            from app.core.entity_required_fields import (
                validate_opportunity_record,
                opportunity_requires_contact,
            )
            require_contact = await opportunity_requires_contact(opportunity.account_id, tenant_id)
            validate_opportunity_record(opportunity, require_contact=require_contact)
            
            # Set team_member_ids if present
            if hasattr(opp_data, 'team_member_ids') and opp_data.team_member_ids:
                opportunity.team_member_ids = [ObjectId(t) for t in opp_data.team_member_ids]
            
            await opportunity.insert()

            # Assign a per-tenant sequential display ID (universal across all industries)
            try:
                from app.models.tenant_counter import next_opportunity_number
                opportunity.opportunity_number = await next_opportunity_number(tenant_id)
                await opportunity.save()
            except Exception:
                import logging as _l
                _l.getLogger(__name__).warning("opportunity_number assignment failed", exc_info=True)

            # BD triple auto-resolution. Source the address from the linked
            # account's billing fields (most opportunities have one); fall back
            # to the converting lead's address when called via convert_lead.
            try:
                from app.services.bd_assignment_service import bd_assignment_service
                country = state = zip_code = None
                if opportunity.account_id:
                    from app.models.account import Account
                    acct = await Account.find_one(
                        {"_id": opportunity.account_id, "tenant_id": tenant_id, "deleted_at": None}
                    )
                    if acct:
                        country = acct.billing_country
                        state = acct.billing_state
                        zip_code = acct.billing_zip
                if not (country or state or zip_code) and opportunity.lead_id:
                    from app.models.lead import Lead
                    src_lead = await Lead.find_one(
                        {"_id": opportunity.lead_id, "tenant_id": tenant_id}
                    )
                    if src_lead:
                        # If the lead already has the triple resolved, just inherit it.
                        if src_lead.territory_id:
                            opportunity.territory_id = src_lead.territory_id
                            opportunity.region_id = src_lead.region_id
                            opportunity.bd_owner_id = src_lead.bd_owner_id
                            opportunity.reporting_manager_id = src_lead.reporting_manager_id
                            opportunity.territory_match_source = src_lead.territory_match_source
                            from datetime import datetime as _dt
                            opportunity.territory_assigned_at = _dt.utcnow()
                            await opportunity.save()
                        else:
                            country = src_lead.country
                            state = src_lead.state
                            zip_code = src_lead.zip

                if (country or state or zip_code) and not opportunity.territory_id:
                    assignment = await bd_assignment_service.resolve_for_address(
                        tenant_id=tenant_id, country=country, state=state, zip_code=zip_code,
                    )
                    if not assignment.is_empty():
                        opportunity.territory_id = assignment.territory_id
                        opportunity.region_id = assignment.region_id
                        opportunity.bd_owner_id = assignment.bd_owner_id
                        opportunity.reporting_manager_id = assignment.reporting_manager_id
                        opportunity.territory_match_source = assignment.match_source
                        from datetime import datetime as _dt
                        opportunity.territory_assigned_at = _dt.utcnow()
                        await opportunity.save()
            except Exception:
                import logging as _l
                _l.getLogger(__name__).warning("Opportunity BD auto-assignment failed", exc_info=True)

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
            
            # Link destinations via pivot table if provided in industry_data (travel only)
            industry_dest_ids = (opp_data.industry_data or {}).get('destination_ids', []) if hasattr(opp_data, 'industry_data') else []
            if industry_dest_ids:
                for dest_id in industry_dest_ids:
                    pivot = DestinationOpportunity(
                        opportunity_id=opportunity.id,
                        destination_id=ObjectId(dest_id),
                        tenant_id=tenant_id
                    )
                    await pivot.insert()

            # Save custom fields via unified registry (Phase 1 §A — fixes dead-code bug)
            if custom_fields:
                import json
                payloads = [
                    CustomFieldValuePayload(
                        additional_field_id=ObjectId(f["id"]),
                        field_value=json.dumps(f["value"]) if not isinstance(f.get("value"), str) else f["value"],
                    )
                    for f in custom_fields if f.get("id") is not None
                ]
                await field_registry_service.write_custom_field_values(
                    "opportunity", opportunity.id, payloads, tenant_id,
                )

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
            
            # Fire webhook event
            try:
                await webhook_service.trigger_event(
                    event_type="opportunity.created",
                    payload={
                        "opportunity_id": str(opportunity.id),
                        "name": opportunity.name,
                        "amount": opportunity.amount,
                        "probability": opportunity.probability,
                        "industry_data": opportunity.industry_data,
                    },
                    tenant_id=str(tenant_id),
                    entity_id=str(opportunity.id),
                    entity_type="opportunity",
                    triggered_by=str(user_id)
                )
            except Exception:
                pass
            
            return opportunity
            
        except Exception as e:
            raise ValueError(f"Failed to create opportunity: {str(e)}")

    async def get_opportunity(self, opp_id: str, tenant_id: ObjectId) -> Optional[Opportunity]:
        """Get opportunity by ID"""
        return await self.repository.get_by_id(id=opp_id, tenant_id=tenant_id)
    
    async def update_opportunity(
        self,
        opp_id: str,
        opp_data,  # OpportunityUpdate (unified for all industries)
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: list = None,
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
        old_stage_id = opp.sales_stage_id
        
        # Update fields
        update_data = opp_data.model_dump(exclude_unset=True)
        
        # Auto-update probability if stage changed — stage MUST belong to
        # this tenant. Otherwise a client could send another tenant's
        # sales_stage_id and pin this opportunity to a foreign stage.
        if "sales_stage_id" in update_data and str(update_data["sales_stage_id"]) != str(opp.sales_stage_id):
            from app.models.opportunity_picklists import SalesStage
            new_stage_id = ObjectId(update_data["sales_stage_id"])
            new_stage = await SalesStage.find_one(
                {"_id": new_stage_id, "tenant_id": tenant_id}
            )
            if not new_stage:
                raise ValueError("Invalid sales_stage_id for this tenant")
            # Only auto-update if probability wasn't explicitly provided
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
        
        from app.core.entity_required_fields import (
            validate_opportunity_record,
            opportunity_requires_contact,
        )
        require_contact = await opportunity_requires_contact(opp.account_id, tenant_id)
        validate_opportunity_record(opp, require_contact=require_contact)

        opp.last_modified_by_id = user_id
        await opp.save()

        # Auto-lock if stage is won and travel date has passed (handles travel_date edits)
        if not opp.is_locked and "industry_data" in update_data:
            from app.models.opportunity_picklists import SalesStage as _SalesStage
            _stage = await _SalesStage.find_one({"_id": opp.sales_stage_id, "tenant_id": tenant_id})
            if _stage and await self._should_auto_lock(opp, getattr(_stage, 'is_won', False)):
                await opp.lock(user_id)

        # Custom fields write (Phase 1 §A)
        custom_field_changes = 0
        if custom_fields:
            import json
            payloads = [
                CustomFieldValuePayload(
                    additional_field_id=ObjectId(f["id"]),
                    field_value=json.dumps(f["value"]) if not isinstance(f.get("value"), str) else f["value"],
                )
                for f in custom_fields if f.get("id") is not None
            ]
            custom_field_changes = await field_registry_service.write_custom_field_values(
                "opportunity", opp.id, payloads, tenant_id,
            )
            if custom_field_changes:
                updated_fields["custom_fields_updated"] = custom_field_changes

        # Log update
        await self.log_entity_updated(
            entity=opp,
            entity_type="opportunity",
            old_values=old_values,
            updated_fields=updated_fields
        )
        
        # Log stage history if changed
        new_stage_id = getattr(opp, "sales_stage_id", None)
        if "sales_stage_id" in update_data and new_stage_id and str(new_stage_id) != str(old_stage_id):
            history = OpportunityHistory(
                opportunity_id=opp.id,
                tenant_id=tenant_id,
                field_name="sales_stage_id",
                old_value=str(old_stage_id) if old_stage_id else None,
                new_value=str(new_stage_id),
                changed_by=user_id,
                amount_at_change=opp.amount,
                probability_at_change=opp.probability,
            )
            await history.insert()
        
        # Log history if amount changed (separate from stage changes)
        if "amount" in update_data and old_values.get("amount") != opp.amount:
            amount_history = OpportunityHistory(
                opportunity_id=opp.id,
                tenant_id=tenant_id,
                field_name="amount",
                old_value=str(old_values.get("amount") or 0),
                new_value=str(opp.amount or 0),
                changed_by=user_id,
                amount_at_change=opp.amount,
                probability_at_change=opp.probability,
            )
            await amount_history.insert()
            
        # Bi-directional sync: If industry_data.inclusions change, reflect in Costing module
        new_industry = getattr(opp, 'industry_data', {}) or {}
        old_industry = old_values.get("industry_data", {}) or {}
        if new_industry.get("inclusions") and new_industry.get("inclusions") != old_industry.get("inclusions"):
            from app.models.opportunity_financial import OpportunityCosting
            costing = await OpportunityCosting.find_one(
                {"opportunity_id": opp.id, "tenant_id": tenant_id}
            )
            if costing:
                new_inclusions = new_industry.get("inclusions", [])
                costing.selected_item_types = new_inclusions
                
                # Filter out line items that are no longer in inclusions (but keep Tax and Misc)
                valid_items = []
                for item in costing.items:
                    if item.item_type in ["Tax", "Miscellaneous"] or item.item_type in new_inclusions:
                        valid_items.append(item)
                
                costing.items = valid_items
                
                # Since items may have been removed, mathematically recalculate totals
                costing.total_amount = sum(i.amount for i in costing.items)
                costing.total_cost = sum(i.cost_amount for i in costing.items)
                costing.profit = costing.total_amount - costing.total_cost
                costing.profit_percent = round((costing.profit / costing.total_amount * 100), 2) if costing.total_amount > 0 else 0.0
                
                from datetime import datetime
                costing.updated_at = datetime.utcnow()
                await costing.save()
        
        # Invalidate dashboard cache for this tenant
        await invalidate_tenant_cache(str(tenant_id))
        
        # Fire webhook event
        try:
            await webhook_service.trigger_event(
                event_type="opportunity.updated",
                payload={
                    "opportunity_id": str(opp.id),
                    "name": opp.name,
                    "updated_fields": {k: str(v) for k, v in updated_fields.items()},
                },
                tenant_id=str(tenant_id),
                entity_id=str(opp.id),
                entity_type="opportunity",
                triggered_by=str(user_id)
            )
        except Exception:
            pass
        
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
        
        # Fire webhook event
        try:
            await webhook_service.trigger_event(
                event_type="opportunity.deleted",
                payload={
                    "opportunity_id": str(opp.id),
                    "name": opp.name,
                    "amount": opp.amount,
                },
                tenant_id=str(tenant_id),
                entity_id=str(opp.id),
                entity_type="opportunity",
                triggered_by=str(user_id) if user_id else None
            )
        except Exception:
            pass
        
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
    
    async def _should_auto_lock(self, opp: "Opportunity", stage_is_won: bool) -> bool:
        """Return True if the opportunity should be auto-locked.

        Condition: stage is 'Closed Won' (is_won=True) AND travel_date has passed.
        """
        if not stage_is_won or opp.is_locked:
            return False
        travel_date = (opp.industry_data or {}).get("travel_date")
        if not travel_date:
            return False
        try:
            if isinstance(travel_date, str):
                td = datetime.fromisoformat(travel_date.replace("Z", "+00:00")) if "T" in travel_date else datetime.fromisoformat(travel_date)
            elif isinstance(travel_date, datetime):
                td = travel_date
            else:
                return False
            # Compare calendar dates in IST (UTC+5:30) so auto-lock triggers
            # the day AFTER travel_date, not on the travel_date itself.
            from datetime import timezone, timedelta
            IST = timezone(timedelta(hours=5, minutes=30))
            now_ist = datetime.now(IST).date()
            td_date = td.date() if td.tzinfo is None else td.astimezone(IST).date()
            return td_date < now_ist
        except Exception:
            return False

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

        # Guard: Only skip if stage is same AND reason is same
        if old_stage_id == new_stage_id and opp.close_lost_reason == stage_change.reason:
            return opp

        # Validate new stage belongs to THIS tenant before applying.
        from app.models.opportunity_picklists import SalesStage
        new_stage = await SalesStage.find_one(
            {"_id": new_stage_id, "tenant_id": tenant_id}
        )
        if not new_stage:
            raise ValueError("Invalid sales stage for this tenant")

        # Update stage
        opp.sales_stage_id = new_stage_id
        opp.last_modified_by_id = user_id
        opp.probability = new_stage.probability
        if getattr(new_stage, 'is_lost', False):
            # Moving into a lost stage — store reason
            if stage_change.reason:
                opp.close_lost_reason = stage_change.reason
        else:
            # Moving away from a lost stage — clear stale reason
            opp.close_lost_reason = None

        await opp.save()

        # Log history only if stage ID actually changed
        if str(old_stage_id) != str(new_stage_id):
            history = OpportunityHistory(
                opportunity_id=opp.id,
                tenant_id=tenant_id,
                field_name="sales_stage_id",
                old_value=str(old_stage_id),
                new_value=str(new_stage_id),
                changed_by=user_id,
                amount_at_change=opp.amount,
                probability_at_change=opp.probability,
            )
            await history.insert()

        # Auto-lock if moving to a won stage and travel date has passed
        if await self._should_auto_lock(opp, getattr(new_stage, 'is_won', False)):
            await opp.lock(user_id)

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
        tenant_id: ObjectId,
    ) -> Optional[Opportunity]:
        """Unlock opportunity — caller must already hold unlock_opportunity permission."""
        opp = await self.get_opportunity(opp_id, tenant_id)
        if not opp:
            return None
        await opp.unlock()
        return opp
    
    # NOTE: An earlier `change_owner` definition was here but the SECOND
    # definition below silently overrode it via Python method resolution.
    # Removed; the canonical one is `change_owner` further down (now hardened
    # with tenant-scoped owner validation).

    # Industry-specific default pipeline definitions
    INDUSTRY_STAGE_SETS = {
        "travel": [
            {"name": "Received",    "probability": 10,  "sorting": 10, "is_default": True,  "is_won": False, "is_lost": False, "color": "#3B82F6"},
            {"name": "Qualified",   "probability": 20,  "sorting": 20, "is_default": False, "is_won": False, "is_lost": False, "color": "#8B5CF6"},
            {"name": "Proposal",    "probability": 30,  "sorting": 30, "is_default": False, "is_won": False, "is_lost": False, "color": "#F59E0B"},
            {"name": "Closed Won",  "probability": 100, "sorting": 40, "is_default": False, "is_won": True,  "is_lost": False, "color": "#10B981"},
            {"name": "Closed Lost", "probability": 0,   "sorting": 50, "is_default": False, "is_won": False, "is_lost": True,  "color": "#EF4444"},
            {"name": "Refunded",    "probability": 0,   "sorting": 60, "is_default": False, "is_won": False, "is_lost": True,  "color": "#6B7280"},
        ],
        "healthcare": [
            {"name": "Inquiry",      "probability": 10,  "sorting": 10, "is_default": True,  "is_won": False, "is_lost": False, "color": "#3B82F6"},
            {"name": "Consultation", "probability": 30,  "sorting": 20, "is_default": False, "is_won": False, "is_lost": False, "color": "#8B5CF6"},
            {"name": "Treatment",    "probability": 60,  "sorting": 30, "is_default": False, "is_won": False, "is_lost": False, "color": "#F59E0B"},
            {"name": "Follow-up",    "probability": 80,  "sorting": 40, "is_default": False, "is_won": False, "is_lost": False, "color": "#14B8A6"},
            {"name": "Closed Won",   "probability": 100, "sorting": 50, "is_default": False, "is_won": True,  "is_lost": False, "color": "#10B981"},
            {"name": "Closed Lost",  "probability": 0,   "sorting": 60, "is_default": False, "is_won": False, "is_lost": True,  "color": "#EF4444"},
        ],
        "education": [
            {"name": "Inquiry",     "probability": 10,  "sorting": 10, "is_default": True,  "is_won": False, "is_lost": False, "color": "#3B82F6"},
            {"name": "Applied",     "probability": 30,  "sorting": 20, "is_default": False, "is_won": False, "is_lost": False, "color": "#8B5CF6"},
            {"name": "Enrolled",    "probability": 80,  "sorting": 30, "is_default": False, "is_won": False, "is_lost": False, "color": "#F59E0B"},
            {"name": "Deferred",    "probability": 20,  "sorting": 40, "is_default": False, "is_won": False, "is_lost": False, "color": "#14B8A6"},
            {"name": "Closed Won",  "probability": 100, "sorting": 50, "is_default": False, "is_won": True,  "is_lost": False, "color": "#10B981"},
            {"name": "Closed Lost", "probability": 0,   "sorting": 60, "is_default": False, "is_won": False, "is_lost": True,  "color": "#EF4444"},
        ],
        "manufacturing": [
            {"name": "RFQ",          "probability": 10,  "sorting": 10, "is_default": True,  "is_won": False, "is_lost": False, "color": "#3B82F6"},
            {"name": "Quoted",       "probability": 25,  "sorting": 20, "is_default": False, "is_won": False, "is_lost": False, "color": "#8B5CF6"},
            {"name": "Negotiation",  "probability": 50,  "sorting": 30, "is_default": False, "is_won": False, "is_lost": False, "color": "#F59E0B"},
            {"name": "PO Received",  "probability": 80,  "sorting": 40, "is_default": False, "is_won": False, "is_lost": False, "color": "#14B8A6"},
            {"name": "Closed Won",   "probability": 100, "sorting": 50, "is_default": False, "is_won": True,  "is_lost": False, "color": "#10B981"},
            {"name": "Closed Lost",  "probability": 0,   "sorting": 60, "is_default": False, "is_won": False, "is_lost": True,  "color": "#EF4444"},
        ],
    }

    async def seed_standard_stages(self, tenant_id: ObjectId, industry: str = "travel"):
        """
        Seed/normalize sales stages for a specific tenant and industry.

        Stages are tenant-scoped (not global). Each tenant gets their own
        copy of the stages appropriate for their industry vertical.
        This prevents cross-industry stage leakage.
        """
        from app.models.opportunity_picklists import SalesStage

        # Select industry-specific stage set, default to travel if unknown
        desired_stages = self.INDUSTRY_STAGE_SETS.get(industry, self.INDUSTRY_STAGE_SETS["travel"])
        desired_names = {s["name"] for s in desired_stages}

        # Upsert desired stages — always scoped by tenant_id
        for stage_data in desired_stages:
            existing = await SalesStage.find_one(
                {"tenant_id": tenant_id, "name": stage_data["name"]}
            )

            if existing:
                # Update all fields to ensure they match the current definition
                existing.probability = stage_data["probability"]
                existing.sorting = stage_data["sorting"]
                existing.is_default = stage_data["is_default"]
                existing.is_won = stage_data["is_won"]
                existing.is_lost = stage_data["is_lost"]
                existing.is_active = True
                if stage_data.get("color"):
                    existing.color = stage_data["color"]
                await existing.save()
            else:
                stage = SalesStage(
                    **stage_data,
                    tenant_id=tenant_id,
                    is_active=True,
                )
                await stage.insert()

        # Deactivate any other tenant-scoped stages not in the desired set
        # (don't touch other tenants' stages)
        other_stages_cursor = SalesStage.find(
            {"tenant_id": tenant_id, "name": {"$nin": list(desired_names)}}
        )
        async for stage in other_stages_cursor:
            if stage.is_active:
                stage.is_active = False
                await stage.save()

    async def change_owner(
        self,
        opportunity_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Opportunity]:
        """Change opportunity owner.

        SECURITY: validates new_owner_id belongs to the same tenant BEFORE
        reassigning. The previous code reassigned first and then fetched the
        owner unscoped — so a foreign user id could become the owner with
        only the response name silently dropping.
        """
        opportunity = await self.get_opportunity(opportunity_id, tenant_id)
        if not opportunity:
            return None

        owner = await User.find_one(
            {"_id": new_owner_id, "tenant_id": tenant_id, "deleted_at": None, "is_active": True}
        )
        if not owner:
            raise ValueError("new_owner_id must reference an active user in this tenant")

        opportunity.owner_id = new_owner_id
        opportunity.last_modified_by_id = current_user_id
        await opportunity.save()
        # Attach the enriched owner name without triggering Beanie/Pydantic's
        # field validation (the model has no `owner_name` field). Plain setattr
        # raises ValueError here; object.__setattr__ bypasses it — matching the
        # account/contact/supplier change_owner services.
        object.__setattr__(opportunity, "owner_name", owner.name)
        return opportunity
