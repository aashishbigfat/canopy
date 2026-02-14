"""
Lead service layer - Business logic for Lead operations
"""
from typing import List, Optional, Dict, Tuple
from bson import ObjectId
from datetime import datetime, timedelta
from app.models.lead import Lead
from app.models.destination import DestinationLead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadConvert
from app.services.activity_log_service import ActivityLogService
from app.services.notification_service import NotificationService
from app.mixins.activity_mixin import ActivityMixin
from app.models.user import User
from app.models.lead_picklists import LeadStatus, Source
from app.models.picklists import Industry, Rating
from app.models.lead_custom_fields import UserLeadView


class LeadService(ActivityMixin):
    """Service for Lead business logic"""
    
    def __init__(self):
        super().__init__()
        self.activity_service = ActivityLogService()
        self.notification_service = NotificationService()
    
    async def _check_duplicate_lead(
        self, 
        email: Optional[str], 
        mobile: Optional[str], 
        tenant_id: ObjectId
    ) -> Optional[Lead]:
        """Check if a lead with same email or mobile already exists in the tenant"""
        if not email and not mobile:
            return None
            
        from beanie.operators import Or
        
        query_parts = []
        if email:
            query_parts.append(Lead.email == email)
        if mobile:
            query_parts.append(Lead.mobile == mobile)
            
        if not query_parts:
            return None
            
        return await Lead.find_one(
            Lead.tenant_id == tenant_id,
            Or(*query_parts),
            Lead.deleted_at == None
        )

    async def _auto_assign_lead(self, tenant_id: ObjectId) -> Optional[ObjectId]:
        """Find the next user for assignment using Round-Robin (oldest last_assigned_at)"""
        # Pick a user who is active and available for assignment
        # Sort by last_assigned_at ascending to get the one who hasn't been assigned for the longest
        available_users = await User.find(
            User.tenant_id == tenant_id,
            User.is_active == True,
            User.is_available_for_assignment == True
        ).sort("+last_assigned_at").to_list()
        
        if not available_users:
            return None
            
        assigned_user = available_users[0]
        assigned_user.last_assigned_at = datetime.utcnow()
        await assigned_user.save()
        
        return assigned_user.id

    async def create_lead(
        self,
        lead_data: LeadCreate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        user_name: str = None,
        custom_fields: list = None,
        destination_ids: list = None,
        auto_assign: bool = False
    ) -> Lead:
        """Create a new lead with comprehensive activity logging and deduplication"""
        
        # 1. Deduplication check
        duplicate = await self._check_duplicate_lead(
            lead_data.email, 
            lead_data.mobile, 
            tenant_id
        )
        if duplicate:
            raise ValueError(f"A lead with this contact information already exists: {duplicate.first_name} {duplicate.last_name}")

        # 2. Handle Auto-assignment
        owner_id = user_id
        if auto_assign:
            new_owner_id = await self._auto_assign_lead(tenant_id)
            if new_owner_id:
                owner_id = new_owner_id

        # Store original data for activity logging
        original_data = lead_data.model_dump(exclude_unset=True)
        
        lead = Lead(
            **lead_data.model_dump(exclude_unset=True, exclude={'destination_ids'}),
            tenant_id=tenant_id,
            owner_id=owner_id,
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
        """Convert lead to opportunity (and optionally account/contact) with enterprise logic"""
        from app.models.opportunity import Opportunity
        from app.models.account import Account
        from app.models.contact import Contact
        from app.models.opportunity_picklists import SalesStage
        
        lead = await self.get_lead(lead_id, tenant_id)
        if not lead:
            raise ValueError("Lead not found")
        
        if lead.is_converted:
            raise ValueError(f"Lead already converted to opportunity {lead.opportunity_id}")
        
        account_id = None
        contact_id = None
        
        # 1. Handle Account (Existing or New)
        if conversion_data.account_id:
            account_id = ObjectId(conversion_data.account_id)
            # Verify account exists and belongs to tenant
            existing_account = await Account.get(account_id)
            if not existing_account or existing_account.tenant_id != tenant_id:
                raise ValueError("Specified account not found")
        elif conversion_data.account_name or (not conversion_data.account_id and not conversion_data.account_name):
            # Auto-determine if it's a Person Account based on presence of company
            is_person_account = conversion_data.account_type == "Person Account"
            if not lead.company and not conversion_data.account_name:
                is_person_account = True
                account_name = f"{lead.first_name} {lead.last_name}"
            else:
                account_name = conversion_data.account_name or lead.company or f"{lead.first_name} {lead.last_name}"

            account = Account(
                name=account_name,
                phone=lead.phone,
                email=lead.email,
                website=lead.website,
                billing_street=lead.street,
                billing_city=lead.city,
                billing_state=lead.state,
                billing_zip=lead.zip,
                billing_country=lead.country,
                industry_id=lead.industry_id,
                rating_id=lead.rating_id,
                account_source_id=lead.source_id,
                is_person_account=is_person_account,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
            await account.insert()
            account_id = account.id
            
            # Log Account creation
            await self.log_entity_created(
                entity=account,
                entity_type="account",
                additional_data={"converted_from_lead_id": str(lead.id), "is_person_account": account.is_person_account}
            )
        
        # 2. Handle Contact (Existing or New)
        if conversion_data.contact_id:
            contact_id = ObjectId(conversion_data.contact_id)
            # Verify contact exists and belongs to tenant
            existing_contact = await Contact.get(contact_id)
            if not existing_contact or existing_contact.tenant_id != tenant_id:
                raise ValueError("Specified contact not found")
            
            # Optionally link contact to account if not already linked
            if account_id and existing_contact.account_id != account_id:
                # We could update the primary account or just add a pivot
                # For simplicity during conversion, we update the primary if it's null
                if not existing_contact.account_id:
                    existing_contact.account_id = account_id
                    await existing_contact.save()
        elif conversion_data.contact_create:
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
            
            # Log Contact creation
            await self.log_entity_created(
                entity=contact,
                entity_type="contact",
                additional_data={"converted_from_lead_id": str(lead.id)}
            )
            
            # If account exists, create pivot entry
            if account_id:
                from app.models.account_contact import AccountContact
                pivot = AccountContact(
                    account_id=account_id,
                    contact_id=contact_id,
                    tenant_id=tenant_id
                )
                await pivot.insert()
        
        # 3. Handle Opportunity (Optional)
        opportunity_id = None
        if conversion_data.create_opportunity:
            # Get default sales stage
            sales_stage_id = None
            if conversion_data.sales_stage_id:
                sales_stage_id = ObjectId(conversion_data.sales_stage_id)
            else:
                default_stage = await SalesStage.find_one({"is_default": True}) or await SalesStage.find_one({})
                if not default_stage:
                    raise ValueError("No sales stages found. Please configure sales stages first.")
                sales_stage_id = default_stage.id

            # Handle close date
            from datetime import datetime, time, timedelta
            close_date = None
            if conversion_data.opportunity_close_date:
                if isinstance(conversion_data.opportunity_close_date, str):
                    close_date = datetime.strptime(conversion_data.opportunity_close_date, "%Y-%m-%d")
                elif hasattr(conversion_data.opportunity_close_date, 'date'):
                    close_date = datetime.combine(conversion_data.opportunity_close_date.date(), time.min)
                else:
                    close_date = datetime.combine(conversion_data.opportunity_close_date, time.min)
            else:
                # Default close date to 30 days from now
                close_date = datetime.utcnow() + timedelta(days=30)

            # Handle travel date - use from conversion or inherit from lead
            travel_date = None
            if conversion_data.travel_date:
                if isinstance(conversion_data.travel_date, str):
                    travel_date = datetime.strptime(conversion_data.travel_date, "%Y-%m-%d")
                elif hasattr(conversion_data.travel_date, 'date'):
                    travel_date = datetime.combine(conversion_data.travel_date.date(), time.min)
                else:
                    travel_date = datetime.combine(conversion_data.travel_date, time.min)
            elif lead.travel_date:
                if isinstance(lead.travel_date, str):
                    try:
                        travel_date = datetime.strptime(lead.travel_date, "%Y-%m-%d")
                    except:
                        pass

            # Dest IDs - use from conversion data, or fall back to lead's destinations
            dest_ids = []
            dest_names = []
            if conversion_data.destination_ids:
                dest_ids = [ObjectId(d) for d in conversion_data.destination_ids]
            elif lead.destination_ids:
                dest_ids = lead.destination_ids

            if dest_ids:
                from app.models.destination import Destination
                destinations_objs = await Destination.find(Destination.id.in_(dest_ids)).to_list()
                dest_names = [d.name for d in destinations_objs]

            # Standardized Opportunity Name: [Destination]_[Pax]Pax_[TravelDate]
            if not conversion_data.opportunity_name:
                dest_str = dest_names[0] if dest_names else "Opportunity"
                pax = conversion_data.no_of_pax or lead.no_of_pax or 0
                date_str = f"_{travel_date.strftime('%d%b')}" if travel_date else ""
                opportunity_name = f"{dest_str}_{pax}Pax{date_str}"
            else:
                opportunity_name = conversion_data.opportunity_name

            opportunity = Opportunity(
                name=opportunity_name,
                amount=conversion_data.opportunity_amount,
                close_date=close_date,
                travel_date=travel_date,
                no_of_pax=conversion_data.no_of_pax or lead.no_of_pax,
                no_of_adults=conversion_data.no_of_adults,
                no_of_childs=conversion_data.no_of_childs,
                no_of_infants=conversion_data.no_of_infants,
                no_of_nights=conversion_data.no_of_nights or lead.no_of_nights,
                description=conversion_data.description,
                destination_ids=dest_ids,
                experience_id=ObjectId(conversion_data.experience_id) if conversion_data.experience_id else None,
                sales_stage_id=sales_stage_id,
                account_id=account_id,
                contact_id=contact_id,
                lead_id=lead.id,
                source_id=lead.source_id,
                source_medium_id=lead.source_medium_id,
                tenant_id=tenant_id,
                owner_id=ObjectId(conversion_data.opportunity_owner_id) if conversion_data.opportunity_owner_id else user_id,
                created_by=user_id
            )
            await opportunity.insert()
            opportunity_id = opportunity.id
            
            # Log Opportunity creation
            await self.log_entity_created(
                entity=opportunity,
                entity_type="opportunity",
                additional_data={"converted_from_lead_id": str(lead.id)}
            )

            # 4. Create Automated "Initial Follow-up" Task
            from app.models.task import Task
            task = Task(
                name=f"Initial Follow-up: {opportunity_name}",
                due_date=datetime.utcnow() + timedelta(days=1),
                status="Not Started",
                priority="High",
                taskable_type="Opportunity",
                taskable_id=opportunity_id,
                owner_id=opportunity.owner_id,
                assigned_user_id=opportunity.owner_id,
                tenant_id=tenant_id,
                created_by=user_id,
                description=f"Automated follow-up for converted lead: {lead.first_name} {lead.last_name}"
            )
            await task.insert()
        
        # 4. Finalize Lead Conversion
        await lead.convert_to_opportunity(opportunity_id)
        
        # Soft delete the lead so it doesn't show up in the main list
        await lead.soft_delete()
        
        # Log Lead conversion
        conversion_summary = {
            "account_id": str(account_id) if account_id else None,
            "contact_id": str(contact_id) if contact_id else None,
            "opportunity_id": str(opportunity_id) if opportunity_id else None
        }
        await self.activity_service.log_activity(
            user_id=user_id,
            user_name=lead.full_name or "Unknown",  # Or fetch from current_user if available
            tenant_id=tenant_id,
            action="converted",
            entity_type="lead",
            entity_id=lead.id,
            description=f"Lead converted to {', '.join([k.split('_')[0] for k, v in conversion_summary.items() if v])}",
            changes=conversion_summary
        )
        
        return {
            "lead_id": str(lead.id),
            "opportunity_id": str(opportunity_id) if opportunity_id else None,
            "account_id": str(account_id) if account_id else None,
            "contact_id": str(contact_id) if contact_id else None
        }

    async def get_conversion_suggestions(self, lead_id: str, tenant_id: ObjectId) -> Dict:
        """Find potential existing accounts and contacts for a lead"""
        from app.models.account import Account
        from app.models.contact import Contact
        
        lead = await self.get_lead(lead_id, tenant_id)
        if not lead:
            raise ValueError("Lead not found")
        
        suggestions = {
            "accounts": [],
            "contacts": []
        }
        
        # 1. Search for accounts (by company name or email domain)
        if lead.company:
            # Exact match first
            accounts = await Account.find(
                Account.tenant_id == tenant_id,
                Account.name == lead.company,
                Account.deleted_at == None
            ).to_list()
            
            if not accounts:
                # Fuzzy match
                accounts = await Account.find(
                    Account.tenant_id == tenant_id,
                    Account.name.regex(f"(?i){lead.company}"),
                    Account.deleted_at == None
                ).limit(5).to_list()
                
            suggestions["accounts"] = [
                {"id": str(a.id), "name": a.name, "email": a.email, "match_type": "company_name"}
                for a in accounts
            ]
            
        # 2. Search for contacts (by email or full name)
        if lead.email:
            contacts = await Contact.find(
                Contact.tenant_id == tenant_id,
                Contact.email == lead.email,
                Contact.deleted_at == None
            ).to_list()
            
            for c in contacts:
                suggestions["contacts"].append({
                    "id": str(c.id),
                    "name": f"{c.first_name} {c.last_name}",
                    "email": c.email,
                    "match_type": "email"
                })
        
        # Search by name if lead email didn't yield enough results
        if len(suggestions["contacts"]) < 3:
            contacts_by_name = await Contact.find(
                Contact.tenant_id == tenant_id,
                Contact.first_name == lead.first_name,
                Contact.last_name == lead.last_name,
                Contact.deleted_at == None
            ).limit(5).to_list()
            
            existing_ids = [c["id"] for c in suggestions["contacts"]]
            for c in contacts_by_name:
                if str(c.id) not in existing_ids:
                    suggestions["contacts"].append({
                        "id": str(c.id),
                        "name": f"{c.first_name} {c.last_name}",
                        "email": c.email,
                        "match_type": "name"
                    })
                    
        return suggestions
    
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
    
    
    async def get_leads_with_metadata(
        self,
        tenant_id: ObjectId,
        page: int = 1,
        per_page: int = 10,
        owner_id: Optional[str] = None,
        is_converted: Optional[bool] = None,
        view: Optional[str] = None,
        current_user_id: Optional[ObjectId] = None
    ) -> Dict:
        """Get leads with metadata (statuses, sources, users, etc.)"""
        
        # 1. Build base query / special view queries
        filters = [
            Lead.tenant_id == tenant_id,
            Lead.deleted_at == None,  # noqa: E711
        ]

        if owner_id:
            filters.append(Lead.owner_id == ObjectId(owner_id))

        if is_converted is not None:
            filters.append(Lead.is_converted == is_converted)

        all_leads: List[Lead] = []
        
        # Date-based views
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        tomorrow_start = today_start + timedelta(days=1)
        yesterday_start = today_start - timedelta(days=1)
        last_week_start = today_start - timedelta(days=7)

        if view in ("today", "todays_lead", "todays"):
            filters.append(Lead.created_at >= today_start)
            filters.append(Lead.created_at < tomorrow_start)
        elif view == "yesterday":
            filters.append(Lead.created_at >= yesterday_start)
            filters.append(Lead.created_at < today_start)
        elif view == "last_week":
            filters.append(Lead.created_at >= last_week_start)
            filters.append(Lead.created_at < tomorrow_start)

        # Recently viewed: use UserLeadView ordering
        if view in ("recent", "recently_viewed") and current_user_id:
            recent_views = await UserLeadView.find(
                UserLeadView.user_id == current_user_id,
                UserLeadView.tenant_id == tenant_id,
            ).sort("-updated_at").limit(200).to_list()
            
            lead_ids = [rv.lead_id for rv in recent_views]
            if lead_ids:
                leads_query = Lead.find(
                    Lead.id.in_(lead_ids),
                    Lead.tenant_id == tenant_id,
                    Lead.deleted_at == None,  # noqa: E711
                )
                leads = await leads_query.to_list()
                lead_map = {l.id: l for l in leads}
                all_leads = [lead_map[lid] for lid in lead_ids if lid in lead_map]
            else:
                all_leads = []
        else:
            # Sort by created_at desc for all other views
            all_leads = await Lead.find(*filters).sort("-created_at").to_list()

        # Paginate
        total = len(all_leads)
        skip = (page - 1) * per_page
        leads = all_leads[skip : skip + per_page]
        pages = (total + per_page - 1) // per_page if per_page > 0 else 0

        # 2. Fetch Metadata in parallel
        import asyncio
        from app.models.opportunity_picklists import Experience, SalesStage
        metadata_tasks = [
            LeadStatus.find(LeadStatus.is_active == True).sort("+sorting").to_list(),
            Source.find(Source.tenant_id == tenant_id, Source.is_active == True).sort("+sorting").to_list(),
            User.find(User.tenant_id == tenant_id, User.is_active == True).sort("+name").to_list(),
            Industry.find(Industry.tenant_id == tenant_id, Industry.is_active == True).sort("+sorting").to_list(),
            Rating.find(Rating.is_active == True).sort("+sorting").to_list(),
            Experience.find(Experience.tenant_id == tenant_id, Experience.is_active == True).sort("+sorting").to_list(),
            SalesStage.find(SalesStage.tenant_id == tenant_id, SalesStage.is_active == True).sort("+sorting").to_list()
        ]
        
        metadata_results = await asyncio.gather(*metadata_tasks)
        
        lead_statuses, sources, users, industries, ratings, experiences, sales_stages = metadata_results

        return {
            "leads": leads,
            "pagination": {
                "current_page": page,
                "total": total,
                "per_page": per_page,
                "pages": pages,
            },
            "lead_statuses": [
                {"id": str(ls.id), "name": ls.name, "color": ls.color}
                for ls in lead_statuses
            ],
            "sources": [
                {"id": str(s.id), "name": s.name}
                for s in sources
            ],
            "users": [
                {"id": str(u.id), "name": u.name, "email": u.email}
                for u in users
            ],
            "industries": [
                {"id": str(i.id), "name": i.name}
                for i in industries
            ],
            "ratings": [
                {"id": str(r.id), "name": r.name}
                for r in ratings
            ],
            "experiences": [
                {"id": str(e.id), "name": e.name}
                for e in experiences
            ],
            "sales_stages": [
                {"id": str(ss.id), "name": ss.name}
                for ss in sales_stages
            ],
        }

    async def bulk_delete(
        self,
        lead_ids: List[str],
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> Dict[str, int]:
        """Bulk delete leads"""
        # Convert IDs to ObjectIds
        ids = [ObjectId(lid) for lid in lead_ids]
        
        # Verify leads belong to tenant
        leads = await Lead.find(
            Lead.id.in_(ids),
            Lead.tenant_id == tenant_id,
            Lead.deleted_at == None
        ).to_list()
        
        if not leads:
            return {"deleted": 0, "total": 0}
            
        count = 0
        for lead in leads:
            await self.delete_lead(str(lead.id), tenant_id, user_id)
            count += 1
            
        return {"deleted": count, "total": len(lead_ids)}

    async def bulk_change_owner(
        self,
        lead_ids: List[str],
        new_owner_id: str,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> Dict[str, int]:
        """Bulk change lead owner"""
        # Convert IDs to ObjectIds
        ids = [ObjectId(lid) for lid in lead_ids]
        new_owner_oid = ObjectId(new_owner_id)
        
        # Verify leads belong to tenant
        leads = await Lead.find(
            Lead.id.in_(ids),
            Lead.tenant_id == tenant_id,
            Lead.deleted_at == None
        ).to_list()
        
        if not leads:
            return {"updated": 0, "total": 0}
            
        count = 0
        for lead in leads:
            # Skip if already owned by new owner
            if lead.owner_id == new_owner_oid:
                continue
                
            await self.change_owner(str(lead.id), new_owner_oid, user_id, tenant_id)
            count += 1
            
        return {"updated": count, "total": len(lead_ids)}
