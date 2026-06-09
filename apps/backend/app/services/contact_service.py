"""
Contact service layer - Business logic for Contact operations
"""
import logging
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime
from app.models.contact import Contact
from app.models.account import Account
from app.models.account_contact import AccountContact
from app.schemas.contact import ContactCreate, ContactUpdate
from app.mixins.activity_mixin import ActivityMixin
from app.services.notification_service import NotificationService
from app.services import field_registry_service
from app.schemas.field_registry import CustomFieldValuePayload
import json


_logger = logging.getLogger(__name__)

class ContactService(ActivityMixin):
    """Service for Contact business logic"""
    
    PUBLIC_DOMAINS = {
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", 
        "aol.com", "live.com", "msn.com", "me.com", "mac.com"
    }

    def __init__(self):
        super().__init__()
        self.notification_service = NotificationService()

    def _extract_domain(self, email: str) -> Optional[str]:
        if not email or "@" not in email:
            return None
        return email.split("@")[1].lower()

    async def _get_or_create_account_by_domain(
        self, 
        domain: str, 
        contact: Contact,
        user_id: ObjectId, 
        tenant_id: ObjectId
    ) -> ObjectId:
        from app.models.account import Account
        
        # 1. Search for existing account by domain in website
        account = await Account.find_one({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "website": {"$regex": domain, "$options": "i"}
        })
        
        if account:
            return account.id
            
        # 2. If not found, create one
        is_public = domain in self.PUBLIC_DOMAINS
        
        if is_public:
            # Create a Person Account for public domains
            account_name = f"{contact.first_name} {contact.last_name}"
            account = Account(
                name=account_name,
                is_person_account=True,
                first_name=contact.first_name,
                last_name=contact.last_name,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
        else:
            # Create a Company Account for business domains
            account_name = domain.split('.')[0].capitalize()
            account = Account(
                name=account_name,
                website=f"https://{domain}",
                is_person_account=False,
                tenant_id=tenant_id,
                owner_id=user_id,
                created_by=user_id
            )
            
        await account.insert()
        return account.id
    
    async def create_contact(
        self,
        contact_data: ContactCreate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: list = None,
        account_ids: list = None
    ) -> Contact:
        """Create a new contact"""
        
        data = contact_data.model_dump(exclude_unset=True, exclude={'account_id'})
        data.pop("owner_id", None)
        
        data["tenant_id"] = tenant_id
        data["owner_id"] = user_id
        data["created_by"] = user_id
        
        contact = Contact(**data)
        
        # Set primary account if provided
        if contact_data.account_id:
            contact.account_id = ObjectId(contact_data.account_id)

        from app.core.entity_required_fields import validate_contact_record
        validate_contact_record(contact)
        
        await contact.insert()
        
        # Log contact creation
        await self.log_entity_created(
            entity=contact,
            entity_type="contact",
            additional_data={
                "first_name": contact.first_name,
                "last_name": contact.last_name,
                "email": contact.email,
                "phone": contact.phone,
                "title": contact.title
            }
        )
        
        # Create notification for contact creation
        await self.notification_service.notify_user(
            user_id=user_id,
            tenant_id=tenant_id,
            title="New Contact Created",
            message=f"Contact '{contact.full_name}' has been created",
            type="contact",
            entity_type="contact",
            entity_id=contact.id,
            action_url=f"/contacts/{contact.id}"
        )
        
        # Link to accounts (many-to-many)
        if account_ids:
            for acc_id in account_ids:
                pivot = AccountContact(
                    account_id=ObjectId(acc_id),
                    contact_id=contact.id,
                    tenant_id=tenant_id
                )
                await pivot.insert()
                
        # Handle primary account linkage if not present in account_ids
        if contact_data.account_id and not (account_ids and contact_data.account_id in [str(a) for a in account_ids]):
            exist_pivot = await AccountContact.find_one(
                {"contact_id": contact.id, "account_id": ObjectId(contact_data.account_id), "tenant_id": tenant_id}
            )
            if not exist_pivot:
                pivot = AccountContact(
                    account_id=ObjectId(contact_data.account_id),
                    contact_id=contact.id,
                    tenant_id=tenant_id
                )
                await pivot.insert()
        
        # Save custom fields via unified registry (Phase 1 §A — also fixes wrong-import bug)
        if custom_fields:
            payloads = [
                CustomFieldValuePayload(
                    additional_field_id=ObjectId(f["id"]),
                    field_value=json.dumps(f["value"]) if not isinstance(f.get("value"), str) else f["value"],
                )
                for f in custom_fields if f.get("id") is not None
            ]
            await field_registry_service.write_custom_field_values(
                "contact", contact.id, payloads, tenant_id,
            )
        
        # Track user view
        await self._track_user_view(user_id, contact.id, tenant_id)
        
        return contact
    
    async def get_contact(self, contact_id: str, tenant_id: ObjectId) -> Optional[Contact]:
        """Get contact by ID, scoped to tenant."""
        try:
            oid = ObjectId(contact_id)
        except Exception:
            return None
        return await Contact.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )

    async def get_contact_with_relations(
        self,
        contact_id: str,
        tenant_id: ObjectId
    ) -> Optional[Dict]:
        """Get contact with all related records for detail view"""
        contact = await self.get_contact(contact_id, tenant_id)
        
        if not contact:
            return None
        
        from app.models.user import User
        from app.models.account import Account
        from app.models.opportunity import Opportunity
        from app.models.task import Task
        
        # Bulk tenant-scoped lookups — no cross-tenant user/account leakage even
        # if stale reference IDs exist.
        ref_user_ids = {contact.owner_id, contact.created_by}
        if contact.last_modified_by_id:
            ref_user_ids.add(contact.last_modified_by_id)
        ref_users = await User.find(
            {"_id": {"$in": list(ref_user_ids)}, "tenant_id": tenant_id, "deleted_at": None}
        ).to_list()
        ref_users_map = {u.id: u for u in ref_users}
        owner = ref_users_map.get(contact.owner_id)
        creator = ref_users_map.get(contact.created_by)
        modifier = ref_users_map.get(contact.last_modified_by_id) if contact.last_modified_by_id else None

        # Get account name — scoped to tenant
        account_name = None
        if contact.account_id:
            account = await Account.find_one(
                {"_id": contact.account_id, "tenant_id": tenant_id, "deleted_at": None}
            )
            if account:
                account_name = account.name
        
        # Get related opportunities
        related_opportunities = []
        try:
            opportunities = await Opportunity.find(
                {"contact_id": contact.id, "tenant_id": tenant_id, "deleted_at": None}
            ).to_list()
            
            # --- N+1 OPTIMIZATION: Bulk fetch SalesStages ---
            from app.models.opportunity_picklists import SalesStage
            stage_ids = list({opp.sales_stage_id for opp in opportunities if opp.sales_stage_id})
            stages_map = {}
            if stage_ids:
                stages = await SalesStage.find(
                    {"_id": {"$in": stage_ids}, "tenant_id": tenant_id}
                ).to_list()
                stages_map = {str(stage.id): stage.name for stage in stages}
            # ------------------------------------------------
            
            for opp in opportunities:
                stage_name = stages_map.get(str(opp.sales_stage_id)) if opp.sales_stage_id else None
                ind = opp.industry_data or {}
                
                related_opportunities.append({
                    "id": str(opp.id),
                    "name": opp.name,
                    "amount": opp.amount,
                    "sales_stage_id": str(opp.sales_stage_id) if opp.sales_stage_id else None,
                    "sales_stage_name": stage_name,
                    "close_date": opp.close_date.isoformat() if opp.close_date else None,
                    "probability": opp.probability,
                    "no_of_pax": ind.get('no_of_pax'),
                    "no_of_nights": ind.get('no_of_nights'),
                    "travel_date": ind.get('travel_date'),
                    "created_at": opp.created_at.isoformat()
                })
        except Exception as e:
            _logger.warning("Error loading opportunities for contact %s: %s", contact.id, e)
            
        # Get related tasks
        related_tasks = []
        try:
            tasks = await Task.find(
                {"taskable_type": "Contact", "taskable_id": contact.id, "tenant_id": tenant_id, "deleted_at": None}
            ).to_list()
            
            # --- N+1 OPTIMIZATION: Bulk fetch assigned Users ---
            user_ids = list({task.assigned_user_id for task in tasks if task.assigned_user_id})
            users_map = {}
            if user_ids:
                from app.core.tenant_scope import fetch_in_tenant
                users = await fetch_in_tenant(User, tenant_id, user_ids)
                users_map = {str(u.id): u.name for u in users}
            # ---------------------------------------------------
            
            for task in tasks:
                assigned_user_name = users_map.get(str(task.assigned_user_id)) if task.assigned_user_id else None
                
                related_tasks.append({
                    "id": str(task.id),
                    "subject": task.name,
                    "status": task.status,
                    "priority": task.priority,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "assigned_to": str(task.assigned_user_id) if task.assigned_user_id else None,
                    "assigned_user_name": assigned_user_name,
                    "created_at": task.created_at.isoformat()
                })
        except Exception as e:
            _logger.warning("Error loading tasks for contact %s: %s", contact.id, e)

        return {
            "id": str(contact.id),
            "salutation": contact.salutation,
            "first_name": contact.first_name,
            "middle_name": contact.middle_name,
            "last_name": contact.last_name,
            "full_name": contact.full_name,
            "email": contact.email,
            "phone": contact.phone,
            "mobile": contact.mobile,
            "fax": contact.fax,
            "title": contact.title,
            "department": contact.department,
            "mailing_street": contact.mailing_street,
            "mailing_city": contact.mailing_city,
            "mailing_state": contact.mailing_state,
            "mailing_zip": contact.mailing_zip,
            "mailing_country": contact.mailing_country,
            "other_street": contact.other_street,
            "other_city": contact.other_city,
            "other_state": contact.other_state,
            "other_zip": contact.other_zip,
            "other_country": contact.other_country,
            "description": contact.description,
            "assistant": contact.assistant,
            "assistant_phone": contact.assistant_phone,
            "account_id": str(contact.account_id) if contact.account_id else None,
            "account_name": account_name,
            "tenant_id": str(contact.tenant_id),
            "owner_id": str(contact.owner_id),
            "owner_name": owner.name if owner else None,
            "owner_email": owner.email if owner else None,
            "created_by_name": creator.name if creator else None,
            "last_modified_by_name": modifier.name if modifier else None,
            "created_by": str(contact.created_by),
            "last_modified_by_id": str(contact.last_modified_by_id) if contact.last_modified_by_id else None,
            "view_count": contact.view_count,
            "created_at": contact.created_at,
            "updated_at": contact.updated_at,
            "related_opportunities": related_opportunities,
            "related_tasks": related_tasks,
            "industry_data": getattr(contact, "industry_data", {})
        }
    
    async def update_contact(
        self,
        contact_id: str,
        contact_data: ContactUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: list = None,
    ) -> Optional[Contact]:
        """Update a contact"""
        from fastapi import HTTPException
        contact = await self.get_contact(contact_id, tenant_id)
        
        if not contact:
            return None
        
        update_data = contact_data.model_dump(exclude_unset=True)

        # --- Tier 1 & 3: Email uniqueness check + Auto-account discovery ---
        new_email = update_data.get("email")
        if new_email is None:
            new_email = contact.email
            
        raw_new_account = update_data.get("account_id")
        
        if "email" in update_data and new_email != contact.email:
            # Uniqueness check
            duplicate = await Contact.find_one({
                "email": new_email,
                "tenant_id": tenant_id,
                "deleted_at": None,
                "_id": {"$ne": contact.id}
            })
            if duplicate:
                raise HTTPException(
                    status_code=400,
                    detail=f"Email '{new_email}' is already used by another contact: {duplicate.full_name}"
                )
        
        # Determine if we should forcefully auto-create/find account
        # If the frontend cleared the account_id ("") it means they typed an email domain that doesn't exist
        # in their current account dropdown, so they are relying on the backend to create it.
        new_domain = self._extract_domain(new_email) if new_email else None
        
        force_auto_create = "account_id" in update_data and raw_new_account == ""
        
        str_new_account = str(raw_new_account) if raw_new_account else ""
        str_old_account = str(contact.account_id) if contact.account_id else ""
        explicit_valid_account_change = "account_id" in update_data and str_new_account != "" and str_new_account != str_old_account
        
        # We auto-discover/create if:
        # 1. We have a valid new domain.
        # AND
        # 2. The frontend forcefully cleared the account_id (`force_auto_create`)
        # OR 3. The email changed AND the user didn't explicitly pick a completely new valid account in the dropdown.
        if new_domain and (force_auto_create or ("email" in update_data and new_email != contact.email and not explicit_valid_account_change)):
            new_account_id_from_email = await self._get_or_create_account_by_domain(
                new_domain, contact, user_id, tenant_id
            )
            update_data["account_id"] = str(new_account_id_from_email)



        # --- Tier 2: Account pivot sync + Opportunity migration ---
        if "account_id" in update_data:
            raw_new_account = update_data.get("account_id")
            new_account_id = ObjectId(raw_new_account) if raw_new_account else None
            old_account_id = contact.account_id

            if old_account_id != new_account_id:
                # Remove old pivot row
                if old_account_id:
                    old_pivot = await AccountContact.find_one(
                        {"contact_id": contact.id, "account_id": old_account_id, "tenant_id": tenant_id}
                    )
                    if old_pivot:
                        await old_pivot.delete()

                # Insert new pivot row
                if new_account_id:
                    exists = await AccountContact.find_one(
                        {"contact_id": contact.id, "account_id": new_account_id, "tenant_id": tenant_id}
                    )
                    if not exists:
                        await AccountContact(
                            contact_id=contact.id,
                            account_id=new_account_id,
                            tenant_id=tenant_id
                        ).insert()
                
                # REASSIGN OPPORTUNITIES
                if new_account_id:
                    from app.models.opportunity import Opportunity
                    from app.models.account import Account as AccountModel

                    # Verify the new account is in this tenant before
                    # reassigning opportunities to it — otherwise a forged
                    # account_id could leak this contact's opportunities into
                    # another tenant's account.
                    new_account_obj = await AccountModel.find_one(
                        {"_id": new_account_id, "tenant_id": tenant_id, "deleted_at": None}
                    )
                    if not new_account_obj:
                        raise ValueError(
                            "new_account_id does not reference an account in this tenant"
                        )
                    new_opp_type = "PersonalAccount" if new_account_obj.is_person_account else "Account"

                    # Tenant-scoped opportunity lookup too
                    opportunities = await Opportunity.find(
                        {"contact_id": contact.id, "tenant_id": tenant_id, "deleted_at": None}
                    ).to_list()

                    for opp in opportunities:
                        opp.account_id = new_account_id
                        if opp.opportunitable_type in ["Account", "PersonalAccount"]:
                            opp.opportunitable_id = new_account_id
                            opp.opportunitable_type = new_opp_type

                        await opp.save()

        # Track changes
        old_values = {}
        updated_fields = {}

        for field, value in update_data.items():
            old_values[field] = getattr(contact, field, None)
            
            if field == 'account_id':
                if value:
                    setattr(contact, field, ObjectId(value))
                    updated_fields[field] = str(value)
                else:
                    setattr(contact, field, None)
                    updated_fields[field] = None
            else:
                setattr(contact, field, value)
                updated_fields[field] = value

        contact.last_modified_by_id = user_id

        from app.core.entity_required_fields import validate_contact_record
        validate_contact_record(contact)

        await contact.save()

        # Custom fields write (Phase 1 §A)
        if custom_fields:
            payloads = [
                CustomFieldValuePayload(
                    additional_field_id=ObjectId(f["id"]),
                    field_value=json.dumps(f["value"]) if not isinstance(f.get("value"), str) else f["value"],
                )
                for f in custom_fields if f.get("id") is not None
            ]
            n = await field_registry_service.write_custom_field_values(
                "contact", contact.id, payloads, tenant_id,
            )
            if n:
                updated_fields["custom_fields_updated"] = n

        # Log update
        await self.log_entity_updated(
            entity=contact,
            entity_type="contact",
            old_values=old_values,
            updated_fields=updated_fields
        )

        return contact
    
    async def delete_contact(self, contact_id: str, tenant_id: ObjectId, user_id: ObjectId = None) -> bool:
        """Soft delete a contact with hierarchy checks"""
        from fastapi import HTTPException
        from app.models.opportunity import Opportunity
        
        contact = await self.get_contact(contact_id, tenant_id)
        
        if not contact:
            return False
        
        # Check hierarchy constraints: Can't delete if active opportunities exist
        active_opps_count = await Opportunity.find(
            {"contact_id": contact.id, "tenant_id": tenant_id, "deleted_at": None}
        ).count()
        
        if active_opps_count > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete contact with associated opportunities. Please delete the opportunities first."
            )
        
        await contact.soft_delete()
        
        # Log deletion
        await self.log_entity_deleted(
            entity=contact,
            entity_type="contact",
            additional_data={
                "first_name": contact.first_name,
                "last_name": contact.last_name,
                "email": contact.email,
                "phone": contact.phone
            }
        )
        
        return True
    
    async def get_contacts_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10,
        owner_id: Optional[ObjectId] = None
    ) -> tuple[List[Contact], int]:
        """Get contacts for a tenant with pagination"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if owner_id:
            query["owner_id"] = owner_id
        
        # Get total count
        total = await Contact.find(query).count()
        
        # Get paginated results
        contacts = await Contact.find(query)\
            .sort("-created_at")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return contacts, total
    
    async def search_contacts(
        self,
        query: Optional[str],
        tenant_id: ObjectId,
        account_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 10,
        visible_owner_ids: Optional[list] = None
    ) -> tuple[List[Contact], int]:
        """Search contacts scoped by visibility"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if visible_owner_ids is not None:
            search_query["owner_id"] = {"$in": visible_owner_ids}
        
        # Text search
        if query:
            search_query["$or"] = [
                {"first_name": {"$regex": query, "$options": "i"}},
                {"last_name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"phone": {"$regex": query, "$options": "i"}}
            ]
        
        # Filter by account
        if account_id:
            search_query["account_id"] = ObjectId(account_id)
        
        # Get total count
        total = await Contact.find(search_query).count()
        
        # Get results
        contacts = await Contact.find(search_query)\
            .sort("-created_at")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return contacts, total
    
    async def link_to_account(
        self,
        contact_id: str,
        account_id: str,
        tenant_id: ObjectId
    ):
        """Link contact to an account"""
        
        # Verify both entities exist and belong to the current tenant
        contact = await Contact.find_one(
            Contact.id == ObjectId(contact_id),
            Contact.tenant_id == tenant_id
        )
        if not contact:
            raise ValueError("Contact not found or access denied")
            
        account = await Account.find_one(
            Account.id == ObjectId(account_id),
            Account.tenant_id == tenant_id
        )
        if not account:
            raise ValueError("Account not found or access denied")
            
        # Check if already linked using ODM syntax
        existing = await AccountContact.find_one(
            {"contact_id": ObjectId(contact_id), "account_id": ObjectId(account_id), "tenant_id": tenant_id}
        )
        
        if not existing:
            pivot = AccountContact(
                contact_id=ObjectId(contact_id),
                account_id=ObjectId(account_id),
                tenant_id=tenant_id
            )
            await pivot.insert()
    
    async def unlink_from_account(
        self,
        contact_id: str,
        account_id: str,
        tenant_id: ObjectId
    ):
        """Unlink contact from an account"""
        pivot = await AccountContact.find_one(
            AccountContact.contact_id == ObjectId(contact_id),
            AccountContact.account_id == ObjectId(account_id),
            AccountContact.tenant_id == tenant_id
        )
        
        if pivot:
            await pivot.delete()
    
    async def _track_user_view(
        self,
        user_id: ObjectId,
        contact_id: ObjectId,
        tenant_id: ObjectId
    ):
        """Track that a user viewed a contact"""
        from app.models.user_contact_view import UserContactView
        
        # Check if view exists using ODM syntax
        view = await UserContactView.find_one(
            {"user_id": user_id, "contact_id": contact_id, "tenant_id": tenant_id}
        )
        
        if view:
            view.view_count += 1
            view.updated_at = datetime.utcnow()
            await view.save()
        else:
            view = UserContactView(
                user_id=user_id,
                contact_id=contact_id,
                tenant_id=tenant_id,
                view_count=1
            )
            await view.insert()

    async def change_owner(
        self,
        contact_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId,
    ) -> Optional[Contact]:
        """Change contact owner.

        SECURITY: new_owner_id must belong to the same tenant — otherwise an
        attacker could shift a record outside the visible scope of this tenant
        or attach it to a foreign user.
        """
        from app.models.user import User

        contact = await self.get_contact(contact_id, tenant_id)
        if not contact:
            return None

        owner = await User.find_one(
            {"_id": new_owner_id, "tenant_id": tenant_id, "deleted_at": None, "is_active": True}
        )
        if not owner:
            raise ValueError("new_owner_id must reference an active user in this tenant")

        contact.owner_id = new_owner_id
        contact.last_modified_by_id = current_user_id
        await contact.save()

        # Stash the owner name as a transient attribute so contact_to_response can
        # surface it. Pydantic's __setattr__ rejects undeclared fields, so write
        # straight to __dict__; model_dump()/save() ignore it (never hits the DB).
        object.__setattr__(contact, "owner_name", owner.name)

        try:
            from app.tasks.account_tasks import send_owner_change_email
            send_owner_change_email.delay(
                "Contact",
                str(new_owner_id),
                contact.full_name,
                "contactDetails",
                str(tenant_id),
                str(contact.id),
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Failed to dispatch Celery task: %s", e)

        return contact
