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
