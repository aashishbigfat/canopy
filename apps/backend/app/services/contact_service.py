"""
Contact service layer - Business logic for Contact operations
"""
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime
from app.models.contact import Contact
from app.models.account_contact import AccountContact
from app.schemas.contact import ContactCreate, ContactUpdate
from app.mixins.activity_mixin import ActivityMixin

class ContactService(ActivityMixin):
    """Service for Contact business logic"""
    
    def __init__(self):
        super().__init__()
    
    async def create_contact(
        self,
        contact_data: ContactCreate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: list = None,
        account_ids: list = None
    ) -> Contact:
        """Create a new contact"""
        
        contact = Contact(
            **contact_data.model_dump(exclude_unset=True, exclude={'account_id'}),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        # Set primary account if provided
        if contact_data.account_id:
            contact.account_id = ObjectId(contact_data.account_id)
        
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
        
        # Link to accounts (many-to-many)
        if account_ids:
            for acc_id in account_ids:
                pivot = AccountContact(
                    account_id=ObjectId(acc_id),
                    contact_id=contact.id,
                    tenant_id=tenant_id
                )
                await pivot.insert()
        
        # Save custom fields
        if custom_fields:
            from app.models.custom_fields import ContactCustomField
            import json
            
            for field in custom_fields:
                custom_field = ContactCustomField(
                    contact_id=contact.id,
                    contact_additional_field_id=ObjectId(field['id']),
                    field_value=json.dumps(field['value']),
                    type=field.get('type', 'text'),
                    tenant_id=tenant_id
                )
                await custom_field.insert()
        
        # Track user view
        await self._track_user_view(user_id, contact.id, tenant_id)
        
        return contact
    
    async def get_contact(self, contact_id: str, tenant_id: ObjectId) -> Optional[Contact]:
        """Get contact by ID"""
        contact = await Contact.get(ObjectId(contact_id))
        
        if contact and contact.tenant_id == tenant_id and not contact.deleted_at:
            return contact
        return None

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
        
        # Get owner information
        owner = await User.get(contact.owner_id)
        
        # Get account name
        account_name = None
        if contact.account_id:
            account = await Account.get(contact.account_id)
            if account:
                account_name = account.name
        
        # Get related opportunities
        related_opportunities = []
        try:
            opportunities = await Opportunity.find(
                Opportunity.contact_id == contact.id,
                Opportunity.tenant_id == tenant_id,
                Opportunity.deleted_at == None
            ).to_list()
            
            for opp in opportunities:
                # Get stage name
                stage_name = None
                if opp.sales_stage_id:
                    from app.models.opportunity_picklists import SalesStage
                    stage = await SalesStage.get(opp.sales_stage_id)
                    if stage:
                        stage_name = stage.name
                
                related_opportunities.append({
                    "id": str(opp.id),
                    "name": opp.name,
                    "amount": opp.amount,
                    "sales_stage_id": str(opp.sales_stage_id) if opp.sales_stage_id else None,
                    "sales_stage_name": stage_name,
                    "close_date": opp.close_date.isoformat() if opp.close_date else None,
                    "probability": opp.probability,
                    "no_of_pax": opp.no_of_pax,
                    "no_of_nights": opp.no_of_nights,
                    "travel_date": opp.travel_date.isoformat() if opp.travel_date else None,
                    "created_at": opp.created_at.isoformat()
                })
        except Exception as e:
            print(f"Error loading opportunities for contact: {e}")
            
        # Get related tasks
        related_tasks = []
        try:
            tasks = await Task.find(
                Task.taskable_type == "Contact",
                Task.taskable_id == contact.id,
                Task.tenant_id == tenant_id,
                Task.deleted_at == None
            ).to_list()
            
            for task in tasks:
                assigned_user_name = None
                if task.assigned_user_id:
                    assigned_user = await User.get(task.assigned_user_id)
                    if assigned_user:
                        assigned_user_name = assigned_user.name
                
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
            print(f"Error loading tasks for contact: {e}")

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
            "created_by": str(contact.created_by),
            "last_modified_by_id": str(contact.last_modified_by_id) if contact.last_modified_by_id else None,
            "view_count": contact.view_count,
            "created_at": contact.created_at,
            "updated_at": contact.updated_at,
            "related_opportunities": related_opportunities,
            "related_tasks": related_tasks
        }
    
    async def update_contact(
        self,
        contact_id: str,
        contact_data: ContactUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Contact]:
        """Update a contact"""
        contact = await self.get_contact(contact_id, tenant_id)
        
        if not contact:
            return None
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        # Update fields
        update_data = contact_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            old_values[field] = getattr(contact, field, None)
            if field == 'account_id' and value:
                setattr(contact, field, ObjectId(value))
                updated_fields[field] = str(value)
            else:
                setattr(contact, field, value)
                updated_fields[field] = value
        
        contact.last_modified_by_id = user_id
        await contact.save()
        
        # Log update
        await self.log_entity_updated(
            entity=contact,
            entity_type="contact",
            old_values=old_values,
            updated_fields=updated_fields
        )
        
        return contact
    
    async def delete_contact(self, contact_id: str, tenant_id: ObjectId, user_id: ObjectId = None) -> bool:
        """Soft delete a contact"""
        contact = await self.get_contact(contact_id, tenant_id)
        
        if not contact:
            return False
        
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
        limit: int = 10
    ) -> tuple[List[Contact], int]:
        """Search contacts"""
        
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
    
    async def change_owner(
        self,
        contact_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Contact]:
        """Change contact owner"""
        contact = await self.get_contact(contact_id, tenant_id)
        
        if not contact:
            return None
        
        contact.owner_id = new_owner_id
        contact.last_modified_by_id = current_user_id
        await contact.save()
        
        # Send email notification
        from app.tasks.account_tasks import send_owner_change_email
        send_owner_change_email.delay(
            "Contact",
            str(new_owner_id),
            contact.full_name,
            "contactDetails",
            str(tenant_id),
            str(contact.id)
        )
        
        return contact
    
    async def link_to_account(
        self,
        contact_id: str,
        account_id: str,
        tenant_id: ObjectId
    ):
        """Link contact to an account"""
        # Check if already linked - using direct dict query to avoid field access issues
        existing = await AccountContact.find_one({
            "contact_id": ObjectId(contact_id),
            "account_id": ObjectId(account_id)
        })
        
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
        account_id: str
    ):
        """Unlink contact from an account"""
        pivot = await AccountContact.find_one(
            AccountContact.contact_id == ObjectId(contact_id),
            AccountContact.account_id == ObjectId(account_id)
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
        
        # Check if view exists - using direct dict query to avoid field access issues
        view = await UserContactView.find_one({
            "user_id": user_id,
            "contact_id": contact_id
        })
        
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
