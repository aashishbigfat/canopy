"""
Lead service layer - Business logic for Lead operations
"""
from typing import List, Optional, Dict, Tuple
from bson import ObjectId
from datetime import datetime
from app.models.lead import Lead
from app.models.destination import DestinationLead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadConvert
from app.services.activity_log_service import ActivityLogService
from app.services.notification_service import NotificationService
from app.mixins.activity_mixin import ActivityMixin


class LeadService(ActivityMixin):
    """Service for Lead business logic"""
    
    def __init__(self):
        super().__init__()
        self.activity_service = ActivityLogService()
        self.notification_service = NotificationService()
    
    async def create_lead(
        self,
        lead_data: LeadCreate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        user_name: str = None,
        custom_fields: list = None,
        destination_ids: list = None
    ) -> Lead:
        """Create a new lead with comprehensive activity logging"""
        
        # Store original data for activity logging
        original_data = lead_data.model_dump(exclude_unset=True)
        
        lead = Lead(
            **lead_data.model_dump(exclude_unset=True, exclude={'destination_ids'}),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        await lead.insert()
        
        # Link destinations
        if destination_ids or lead_data.destination_ids:
            dest_ids = destination_ids or lead_data.destination_ids
            for dest_id in dest_ids:
                pivot = DestinationLead(
                    lead_id=lead.id,
                    destination_id=ObjectId(dest_id),
                    tenant_id=tenant_id
                )
                await pivot.insert()
        
        # Save custom fields
        if custom_fields:
            from app.models.lead_custom_fields import LeadCustomField
            import json
            
            for field in custom_fields:
                custom_field = LeadCustomField(
                    lead_id=lead.id,
                    lead_additional_field_id=ObjectId(field['id']),
                    field_value=json.dumps(field['value']),
                    type=field.get('type', 'text'),
                    tenant_id=tenant_id
                )
                await custom_field.insert()
        
        # 🚨 COMPREHENSIVE ACTIVITY LOGGING using ActivityMixin
        await self.log_entity_created(
            entity=lead,
            entity_type="lead",
            additional_data={
                "created_fields": original_data,
                "destination_ids": destination_ids or lead_data.destination_ids,
                "custom_fields_count": len(custom_fields) if custom_fields else 0
            }
        )
        
        # Create notification for lead assignment
        await self.notification_service.notify_user(
            user_id=user_id,
            tenant_id=tenant_id,
            title="New Lead Created",
            message=f"Lead '{getattr(lead, 'name', getattr(lead, 'first_name', 'Unknown'))}' has been created",
            type="lead",
            entity_type="lead",
            entity_id=lead.id,
            action_url=f"/leads/{lead.id}"
        )
        
        return lead
    
    async def get_lead(self, lead_id: str, tenant_id: ObjectId) -> Optional[Lead]:
        """Get lead by ID"""
        lead = await Lead.get(ObjectId(lead_id))
        
        if lead and lead.tenant_id == tenant_id and not lead.deleted_at:
            return lead
        return None
    
    async def update_lead(
        self,
        lead_id: str,
        lead_data: LeadUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        user_name: str = None
    ) -> Optional[Lead]:
        """Update a lead with comprehensive activity logging"""
        lead = await self.get_lead(lead_id, tenant_id)
        
        if not lead:
            return None
        
        # Store original values for change tracking
        original_values = {}
        updated_fields = {}
        
        # Update fields and track changes
        update_data = lead_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            original_value = getattr(lead, field, None)
            original_values[field] = str(original_value) if original_value else None
            setattr(lead, field, value)
            updated_fields[field] = str(value) if value else None
        
        lead.last_modified_by_id = user_id
        await lead.save()
        
        # 🚨 COMPREHENSIVE ACTIVITY LOGGING using ActivityMixin
        if updated_fields:
            await self.log_entity_updated(
                entity=lead,
                entity_type="lead",
                old_values=original_values,
                updated_fields=updated_fields
            )
        
        # Create notification for lead assignment if owner changed
        if 'owner_id' in updated_fields and updated_fields['owner_id'] != original_values['owner_id']:
            new_owner_id = ObjectId(updated_fields['owner_id'])
            await self.notification_service.notify_user(
                user_id=new_owner_id,
                tenant_id=tenant_id,
                title="Lead Assigned",
                message=f"Lead '{getattr(lead, 'name', getattr(lead, 'first_name', 'Unknown'))}' has been assigned to you",
                type="lead",
                entity_type="lead",
                entity_id=lead.id,
                action_url=f"/leads/{lead.id}"
            )
        
        return lead
    
    async def delete_lead(
        self,
        lead_id: str,
        tenant_id: ObjectId,
        user_id: ObjectId,
        user_name: str = None
    ) -> bool:
        """Soft delete a lead with comprehensive activity logging"""
        lead = await self.get_lead(lead_id, tenant_id)
        
        if not lead:
            return False
        
        # Store lead info before deletion
        lead_info = {
            "id": str(lead.id),
            "name": f"{lead.first_name} {lead.last_name}",
            "email": lead.email,
            "company": lead.company,
            "status": str(lead.lead_status_id) if lead.lead_status_id else None
        }
        
        await lead.soft_delete()
        
        # 🚨 COMPREHENSIVE ACTIVITY LOGGING using ActivityMixin
        await self.log_entity_deleted(
            entity=lead,
            entity_type="lead",
            additional_data={"deleted_lead_info": lead_info}
        )
        
        return True
    
    async def get_leads_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10,
        owner_id: Optional[ObjectId] = None,
        is_converted: Optional[bool] = None
    ) -> Tuple[List[Lead], int]:
        """Get leads for a tenant with pagination"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if owner_id:
            query["owner_id"] = owner_id
        
        if is_converted is not None:
            query["is_converted"] = is_converted
        
        # Get total count
        total = await Lead.find(query).count()
        
        # Get paginated results
        leads = await Lead.find(query)\
            .sort("-created_at")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return leads, total
    
    async def search_leads(
        self,
        query: Optional[str],
        tenant_id: ObjectId,
        lead_status_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> Tuple[List[Lead], int]:
        """Search leads"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        # Text search
        if query:
            search_query["$or"] = [
                {"first_name": {"$regex": query, "$options": "i"}},
                {"last_name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"company": {"$regex": query, "$options": "i"}},
                {"phone": {"$regex": query, "$options": "i"}}
            ]
        
        # Filter by status
        if lead_status_id:
            search_query["lead_status_id"] = ObjectId(lead_status_id)
        
        # Get total count
        total = await Lead.find(search_query).count()
        
        # Get results
        leads = await Lead.find(search_query)\
            .sort("-created_at")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return leads, total
    
    async def convert_lead(
        self,
        lead_id: str,
        conversion_data: LeadConvert,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Dict:
        """Convert lead to opportunity (and optionally account/contact)"""
        from app.models.opportunity import Opportunity
        from app.models.account import Account
        from app.models.contact import Contact
        
        lead = await self.get_lead(lead_id, tenant_id)
        if not lead:
            raise ValueError("Lead not found")
        
        if lead.is_converted:
            raise ValueError("Lead already converted")
        
        account_id = None
        contact_id = None
        
        # Create account if needed
        if conversion_data.account_name:
            account = Account(
                name=conversion_data.account_name,
                phone=lead.phone,
                email=lead.email,
                billing_street=lead.street,
                billing_city=lead.city,
                billing_state=lead.state,
                billing_zip=lead.zip,
                billing_country=lead.country,
                website=lead.website,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
            await account.insert()
            account_id = account.id
        
        # Create contact if needed
        if conversion_data.contact_create:
            contact = Contact(
                salutation=lead.salutation,
                first_name=lead.first_name,
                middle_name=lead.middle_name,
                last_name=lead.last_name,
                email=lead.email,
                phone=lead.phone,
                mobile=lead.mobile,
                title=lead.title,
                mailing_street=lead.street,
                mailing_city=lead.city,
                mailing_state=lead.state,
                mailing_zip=lead.zip,
                mailing_country=lead.country,
                account_id=account_id,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
            await contact.insert()
            contact_id = contact.id
        
        # Create opportunity
        # Get default sales stage
        from app.models.opportunity_picklists import SalesStage
        default_stage = await SalesStage.find_one({"is_default": True})
        
        if not default_stage:
            # If no default stage, get first one
            default_stage = await SalesStage.find_one({})
        
        if not default_stage:
            raise ValueError("No sales stages found in the system. Please create sales stages first.")
        
        # Handle date conversion properly
        from datetime import datetime, time
        close_date = None
        if conversion_data.opportunity_close_date:
            if isinstance(conversion_data.opportunity_close_date, str):
                close_date = datetime.strptime(conversion_data.opportunity_close_date, "%Y-%m-%d")
            elif hasattr(conversion_data.opportunity_close_date, 'date'):
                # Handle datetime objects - extract date part
                close_date = datetime.combine(conversion_data.opportunity_close_date.date(), time.min)
            else:
                # Already a date object, convert to datetime
                close_date = datetime.combine(conversion_data.opportunity_close_date, time.min)
        
        print(f"DEBUG: Processed close_date: {close_date}, type: {type(close_date)}")
        
        # Create opportunity with datetime object
        try:
            opportunity = Opportunity(
                name=conversion_data.opportunity_name,
                amount=conversion_data.opportunity_amount,
                close_date=close_date,  # Now as datetime object
                sales_stage_id=default_stage.id,
                account_id=account_id,
                contact_id=contact_id,
                lead_id=lead.id,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
            print("DEBUG: Opportunity object created successfully")
            
            await opportunity.insert()
            print("DEBUG: Opportunity inserted successfully")
            
        except Exception as e:
            print(f"DEBUG: Opportunity creation error: {e}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            raise
        
        # Mark lead as converted
        await lead.convert_to_opportunity(opportunity.id)
        
        return {
            "lead_id": str(lead.id),
            "opportunity_id": str(opportunity.id),
            "account_id": str(account_id) if account_id else None,
            "contact_id": str(contact_id) if contact_id else None
        }
    
    async def change_owner(
        self,
        lead_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId,
        user_name: str = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> Optional[Lead]:
        """Change lead owner with comprehensive activity logging"""
        lead = await self.get_lead(lead_id, tenant_id)
        
        if not lead:
            return None
        
        # Track ownership change
        previous_owner = str(lead.owner_id)
        new_owner = str(new_owner_id)
        
        lead.owner_id = new_owner_id
        lead.last_modified_by_id = current_user_id
        await lead.save()
        
        # 🚨 COMPREHENSIVE ACTIVITY LOGGING using ActivityMixin
        await self.log_assignment_changed(
            entity=lead,
            entity_type="lead",
            old_assigned_to=previous_owner,
            new_assigned_to=new_owner
        )
        
        return lead
    
    
