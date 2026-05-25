"""
Lead service layer - Business logic for Lead operations
"""
from typing import List, Optional, Dict, Tuple
from bson import ObjectId
from datetime import datetime, timedelta
from app.models.lead import Lead
from app.models.destination import DestinationLead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadConvert
from app.schemas.lead import LeadConvert
from app.services.activity_log_service import ActivityLogService
from app.services.notification_service import NotificationService
from app.mixins.activity_mixin import ActivityMixin
from app.models.user import User
from app.models.lead_picklists import LeadStatus, Source
from app.models.picklists import Industry
from app.models.lead_custom_fields import UserLeadView
from app.core.cache import invalidate_tenant_cache
from app.repositories.lead_repository import LeadRepository
from app.services.webhook_service import webhook_service
from app.services import field_registry_service
from app.schemas.field_registry import CustomFieldValuePayload
from app.services.bd_assignment_service import bd_assignment_service
import logging as _logging

logger = _logging.getLogger(__name__)


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
            {"tenant_id": tenant_id, "is_active": True, "is_available_for_assignment": True}
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
            **lead_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            owner_id=owner_id,
            created_by=user_id
        )
        
        await lead.insert()

        # Auto-resolve BD triple (territory + BD owner + reporting manager).
        # Failure is non-fatal — lead still saves with triple unset.
        try:
            assignment = await bd_assignment_service.resolve_for_address(
                tenant_id=tenant_id,
                country=lead.country,
                state=lead.state,
                zip_code=lead.zip,
            )
            if not assignment.is_empty():
                lead.territory_id = assignment.territory_id
                lead.region_id = assignment.region_id
                lead.bd_owner_id = assignment.bd_owner_id
                lead.reporting_manager_id = assignment.reporting_manager_id
                lead.territory_match_source = assignment.match_source
                lead.territory_assigned_at = datetime.utcnow()
                await lead.save()
        except Exception:
            logger.warning("BD auto-assignment failed for lead %s", lead.id, exc_info=True)

        # Link destinations if provided in industry_data (travel only)
        industry_dest_ids = (lead.industry_data or {}).get('destination_ids', [])
        if industry_dest_ids:
            for dest_id in industry_dest_ids:
                pivot = DestinationLead(
                    lead_id=lead.id,
                    destination_id=ObjectId(dest_id),
                    tenant_id=tenant_id
                )
                await pivot.insert()
        
        # Save custom fields via unified registry (Phase 1 §A)
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
                "lead", lead.id, payloads, tenant_id,
            )
        
        # Activity logging
        await self.log_entity_created(
            entity=lead,
            entity_type="lead",
            additional_data={
                "created_fields": original_data,
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
        
        # Fire webhook event
        try:
            await webhook_service.trigger_event(
                event_type="lead.created",
                payload={
                    "lead_id": str(lead.id),
                    "name": lead.full_name,
                    "email": lead.email,
                    "phone": lead.phone,
                    "source": str(lead.source_id) if lead.source_id else None,
                    "industry_data": lead.industry_data,
                },
                tenant_id=str(tenant_id),
                entity_id=str(lead.id),
                entity_type="lead",
                triggered_by=str(user_id)
            )
        except Exception:
            pass  # Webhook failures should never block core operations

        # Phase 9: automation rule dispatch
        try:
            from app.services import automation_service
            await automation_service.dispatch("lead.created", lead, tenant_id)
        except Exception:
            logger.warning("Automation dispatch failed (lead.created)", exc_info=True)

        return lead
    async def get_lead(self, lead_id: str, tenant_id: ObjectId) -> Optional[Lead]:
        """Get lead by ID (allows soft-deleted/converted leads)"""
        # We allow converted leads here to avoid 404 errors in the UI after conversion
        try:
            return await Lead.find_one(
                {"_id": ObjectId(lead_id), "tenant_id": tenant_id}
            )
        except Exception:
            return None
    
    async def update_lead(
        self,
        lead_id: str,
        lead_data: LeadUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        user_name: str = None,
        custom_fields: list = None,
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

        # Track whether any address field changed — triggers BD re-resolution.
        ADDRESS_FIELDS = {"street", "city", "state", "zip", "country"}
        address_changed = False

        # Update fields and track changes
        update_data = lead_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            original_value = getattr(lead, field, None)
            original_values[field] = str(original_value) if original_value else None
            if field in ADDRESS_FIELDS and value != original_value:
                address_changed = True
            setattr(lead, field, value)
            updated_fields[field] = str(value) if value else None

        lead.last_modified_by_id = user_id
        await lead.save()

        # Re-resolve BD triple when address changes. Never blocks the save.
        if address_changed:
            try:
                prev_bd_owner = lead.bd_owner_id
                assignment = await bd_assignment_service.resolve_for_address(
                    tenant_id=tenant_id,
                    country=lead.country,
                    state=lead.state,
                    zip_code=lead.zip,
                )
                if not assignment.is_empty():
                    lead.territory_id = assignment.territory_id
                    lead.region_id = assignment.region_id
                    lead.bd_owner_id = assignment.bd_owner_id
                    lead.reporting_manager_id = assignment.reporting_manager_id
                    lead.territory_match_source = assignment.match_source
                    lead.territory_assigned_at = datetime.utcnow()
                    await lead.save()
                    if prev_bd_owner != assignment.bd_owner_id:
                        await self.log_assignment_changed(
                            entity=lead,
                            entity_type="lead",
                            old_assigned_to=str(prev_bd_owner) if prev_bd_owner else None,
                            new_assigned_to=str(assignment.bd_owner_id) if assignment.bd_owner_id else None,
                        )
            except Exception:
                logger.warning("BD re-assignment failed for lead %s", lead.id, exc_info=True)

        # Write custom field values via unified registry (Phase 1 §A)
        custom_field_changes = 0
        if custom_fields:
            payloads = [
                CustomFieldValuePayload(
                    additional_field_id=ObjectId(f["id"]),
                    field_value=str(f.get("value", "")),
                )
                for f in custom_fields if f.get("id") is not None
            ]
            custom_field_changes = await field_registry_service.write_custom_field_values(
                "lead", lead.id, payloads, tenant_id,
            )

        # 🚨 COMPREHENSIVE ACTIVITY LOGGING using ActivityMixin
        if updated_fields or custom_field_changes:
            await self.log_entity_updated(
                entity=lead,
                entity_type="lead",
                old_values=original_values,
                updated_fields={**updated_fields, "custom_fields_updated": custom_field_changes} if custom_field_changes else updated_fields,
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
        
        # Fire webhook event
        if updated_fields:
            try:
                await webhook_service.trigger_event(
                    event_type="lead.updated",
                    payload={
                        "lead_id": str(lead.id),
                        "name": lead.full_name,
                        "updated_fields": updated_fields,
                        "previous_values": original_values,
                    },
                    tenant_id=str(tenant_id),
                    entity_id=str(lead.id),
                    entity_type="lead",
                    triggered_by=str(user_id)
                )
            except Exception:
                pass

        # Phase 9: automation rule dispatch
        if updated_fields:
            try:
                from app.services import automation_service
                await automation_service.dispatch("lead.updated", lead, tenant_id)
            except Exception:
                logger.warning("Automation dispatch failed (lead.updated)", exc_info=True)

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
        
        # Fire webhook event
        try:
            await webhook_service.trigger_event(
                event_type="lead.deleted",
                payload=lead_info,
                tenant_id=str(tenant_id),
                entity_id=str(lead.id),
                entity_type="lead",
                triggered_by=str(user_id)
            )
        except Exception:
            pass
        
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
        limit: int = 10,
        visible_owner_ids: Optional[list] = None
    ) -> Tuple[List[Lead], int]:
        """Search leads scoped to visibility"""
        return await self.repository.search(
            tenant_id=tenant_id,
            query_text=query,
            lead_status_id=lead_status_id,
            skip=skip,
            limit=limit,
            visible_owner_ids=visible_owner_ids
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
                {"tenant_id": tenant_id, "name": account_name, "is_person_account": is_person_account, "deleted_at": None}
            )
            if account:
                return account.id
                
        # 2. Check email if provided
        if email:
            account = await Account.find_one(
                {"tenant_id": tenant_id, "email": email, "is_person_account": is_person_account, "deleted_at": None}
            )
            if account:
                return account.id
                
        # 3. Check phone as last resort
        if phone:
            account = await Account.find_one(
                {"tenant_id": tenant_id, "phone": phone, "is_person_account": is_person_account, "deleted_at": None}
            )
            if account:
                return account.id
        
        # 4. Check domain match (for corporate accounts)
        if not is_person_account and email:
            domain = self._extract_domain(email)
            if domain:
                # Search for accounts with same domain in website or email
                account = await Account.find_one(
                    {
                        "tenant_id": tenant_id,
                        "is_person_account": False,
                        "deleted_at": None,
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
        conversion_data,  # LeadConvert (unified for all industries)
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
                
            existing_account = await Account.find_one(
                {"_id": account_id, "tenant_id": tenant_id, "deleted_at": None}
            )
            if not existing_account:
                raise ValueError("Specified account not found")
            is_person_account = existing_account.is_person_account
        else:
            # Determine account name and type
            is_person_account = conversion_data.account_type == "Person Account"
            
            p_salutation = conversion_data.person_salutation if is_person_account else None
            p_first_name = conversion_data.person_first_name if is_person_account else None
            p_last_name = conversion_data.person_last_name if is_person_account else None
            
            # Fallback to lead explicit data if not provided via API
            if is_person_account and not p_first_name and not p_last_name:
                p_salutation = lead.salutation
                p_first_name = lead.first_name
                p_last_name = lead.last_name
                
            if is_person_account:
                # Intelligently construct name from parts for Person Account (Fallback)
                parts = [p for p in [p_salutation, p_first_name, p_last_name] if p]
                account_name = " ".join(parts).strip() if parts else f"{lead.first_name} {lead.last_name}".strip()
                # Override with explicit account_name if it was still sent
                if conversion_data.account_name:
                    account_name = conversion_data.account_name
            elif not lead.company and not conversion_data.account_name:
                is_person_account = True
                account_name = f"{lead.first_name} {lead.last_name}".strip()
                p_salutation = lead.salutation
                p_first_name = lead.first_name
                p_last_name = lead.last_name
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
                    segment=lead.segment,
                    salutation=p_salutation,
                    first_name=p_first_name,
                    last_name=p_last_name,
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
                
            # Verify contact exists and belongs to tenant — single scoped query
            existing_contact = await Contact.find_one(
                {"_id": contact_id, "tenant_id": tenant_id, "deleted_at": None}
            )
            if not existing_contact:
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
                    {"tenant_id": tenant_id, "email": lead.email, "deleted_at": None}
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
                # Use contact name from form (user may override lead name); fall back to lead data
                c_salutation = conversion_data.contact_salutation or lead.salutation
                c_first_name = conversion_data.contact_first_name or lead.first_name
                c_last_name = conversion_data.contact_last_name or lead.last_name

                contact = Contact(
                    salutation=c_salutation,
                    first_name=c_first_name,
                    middle_name=lead.middle_name,
                    last_name=c_last_name,
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
                    # Verify stage exists in THIS tenant (cross-tenant stage IDs
                    # would let a client pin opportunities to another tenant's
                    # pipeline stage definitions).
                    stage_exists = await SalesStage.find_one(
                        {"_id": sales_stage_id, "tenant_id": tenant_id}
                    )
                    if not stage_exists:
                        sales_stage_id = None  # Fall through to default lookup
                    else:
                        stage_probability = stage_exists.probability or 0
                except Exception:
                    sales_stage_id = None  # Fall through to default lookup
            
            if not sales_stage_id:
                # Try to find default stage for this tenant first
                default_stage = await SalesStage.find_one(
                    {"tenant_id": tenant_id, "is_default": True, "is_active": True}
                )
                if default_stage:
                    sales_stage_id = default_stage.id
                    stage_probability = default_stage.probability or 0

            if not sales_stage_id:
                # Try first tenant-specific active stage
                first_stage = await SalesStage.find_one(
                    {"tenant_id": tenant_id, "is_active": True}
                )
                if first_stage:
                    sales_stage_id = first_stage.id
                    stage_probability = first_stage.probability or 0

            if not sales_stage_id:
                # Fall back to global default (tenant_id == None)
                global_default = await SalesStage.find_one(
                    {"tenant_id": None, "is_default": True, "is_active": True}
                )
                if global_default:
                    sales_stage_id = global_default.id
                    stage_probability = global_default.probability or 0

            # FINAL FALLBACK: If still no sales stage found, try global active stage
            if not sales_stage_id:
                any_stage = await SalesStage.find_one(
                    {"tenant_id": None, "is_active": True}
                )
                if any_stage:
                    sales_stage_id = any_stage.id
                    stage_probability = any_stage.probability or 0
                else:
                    raise ValueError("No Sales Stages found for this tenant. Please configure Sales Stages first.")

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

            # ── Industry-aware opportunity creation ──────────────────────
            # The resolver raises if the tenant is missing — no silent fallback
            # to travel-shaped data. The per-industry strategy then handles
            # both the opportunity name and its industry_data block, so this
            # service code is industry-blind.
            from app.services.industry_service import get_tenant_industry
            from app.services.industry_strategies import get_opportunity_conversion_strategy

            industry = await get_tenant_industry(tenant_id)
            strategy = get_opportunity_conversion_strategy(industry)
            opp_industry_data = await strategy.build_opportunity_data(lead, conversion_data)
            opportunity_name = await strategy.build_opportunity_name(lead, conversion_data)

            opportunity = Opportunity(
                name=opportunity_name,
                amount=conversion_data.opportunity_amount,
                close_date=close_date,
                description=getattr(conversion_data, 'description', None),
                sales_stage_id=sales_stage_id,
                probability=stage_probability,
                account_id=account_id,
                contact_id=contact_id,
                opportunitable_type="Account" if not is_person_account else "PersonalAccount",
                opportunitable_id=account_id,
                lead_id=lead.id,
                segment=lead.segment,
                source_id=lead.source_id,
                source_medium_id=lead.source_medium_id,
                industry_data=opp_industry_data,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
            
            # Safe conversion for other optional IDs from conversion_data
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
            # Copy BD triple from the converting lead so the opportunity
            # inherits Territory / BD Owner / Reporting Manager.
            opportunity.territory_id = lead.territory_id
            opportunity.region_id = lead.region_id
            opportunity.bd_owner_id = lead.bd_owner_id
            opportunity.reporting_manager_id = lead.reporting_manager_id
            opportunity.territory_match_source = lead.territory_match_source
            opportunity.territory_assigned_at = lead.territory_assigned_at

            try:
                await opportunity.insert()
                opportunity_id = opportunity.id
            except Exception as e:
                logger.error(f"Error inserting opportunity during conversion: {str(e)}")
                raise ValueError(f"Failed to create opportunity: {str(e)}")

            # Copy lead custom fields to opportunity (Phase 1 §B)
            try:
                copied = await field_registry_service.copy_custom_field_values(
                    src_entity_type="lead",
                    src_entity_id=lead.id,
                    dst_entity_type="opportunity",
                    dst_entity_id=opportunity.id,
                    tenant_id=tenant_id,
                )
                if copied:
                    logger.info(f"Copied {copied} custom field values lead→opportunity")
            except Exception as e:
                logger.warning(f"Custom field copy lead→opportunity failed: {str(e)}")

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
                {"tenant_id": tenant_id, "name": lead.company, "deleted_at": None}
            ).to_list()

            if not accounts:
                # Fuzzy match
                accounts = await Account.find(
                    {"tenant_id": tenant_id, "deleted_at": None},
                    Account.name.regex(f"(?i){lead.company}")
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
                {"tenant_id": tenant_id, "email": lead.email, "deleted_at": None}
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
                    {"tenant_id": tenant_id, "phone": phone, "deleted_at": None}
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
                    {
                        "tenant_id": tenant_id,
                        "is_person_account": False,
                        "deleted_at": None,
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
                {"tenant_id": tenant_id, "email": lead.email, "deleted_at": None}
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
                {"tenant_id": tenant_id, "first_name": lead.first_name, "last_name": lead.last_name, "deleted_at": None}
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
        """Change lead owner.

        SECURITY: new_owner_id is validated against the lead's tenant BEFORE
        the save. Previously the lead was reassigned first and the owner was
        fetched unscoped afterwards — meaning a cross-tenant user id could
        be assigned as owner and only the response name would silently fail.
        """
        from app.models.user import User
        lead = await self.get_lead(lead_id, tenant_id)
        if not lead:
            return None

        owner = await User.find_one(
            {"_id": new_owner_id, "tenant_id": tenant_id, "deleted_at": None, "is_active": True}
        )
        if not owner:
            raise ValueError("new_owner_id must reference an active user in this tenant")

        previous_owner = str(lead.owner_id)
        new_owner = str(new_owner_id)

        lead.owner_id = new_owner_id
        lead.last_modified_by_id = current_user_id
        await lead.save()
        setattr(lead, 'owner_name', owner.name)

        # 🚨 COMPREHENSIVE ACTIVITY LOGGING using ActivityMixin
        await self.log_assignment_changed(
            entity=lead,
            entity_type="lead",
            old_assigned_to=previous_owner,
            new_assigned_to=new_owner
        )

        return lead
    
    
    async def reassign_bd(
        self,
        lead_id: str,
        tenant_id: ObjectId,
        current_user_id: ObjectId,
        bd_owner_id: Optional[ObjectId] = None,
        reporting_manager_id: Optional[ObjectId] = None,
        reason: Optional[str] = None,
    ) -> Optional[Lead]:
        """Manual override of the BD triple. Validates tenant membership."""
        lead = await self.get_lead(lead_id, tenant_id)
        if not lead:
            return None

        previous_bd = str(lead.bd_owner_id) if lead.bd_owner_id else None
        previous_manager = str(lead.reporting_manager_id) if lead.reporting_manager_id else None

        if bd_owner_id is not None:
            owner = await User.find_one(
                {"_id": bd_owner_id, "tenant_id": tenant_id, "is_active": True, "deleted_at": None}
            )
            if not owner:
                raise ValueError("bd_owner_id must reference an active user in this tenant")
            lead.bd_owner_id = bd_owner_id
            # If manager not explicitly set, recompute from hierarchy.
            if reporting_manager_id is None:
                lead.reporting_manager_id = await bd_assignment_service.resolve_manager_for_user(
                    tenant_id, bd_owner_id
                )

        if reporting_manager_id is not None:
            mgr = await User.find_one(
                {"_id": reporting_manager_id, "tenant_id": tenant_id, "is_active": True, "deleted_at": None}
            )
            if not mgr:
                raise ValueError("reporting_manager_id must reference an active user in this tenant")
            lead.reporting_manager_id = reporting_manager_id

        lead.territory_match_source = "manual"
        lead.territory_assigned_at = datetime.utcnow()
        lead.last_modified_by_id = current_user_id
        await lead.save()

        await self.log_custom_activity(
            action="bd_reassigned",
            entity_type="lead",
            entity=lead,
            description=f"BD reassigned (reason: {reason or 'manual override'})",
            changes={
                "bd_owner_id": {"old": previous_bd, "new": str(lead.bd_owner_id) if lead.bd_owner_id else None},
                "reporting_manager_id": {"old": previous_manager, "new": str(lead.reporting_manager_id) if lead.reporting_manager_id else None},
            },
        )
        return lead

    async def resolve_territory(
        self,
        lead_id: str,
        tenant_id: ObjectId,
        current_user_id: ObjectId,
    ) -> Optional[Lead]:
        """Re-run automatic territory + BD resolution for an existing lead."""
        lead = await self.get_lead(lead_id, tenant_id)
        if not lead:
            return None

        assignment = await bd_assignment_service.resolve_for_address(
            tenant_id=tenant_id,
            country=lead.country,
            state=lead.state,
            zip_code=lead.zip,
        )
        if assignment.is_empty():
            return lead

        lead.territory_id = assignment.territory_id
        lead.region_id = assignment.region_id
        lead.bd_owner_id = assignment.bd_owner_id
        lead.reporting_manager_id = assignment.reporting_manager_id
        lead.territory_match_source = assignment.match_source
        lead.territory_assigned_at = datetime.utcnow()
        lead.last_modified_by_id = current_user_id
        await lead.save()
        return lead

    async def get_leads_with_metadata(
        self,
        tenant_id: ObjectId,
        page: int = 1,
        per_page: int = 10,
        owner_id: Optional[str] = None,
        is_converted: Optional[bool] = None,
        view: Optional[str] = None,
        current_user_id: Optional[ObjectId] = None,
        visible_owner_ids: Optional[list] = None
    ) -> Dict:
        """Get leads with metadata (statuses, sources, users, etc.)"""
        
        # 1. Build base query / special view queries
        base_filter: dict = {"tenant_id": tenant_id, "deleted_at": None}

        # Handle explicit owner filter + visibility scoping securely
        if owner_id:
            requested_oid = ObjectId(owner_id)
            if visible_owner_ids is not None and requested_oid not in visible_owner_ids:
                # User requested records they aren't allowed to see -> force empty response
                return {
                    "leads": [],
                    "pagination": {"current_page": page, "total": 0, "per_page": per_page, "pages": 0},
                    "lead_statuses": [],
                    "sources": [],
                    "users": [],
                    "industries": [],
                    "experiences": [],
                    "sales_stages": []
                }
            base_filter["owner_id"] = requested_oid
        elif visible_owner_ids is not None:
            # Apply hierarchy-based visibility scoping natively
            base_filter["owner_id"] = {"$in": visible_owner_ids}

        if is_converted is not None:
            base_filter["is_converted"] = is_converted

        all_leads: List[Lead] = []

        # Date-based views
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        tomorrow_start = today_start + timedelta(days=1)
        yesterday_start = today_start - timedelta(days=1)
        last_week_start = today_start - timedelta(days=7)

        if view in ("today", "todays_lead", "todays"):
            base_filter["created_at"] = {"$gte": today_start, "$lt": tomorrow_start}
        elif view == "yesterday":
            base_filter["created_at"] = {"$gte": yesterday_start, "$lt": today_start}
        elif view == "last_week":
            base_filter["created_at"] = {"$gte": last_week_start, "$lt": tomorrow_start}

        # Recently viewed: use UserLeadView ordering
        if view in ("recent", "recently_viewed") and current_user_id:
            recent_views = await UserLeadView.find(
                {"user_id": current_user_id, "tenant_id": tenant_id}
            ).sort("-updated_at").limit(200).to_list()
            
            lead_ids = [rv.lead_id for rv in recent_views]
            if lead_ids:
                recent_filter: dict = {"_id": {"$in": lead_ids}, "tenant_id": tenant_id, "deleted_at": None}
                # Apply visibility to recent view too
                if visible_owner_ids is not None:
                    recent_filter["owner_id"] = {"$in": visible_owner_ids}

                leads = await Lead.find(recent_filter).to_list()
                lead_map = {l.id: l for l in leads}
                all_leads = [lead_map[lid] for lid in lead_ids if lid in lead_map]
            else:
                all_leads = []
        else:
            # Sort by created_at desc for all other views
            all_leads = await Lead.find(base_filter).sort("-created_at").to_list()

        # Paginate
        total = len(all_leads)
        skip = (page - 1) * per_page
        leads = all_leads[skip : skip + per_page]
        pages = (total + per_page - 1) // per_page if per_page > 0 else 0

        # 2. Fetch Metadata in parallel (except sales stages which need special handling)
        import asyncio
        from app.models.opportunity_picklists import Experience, SalesStage
        from app.models.lead_picklists import SourceMedium
        from app.core.picklist_query import build_picklist_query
        from app.models.tenant import Tenant
        
        # Resolve tenant industry for picklist scoping
        tenant = await Tenant.get(tenant_id)
        tenant_industry = tenant.industry if tenant else None
        
        # Fetch regular metadata in parallel (platform defaults + tenant overrides)
        # Each query uses picklist_type to avoid cross-contamination in shared collection
        metadata_tasks = [
            LeadStatus.find(build_picklist_query(tenant_id, industry=tenant_industry, picklist_type="lead_status")).sort("+sorting").to_list(),
            Source.find(build_picklist_query(tenant_id, industry=tenant_industry, picklist_type="source")).sort("+sorting").to_list(),
            User.find({"tenant_id": tenant_id, "is_active": True}).sort("+name").to_list(),
            Industry.find(build_picklist_query(tenant_id, industry=tenant_industry, picklist_type="industry")).sort("+sorting").to_list(),
            Experience.find(build_picklist_query(tenant_id, industry=tenant_industry, picklist_type="experience")).sort("+sorting").to_list(),
            SourceMedium.find(build_picklist_query(tenant_id, industry=tenant_industry, picklist_type="source_medium")).sort("+sorting").to_list(),
        ]
        
        metadata_results = await asyncio.gather(*metadata_tasks)
        lead_statuses, sources, users, industries, experiences, source_mediums = metadata_results
        
        # Tenant items shadow platform defaults with the same name
        from app.core.picklist_query import dedup_picklist_items
        lead_statuses = dedup_picklist_items(lead_statuses)
        sources = dedup_picklist_items(sources)
        industries = dedup_picklist_items(industries)
        experiences = dedup_picklist_items(experiences)
        source_mediums = dedup_picklist_items(source_mediums)
        
        # All stages are now tenant-specific — simple direct query
        sales_stages = await SalesStage.find(
            {"tenant_id": tenant_id, "is_active": True, "picklist_type": "sales_stage"}
        ).sort("+sorting").to_list()

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
            "source_mediums": [
                {"id": str(sm.id), "name": sm.name}
                for sm in source_mediums
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
            {"_id": {"$in": ids}, "tenant_id": tenant_id, "deleted_at": None}
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
            {"_id": {"$in": ids}, "tenant_id": tenant_id, "deleted_at": None}
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
    # NOTE: A second `change_owner` definition used to live here and silently
    # overrode the canonical one above via Python's method-resolution order,
    # losing the tenant-validation + activity-logging in the process.
    # It has been deleted; the only `change_owner` for Lead is the secure one
    # earlier in this class.
