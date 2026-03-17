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
from app.models.picklists import Industry
from app.models.lead_custom_fields import UserLeadView
from app.core.cache import invalidate_tenant_cache
from app.repositories.lead_repository import LeadRepository


class LeadService(ActivityMixin):
    """Service for Lead business logic"""
    
    def __init__(self):
        super().__init__()
        self.activity_service = ActivityLogService()
        self.notification_service = NotificationService()
        self.repository = LeadRepository()
    
    async def _check_duplicate_lead(
        self, 
        email: Optional[str], 
        mobile: Optional[str], 
        tenant_id: ObjectId
    ) -> Optional[Lead]:
        """Check if a lead with same email or mobile already exists in the tenant"""
        if not email and not mobile:
            return None
            
        return await self.repository.get_by_email_or_mobile(
            tenant_id=tenant_id,
            email=email,
            mobile=mobile
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
            message=f"Lead '{lead.full_name}' has been created",
            type="lead",
            entity_type="lead",
            entity_id=lead.id,
            action_url=f"/leads/{lead.id}"
        )
        
        # Invalidate dashboard cache
        await invalidate_tenant_cache(str(tenant_id))
        
        return lead
    async def get_lead(self, lead_id: str, tenant_id: ObjectId) -> Optional[Lead]:
        """Get lead by ID (allows soft-deleted/converted leads)"""
        # We allow converted leads here to avoid 404 errors in the UI after conversion
        try:
            return await Lead.find_one(
                Lead.id == ObjectId(lead_id),
                Lead.tenant_id == tenant_id
            )
        except Exception:
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
        
        # 1. Deduplication check if email or mobile changed
        email_changed = 'email' in lead_data.model_dump(exclude_unset=True) and lead_data.email != lead.email
        mobile_changed = 'mobile' in lead_data.model_dump(exclude_unset=True) and lead_data.mobile != lead.mobile
        
        if email_changed or mobile_changed:
            duplicate = await self._check_duplicate_lead(
                lead_data.email if email_changed else lead.email,
                lead_data.mobile if mobile_changed else lead.mobile,
                tenant_id
            )
            # If a duplicate is found and it's not the current lead
            if duplicate and duplicate.id != lead.id:
                raise ValueError(f"A lead with this contact information already exists: {duplicate.first_name} {duplicate.last_name}")

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
        
        # Invalidate dashboard cache
        await invalidate_tenant_cache(str(tenant_id))
        
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
        
        # Invalidate dashboard cache
        await invalidate_tenant_cache(str(tenant_id))
        
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
        return await self.repository.get_filtered_leads(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            owner_id=owner_id,
            is_converted=is_converted
        )
    
    async def search_leads(
        self,
        query: Optional[str],
        tenant_id: ObjectId,
        lead_status_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> Tuple[List[Lead], int]:
        """Search leads"""
        return await self.repository.search(
            tenant_id=tenant_id,
            query_text=query,
            lead_status_id=lead_status_id,
            skip=skip,
            limit=limit
        )
        
    def _extract_domain(self, email: Optional[str]) -> Optional[str]:
        """Extract domain from email address, ignoring public providers"""
        if not email or "@" not in email:
            return None
            
        domain = email.split("@")[-1].lower()
        public_domains = {
            "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
            "me.com", "live.com", "msn.com", "aol.com", "mail.com", "zoho.com",
            "yandex.com", "protonmail.com", "tutanota.com", "gmail.co.in", "yahoo.co.in"
        }
        
        if domain in public_domains:
            return None
            
        return domain

    async def _find_duplicate_account(
        self,
        account_name: str,
        email: Optional[str],
        phone: Optional[str],
        is_person_account: bool,
        tenant_id: ObjectId
    ) -> Optional[ObjectId]:
        """Find an existing account by name, email, phone, or domain to prevent duplicates during conversion"""
        from app.models.account import Account
        
        # 1. Check exact name match first
        if account_name:
            account = await Account.find_one(
                Account.tenant_id == tenant_id,
                Account.name == account_name,
                Account.is_person_account == is_person_account,
                Account.deleted_at == None
            )
            if account:
                return account.id
                
        # 2. Check email if provided
        if email:
            account = await Account.find_one(
                Account.tenant_id == tenant_id,
                Account.email == email,
                Account.is_person_account == is_person_account,
                Account.deleted_at == None
            )
            if account:
                return account.id
                
        # 3. Check phone as last resort
        if phone:
            account = await Account.find_one(
                Account.tenant_id == tenant_id,
                Account.phone == phone,
                Account.is_person_account == is_person_account,
                Account.deleted_at == None
            )
            if account:
                return account.id
        
        # 4. Check domain match (for corporate accounts)
        if not is_person_account and email:
            domain = self._extract_domain(email)
            if domain:
                # Search for accounts with same domain in website or email
                account = await Account.find_one(
                    Account.tenant_id == tenant_id,
                    Account.is_person_account == False,
                    Account.deleted_at == None,
                    {
                        "$or": [
                            {"email": {"$regex": f"@{domain}$", "$options": "i"}},
                            {"website": {"$regex": domain, "$options": "i"}}
                        ]
                    }
                )
                if account:
                    return account.id
                
        return None
    
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
        is_person_account = False
        
        # ==================================================================
        # STEP 1: Handle Account FIRST (before contact, to avoid orphans)
        # ==================================================================
        if conversion_data.account_id:
            # Use explicitly specified existing account
            try:
                account_id = ObjectId(conversion_data.account_id)
            except Exception:
                raise ValueError("Invalid account ID format")
                
            existing_account = await Account.get(account_id)
            if not existing_account or existing_account.tenant_id != tenant_id:
                raise ValueError("Specified account not found")
            is_person_account = existing_account.is_person_account
        else:
            # Determine account name and type
            is_person_account = conversion_data.account_type == "Person Account"
            if not lead.company and not conversion_data.account_name:
                is_person_account = True
                account_name = f"{lead.first_name} {lead.last_name}".strip()
            else:
                account_name = conversion_data.account_name or lead.company or f"{lead.first_name} {lead.last_name}".strip()

            # Check for duplicate account — auto-reuse instead of crashing
            existing_dup = await self._find_duplicate_account(
                account_name, lead.email, lead.phone, is_person_account, tenant_id
            )
            
            if existing_dup:
                # Auto-reuse the existing account instead of failing
                account_id = existing_dup
            else:
                # Create new account
                account = Account(
                    name=account_name,
                    phone=lead.phone,
                    mobile=lead.mobile if is_person_account else None,
                    email=lead.email,
                    website=lead.website,
                    billing_street=lead.street,
                    billing_city=lead.city,
                    billing_state=lead.state,
                    billing_zip=lead.zip,
                    billing_country=lead.country,
                    industry_id=lead.industry_id,
                    account_source_id=lead.source_id,
                    is_person_account=is_person_account,
                    salutation=lead.salutation if is_person_account else None,
                    first_name=lead.first_name if is_person_account else None,
                    last_name=lead.last_name if is_person_account else None,
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
                
                # Notification for Account creation
                await self.notification_service.notify_user(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    title="New Account Created",
                    message=f"Account '{account.name}' has been created from Lead conversion",
                    type="account",
                    entity_type="account",
                    entity_id=account.id,
                    action_url=f"/accounts/{account.id}"
                )
        
        # ==================================================================
        # STEP 2: Handle Contact (after account is guaranteed to exist)
        # ==================================================================
        if conversion_data.contact_id:
            try:
                contact_id = ObjectId(conversion_data.contact_id)
            except Exception:
                raise ValueError("Invalid contact ID format")
                
            # Verify contact exists and belongs to tenant
            existing_contact = await Contact.get(contact_id)
            if not existing_contact or existing_contact.tenant_id != tenant_id:
                raise ValueError("Specified contact not found")
            
            # Link contact to account if needed
            if account_id and existing_contact.account_id != account_id:
                if not existing_contact.account_id:
                    existing_contact.account_id = account_id
                    await existing_contact.save()
                else:
                    # Create pivot entry for additional account associations
                    from app.models.account_contact import AccountContact
                    existing_pivot = await AccountContact.find_one({
                        "account_id": account_id,
                        "contact_id": contact_id
                    })
                    if not existing_pivot:
                        pivot = AccountContact(
                            account_id=account_id,
                            contact_id=contact_id,
                            tenant_id=tenant_id
                        )
                        await pivot.insert()
                        
        elif conversion_data.contact_create:
            # Check if contact already exists by email to avoid duplicates
            existing_contact_dup = None
            if lead.email:
                existing_contact_dup = await Contact.find_one(
                    Contact.tenant_id == tenant_id,
                    Contact.email == lead.email,
                    Contact.deleted_at == None
                )
            
            if existing_contact_dup:
                # Reuse existing contact
                contact_id = existing_contact_dup.id
                # Link to account if not already linked
                if account_id and existing_contact_dup.account_id != account_id:
                    if not existing_contact_dup.account_id:
                        existing_contact_dup.account_id = account_id
                        await existing_contact_dup.save()
                    else:
                        from app.models.account_contact import AccountContact
                        existing_pivot = await AccountContact.find_one({
                            "account_id": account_id,
                            "contact_id": contact_id
                        })
                        if not existing_pivot:
                            pivot = AccountContact(
                                account_id=account_id,
                                contact_id=contact_id,
                                tenant_id=tenant_id
                            )
                            await pivot.insert()
            else:
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
                
                # Notification for Contact creation
                await self.notification_service.notify_user(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    title="New Contact Created",
                    message=f"Contact '{contact.full_name}' has been created from Lead conversion",
                    type="contact",
                    entity_type="contact",
                    entity_id=contact.id,
                    action_url=f"/contacts/{contact.id}"
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
        
        # ==================================================================
        # STEP 3: Handle Opportunity (Optional)
        # ==================================================================
        opportunity_id = None
        if conversion_data.create_opportunity:
            # Get default sales stage
            sales_stage_id = None
            stage_probability = 0  # Track probability from the resolved stage
            # Ignore invalid placeholder values from frontend
            raw_stage_id = conversion_data.sales_stage_id
            invalid_stage_values = ("no-sales-stages", "", None, "undefined", "null")
            if raw_stage_id and str(raw_stage_id).lower() not in invalid_stage_values:
                try:
                    sales_stage_id = ObjectId(raw_stage_id)
                    # Verify stage exists and grab its probability
                    stage_exists = await SalesStage.get(sales_stage_id)
                    if not stage_exists:
                        sales_stage_id = None  # Fall through to default lookup
                    else:
                        stage_probability = stage_exists.probability or 0
                except Exception:
                    sales_stage_id = None  # Fall through to default lookup
            
            if not sales_stage_id:
                # Try to find 'Receive' stage first
                receive_stage = await SalesStage.find_one(
                    SalesStage.name == "Receive",
                    SalesStage.is_active == True
                )
                if receive_stage:
                    sales_stage_id = receive_stage.id
                    stage_probability = receive_stage.probability or 0

            if not sales_stage_id:
                # Try tenant-specific default stage first, then global
                default_stage = await SalesStage.find_one(
                    SalesStage.is_default == True,
                    SalesStage.is_active == True
                )
                if not default_stage:
                    # Try first tenant-specific stage
                    first_stage = await SalesStage.find_one(
                        SalesStage.is_active == True
                    )
                    if first_stage:
                        sales_stage_id = first_stage.id
                        stage_probability = first_stage.probability or 0
                    # If no stages at all, still proceed (stage is optional)
                else:
                    sales_stage_id = default_stage.id
                    stage_probability = default_stage.probability or 0

            # FINAL FALLBACK: If still no sales stage found, try to get ANY active stage
            if not sales_stage_id:
                any_stage = await SalesStage.find_one(SalesStage.is_active == True)
                if any_stage:
                    sales_stage_id = any_stage.id
                    stage_probability = any_stage.probability or 0
                else:
                    # If absolutely no stages exist in the system, we must raise a helpful error
                    # but the model requires it, so a descriptive ValueError is better than a 500 crash.
                    raise ValueError("No Sales Stages found in the system. Please configure Sales Stages first.")

            # Handle close date
            from datetime import datetime, time, timedelta
            import logging
            logger = logging.getLogger(__name__)
            
            close_date = None
            if conversion_data.opportunity_close_date:
                if isinstance(conversion_data.opportunity_close_date, datetime):
                    close_date = conversion_data.opportunity_close_date
                elif hasattr(conversion_data.opportunity_close_date, 'date'):
                    # It's a date object
                    close_date = datetime.combine(conversion_data.opportunity_close_date, time.min)
                elif isinstance(conversion_data.opportunity_close_date, str) and conversion_data.opportunity_close_date.strip():
                    # Robust parsing for string dates (handles ISO and YYYY-MM-DD)
                    try:
                        # Try ISO format first (e.g. 2026-02-21T12:28:44.205Z)
                        clean_date = conversion_data.opportunity_close_date.replace('Z', '+00:00')
                        close_date = datetime.fromisoformat(clean_date)
                    except (ValueError, TypeError):
                        try:
                            # Fallback to simple YYYY-MM-DD
                            close_date = datetime.strptime(conversion_data.opportunity_close_date[:10], "%Y-%m-%d")
                        except (ValueError, TypeError):
                            logger.warning(f"Could not parse opportunity_close_date: {conversion_data.opportunity_close_date}")
                            close_date = datetime.utcnow() + timedelta(days=30)
                else:
                    close_date = datetime.utcnow() + timedelta(days=30)
            else:
                # Default close date to 30 days from now
                close_date = datetime.utcnow() + timedelta(days=30)

            # Handle travel date - use from conversion or inherit from lead
            travel_date = None
            if conversion_data.travel_date:
                if isinstance(conversion_data.travel_date, datetime):
                    travel_date = conversion_data.travel_date
                elif hasattr(conversion_data.travel_date, 'date'):
                    travel_date = datetime.combine(conversion_data.travel_date, time.min)
                elif isinstance(conversion_data.travel_date, str) and conversion_data.travel_date.strip():
                    try:
                        clean_date = conversion_data.travel_date.replace('Z', '+00:00')
                        travel_date = datetime.fromisoformat(clean_date)
                    except (ValueError, TypeError):
                        try:
                            travel_date = datetime.strptime(conversion_data.travel_date[:10], "%Y-%m-%d")
                        except (ValueError, TypeError):
                            logger.warning(f"Could not parse conversion travel_date: {conversion_data.travel_date}")
            
            # Inheritance if travel_date still None
            if not travel_date and lead.travel_date:
                if isinstance(lead.travel_date, datetime):
                    travel_date = lead.travel_date
                elif hasattr(lead.travel_date, 'date'):
                    travel_date = datetime.combine(lead.travel_date, time.min)
                elif isinstance(lead.travel_date, str) and lead.travel_date.strip():
                    try:
                        # Lead travel_date might be simple YYYY-MM-DD
                        travel_date = datetime.strptime(lead.travel_date[:10], "%Y-%m-%d")
                    except (ValueError, TypeError):
                        pass

            # Dest IDs - use from conversion data, or fall back to lead's destinations
            dest_ids = []
            dest_names = []
            if conversion_data.destination_ids:
                for d in conversion_data.destination_ids:
                    try:
                        dest_ids.append(ObjectId(d))
                    except Exception:
                        pass # Skip invalid IDs
            elif lead.destination_ids:
                dest_ids = lead.destination_ids or []
            
            # Final safety check to ensure dest_ids is a list of ObjectIds
            if dest_ids and isinstance(dest_ids, list):
                clean_dest_ids = []
                for d in dest_ids:
                    if isinstance(d, ObjectId):
                        clean_dest_ids.append(d)
                    elif isinstance(d, str) and d.strip():
                        try:
                            clean_dest_ids.append(ObjectId(d))
                        except:
                            pass
                dest_ids = clean_dest_ids
            else:
                dest_ids = []

            if dest_ids:
                from app.models.destination import Destination
                destinations_objs = await Destination.find({"_id": {"$in": dest_ids}}).to_list()
                dest_names = [d.name for d in destinations_objs]

            # Standardized Opportunity Name: [Destination]_[Pax]Pax_[TravelDate]
            if not conversion_data.opportunity_name:
                dest_str = dest_names[0] if dest_names else (lead.company or lead.full_name or "Opportunity")
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
                no_of_adults=conversion_data.no_of_adults or lead.no_of_adults,
                no_of_childs=conversion_data.no_of_childs if conversion_data.no_of_childs is not None else lead.no_of_childs,
                no_of_infants=conversion_data.no_of_infants if conversion_data.no_of_infants is not None else lead.no_of_infants,
                no_of_nights=conversion_data.no_of_nights or lead.no_of_nights,
                description=conversion_data.description,
                destination_ids=dest_ids,
                experience_id=None, # Set below with safe conversion
                sales_stage_id=sales_stage_id,
                probability=stage_probability,  # Auto-set from stage
                account_id=account_id,
                contact_id=contact_id,
                # Add polymorphic relationship fields
                opportunitable_type="Account" if not is_person_account else "PersonalAccount",
                opportunitable_id=account_id,
                lead_id=lead.id,
                segment=lead.segment,
                source_id=lead.source_id,
                source_medium_id=lead.source_medium_id,
                tenant_id=tenant_id,
                owner_id=user_id, # Default to current user
                created_by=user_id
            )
            
            # Safe conversion for experience_id
            if conversion_data.experience_id and conversion_data.experience_id not in ("no-experiences", ""):
                try:
                    opportunity.experience_id = ObjectId(conversion_data.experience_id)
                except Exception:
                    pass # Keep None if invalid
            elif lead.experience_id:
                opportunity.experience_id = lead.experience_id
            
            # Safe conversion for other optional IDs from conversion_data if they were added
            # (Ensuring any string IDs are converted to ObjectIds for the model)
            if isinstance(opportunity.tenant_id, str):
                opportunity.tenant_id = ObjectId(opportunity.tenant_id)
            if isinstance(opportunity.owner_id, str):
                opportunity.owner_id = ObjectId(opportunity.owner_id)
            if isinstance(opportunity.created_by, str):
                opportunity.created_by = ObjectId(opportunity.created_by)
            
            # Use specified owner if valid
            if conversion_data.opportunity_owner_id:
                try:
                    opportunity.owner_id = ObjectId(conversion_data.opportunity_owner_id)
                except Exception:
                    pass # Keep default if invalid
            try:
                await opportunity.insert()
                opportunity_id = opportunity.id
            except Exception as e:
                logger.error(f"Error inserting opportunity during conversion: {str(e)}")
                raise ValueError(f"Failed to create opportunity: {str(e)}")
            
            # Log Opportunity creation
            try:
                await self.log_entity_created(
                    entity=opportunity,
                    entity_type="opportunity",
                    additional_data={"converted_from_lead_id": str(lead.id)}
                )
                
                # Notification for Opportunity creation
                await self.notification_service.notify_user(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    title="New Opportunity Created",
                    message=f"Opportunity '{opportunity.name}' worth ₹{opportunity.amount:,.2f} has been created from Lead conversion",
                    type="opportunity",
                    entity_type="opportunity",
                    entity_id=opportunity.id,
                    action_url=f"/opportunities/{opportunity.id}"
                )
            except Exception as e:
                logger.warning(f"Optional logging failed for opportunity creation: {str(e)}")

            # 4. Create Automated "Initial Follow-up" Task
            try:
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
            except Exception as e:
                logger.warning(f"Optional task creation failed during conversion: {str(e)}")
        
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
        try:
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
        except Exception as e:
            logger.warning(f"Optional activity logging failed for lead conversion: {str(e)}")
        
        # Invalidate dashboard cache
        await invalidate_tenant_cache(str(tenant_id))
        
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
        
        seen_account_ids = set()
        
        # 1a. Search for accounts by company name
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
                
            for a in accounts:
                if str(a.id) not in seen_account_ids:
                    seen_account_ids.add(str(a.id))
                    suggestions["accounts"].append(
                        {"id": str(a.id), "name": a.name, "email": str(a.email) if a.email else None, "match_type": "company_name"}
                    )
        
        # 1b. Search for accounts by email (critical for person accounts with no company)
        if lead.email:
            accounts_by_email = await Account.find(
                Account.tenant_id == tenant_id,
                Account.email == lead.email,
                Account.deleted_at == None
            ).to_list()
            for a in accounts_by_email:
                if str(a.id) not in seen_account_ids:
                    seen_account_ids.add(str(a.id))
                    suggestions["accounts"].append(
                        {"id": str(a.id), "name": a.name, "email": str(a.email) if a.email else None, "match_type": "email"}
                    )
        
        # 1c. Search for accounts by phone
        lead_phones = [p for p in [lead.phone, lead.mobile] if p]
        if lead_phones:
            for phone in lead_phones:
                accounts_by_phone = await Account.find(
                    Account.tenant_id == tenant_id,
                    Account.phone == phone,
                    Account.deleted_at == None
                ).to_list()
                for a in accounts_by_phone:
                    if str(a.id) not in seen_account_ids:
                        seen_account_ids.add(str(a.id))
                        suggestions["accounts"].append(
                            {"id": str(a.id), "name": a.name, "email": str(a.email) if a.email else None, "match_type": "phone"}
                        )
        
        # 1d. Search for accounts by domain (for corporate leads)
        if lead.email:
            domain = self._extract_domain(lead.email)
            if domain:
                accounts_by_domain = await Account.find(
                    Account.tenant_id == tenant_id,
                    Account.is_person_account == False,
                    Account.deleted_at == None,
                    {
                        "$or": [
                            {"email": {"$regex": f"@{domain}$", "$options": "i"}},
                            {"website": {"$regex": domain, "$options": "i"}}
                        ]
                    }
                ).limit(5).to_list()
                
                for a in accounts_by_domain:
                    if str(a.id) not in seen_account_ids:
                        seen_account_ids.add(str(a.id))
                        suggestions["accounts"].append(
                            {"id": str(a.id), "name": a.name, "email": str(a.email) if a.email else None, "match_type": "domain"}
                        )
            
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
                    {"_id": {"$in": lead_ids}},
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

        # 2. Fetch Metadata in parallel (except sales stages which need special handling)
        import asyncio
        from app.models.opportunity_picklists import Experience, SalesStage
        
        # Fetch regular metadata in parallel
        metadata_tasks = [
            LeadStatus.find(LeadStatus.is_active == True).sort("+sorting").to_list(),
            Source.find(Source.tenant_id == tenant_id, Source.is_active == True).sort("+sorting").to_list(),
            User.find(User.tenant_id == tenant_id, User.is_active == True).sort("+name").to_list(),
            Industry.find(Industry.tenant_id == tenant_id, Industry.is_active == True).sort("+sorting").to_list(),
            Experience.find(Experience.tenant_id == tenant_id, Experience.is_active == True).sort("+sorting").to_list(),
        ]
        
        metadata_results = await asyncio.gather(*metadata_tasks)
        lead_statuses, sources, users, industries, experiences = metadata_results
        
        # Fetch both tenant-specific and global sales stages
        tenant_stages = await SalesStage.find(SalesStage.tenant_id == tenant_id, SalesStage.is_active == True).sort("+sorting").to_list()
        global_stages = await SalesStage.find(SalesStage.tenant_id == None, SalesStage.is_active == True).sort("+sorting").to_list()
        sales_stages = tenant_stages + global_stages

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
            "experiences": [
                {"id": str(e.id), "name": e.name}
                for e in experiences
            ],
            "sales_stages": [
                {"id": str(ss.id), "name": ss.name, "is_default": ss.is_default}
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
            {"_id": {"$in": ids}},
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
            {"_id": {"$in": ids}},
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

    async def _find_duplicate_account(
        self,
        name: str,
        email: Optional[str],
        phone: Optional[str],
        is_person_account: bool,
        tenant_id: ObjectId
    ) -> Optional[ObjectId]:
        """
        Find a duplicate account by email, phone, or name.
        Returns the existing account's ObjectId if found, None otherwise.
        This NEVER raises — it returns the duplicate for the caller to decide what to do.
        """
        from app.models.account import Account
        
        base_query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        # 1. Check by email (most reliable signal)
        if email:
            email_match = await Account.find_one({
                **base_query,
                "email": email.lower().strip()
            })
            if email_match:
                return email_match.id
        
        # 2. Check by phone
        if phone:
            phone_match = await Account.find_one({
                **base_query,
                "phone": phone.strip()
            })
            if phone_match:
                return phone_match.id
        
        # 3. For person accounts – check by exact name (DISABLED for safety)
        # We don't auto-reuse based on name alone because two people can have the same name.
        # We rely on email/phone for definitive matches.
        # if is_person_account and name:
        #     name_match = await Account.find_one({
        #         **base_query,
        #         "is_person_account": True,
        #         "name": {"$regex": f"^{name.strip()}$", "$options": "i"}
        #     })
        #     if name_match:
        #         return name_match.id
        
        return None

    async def _check_account_duplicates(self, account_data, tenant_id: ObjectId, is_update: bool = False):
        """
        Legacy method kept for compatibility.
        For lead conversion, use _find_duplicate_account instead (non-raising).
        Only used when explicitly validating account updates.
        """
        pass  # Soft-disabled: duplicate detection now handled gracefully in convert_lead

    async def _check_contact_duplicates(self, contact_data: Dict, tenant_id: ObjectId, is_update: bool = False):
        """Check for duplicate contacts and provide warnings/suggestions"""
        from app.models.contact import Contact
        
        # Build query for potential duplicates
        duplicate_query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        # Check by email (most reliable)
        if contact_data.get("email"):
            email_duplicates = await Contact.find({
                **duplicate_query,
                "email": contact_data["email"].lower().strip()
            }).to_list()
            
            # Exclude current contact if updating
            if is_update and "id" in contact_data:
                email_duplicates = [c for c in email_duplicates if str(c.id) != str(contact_data["id"])]
            
            if email_duplicates:
                duplicate_names = [f"{c.first_name} {c.last_name} (email: {c.email})" for c in email_duplicates[:3]]
                raise ValueError(
                    f"Potential duplicate contacts found with email {contact_data['email']}: "
                    f"{', '.join(duplicate_names)}. "
                    f"Please use existing contact or verify this is not a duplicate."
                )
        
        # Check by phone
        if contact_data.get("phone"):
            phone_duplicates = await Contact.find({
                **duplicate_query,
                "phone": contact_data["phone"].strip()
            }).to_list()
            
            if is_update and "id" in contact_data:
                phone_duplicates = [c for c in phone_duplicates if str(c.id) != str(contact_data["id"])]
            
            if phone_duplicates:
                duplicate_names = [f"{c.first_name} {c.last_name} (phone: {c.phone})" for c in phone_duplicates[:3]]
                raise ValueError(
                    f"Potential duplicate contacts found with phone {contact_data['phone']}: "
                    f"{', '.join(duplicate_names)}. "
                    f"Please use existing contact or verify this is not a duplicate."
                )
        
        # Check by name combination
        if contact_data.get("first_name") and contact_data.get("last_name"):
            name_duplicates = await Contact.find({
                **duplicate_query,
                "first_name": {"$regex": f"^{contact_data['first_name'].strip()}$", "$options": "i"},
                "last_name": {"$regex": f"^{contact_data['last_name'].strip()}$", "$options": "i"}
            }).to_list()
            
            if is_update and "id" in contact_data:
                name_duplicates = [c for c in name_duplicates if str(c.id) != str(contact_data["id"])]
            
            if name_duplicates:
                duplicate_names = [f"{c.first_name} {c.last_name}" for c in name_duplicates[:3]]
                raise ValueError(
                    f"Potential duplicate contacts found with name {contact_data['first_name']} {contact_data['last_name']}: "
                    f"{', '.join(duplicate_names)}. "
                    f"Please use existing contact or verify this is not a duplicate."
                )
