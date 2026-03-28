"""
Account service layer - Business logic for Account operations
"""
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from app.models.account import Account
from app.models.user import User
from app.schemas.account import AccountCreate, AccountUpdate, AccountSearch
from app.mixins.activity_mixin import ActivityMixin
from app.services.notification_service import NotificationService
import json

class AccountService(ActivityMixin):
    """Service for Account business logic"""
    
    def __init__(self):
        super().__init__()
        self.notification_service = NotificationService()
    
    async def create_account(
        self,
        account_data: AccountCreate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: Optional[List[Dict[str, Any]]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Account:
        """Create a new account with custom fields and attachments"""
        
        data = account_data.model_dump(exclude_unset=True)
        # Always default owner_id to current user upon creation, ignore payload
        data.pop("owner_id", None)
        
        # Inject overrides directly to prevent multiple kwargs errors during unpacking
        data["tenant_id"] = tenant_id
        data["owner_id"] = user_id
        data["created_by"] = user_id
            
        account = Account(**data)
        
        await account.insert()
        
        # Log account creation
        await self.log_entity_created(
            entity=account,
            entity_type="account",
            additional_data={
                "name": account.name,
                "industry_id": str(account.industry_id) if account.industry_id else None,
                "website": account.website,
                "email": account.email
            }
        )
        
        # Create notification for account creation
        await self.notification_service.notify_user(
            user_id=user_id,
            tenant_id=tenant_id,
            title="New Account Created",
            message=f"Account '{account.name}' has been created",
            type="account",
            entity_type="account",
            entity_id=account.id,
            action_url=f"/accounts/{account.id}"
        )
        
        # Save custom fields
        if custom_fields:
            from app.models.custom_fields import AccountCustomField
            import json
            
            for field in custom_fields:
                custom_field = AccountCustomField(
                    account_id=account.id,
                    account_additional_field_id=ObjectId(field['id']),
                    field_value=json.dumps(field['value']),
                    type=field.get('type', 'text'),
                    tenant_id=tenant_id
                )
                await custom_field.insert()
        
        # Save attachments
        if attachments:
            from app.models.module_attachment import ModuleAttachment
            
            for attach in attachments:
                attachment = ModuleAttachment(
                    module="Account",
                    module_id=account.id,
                    file_name=attach['file_name'],
                    file_extension=attach['file_extension'],
                    file_size=attach['file_size'],
                    s3_bucket=attach.get('s3_bucket'),
                    s3_key=attach.get('s3_key'),
                    s3_url=attach.get('s3_url'),
                    tenant_id=tenant_id,
                    uploaded_by=user_id
                )
                await attachment.insert()
        
        # Dispatch background jobs
        try:
            from app.tasks.account_tasks import track_user_view, add_record_id
            track_user_view.delay(str(user_id), str(account.id), str(tenant_id))
            add_record_id.delay("Account", str(account.id))
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Failed to dispatch Celery tasks: %s", e)
        
        # Track user view
        await self._track_user_view(user_id, account.id, tenant_id)
        
        return account
    
    async def get_account(self, account_id: str, tenant_id: ObjectId) -> Optional[Account]:
        """Get account by ID"""
        account = await Account.get(ObjectId(account_id))
        
        if account and account.tenant_id == tenant_id and not account.deleted_at:
            return account
        return None
    
    async def get_account_with_relations(
        self,
        account_id: str,
        tenant_id: ObjectId
    ) -> Optional[Dict]:
        """Get account with all related records for detail view"""
        account = await self.get_account(account_id, tenant_id)
        
        if not account:
            return None
        
        # Get owner information
        owner = await User.get(account.owner_id)
        
        # Get creator and modifier information
        creator = await User.get(account.created_by)
        modifier = await User.get(account.last_modified_by_id) if account.last_modified_by_id else None
        
        # Get related contacts
        related_contacts = []
        try:
            from app.models.account_contact import AccountContact
            from app.models.contact import Contact
            
            pivots = await AccountContact.find(
                AccountContact.account_id == account.id
            ).to_list()
            
            contact_ids = [p.contact_id for p in pivots]
            if contact_ids:
                contacts = await Contact.find(
                    {"_id": {"$in": contact_ids}},
                    Contact.deleted_at == None
                ).to_list()
                
                for contact in contacts:
                    related_contacts.append({
                        "id": str(contact.id),
                        "first_name": contact.first_name,
                        "last_name": contact.last_name,
                        "email": contact.email,
                        "phone": contact.phone,
                        "title": contact.title
                    })
        except Exception as e:
            print(f"Error loading contacts: {e}")
        
        # Get related opportunities
        related_opportunities = []
        try:
            from app.models.opportunity import Opportunity
            from app.models.opportunity_picklists import SalesStage
            
            opportunities = await Opportunity.find(
                Opportunity.account_id == account.id,
                Opportunity.tenant_id == tenant_id,
                Opportunity.deleted_at == None
            ).to_list()
            
            # --- N+1 OPTIMIZATION: Bulk fetch SalesStages and Owners ---
            stage_ids = list({opp.sales_stage_id for opp in opportunities if opp.sales_stage_id})
            owner_ids = list({opp.owner_id for opp in opportunities if opp.owner_id})
            
            stages_map = {}
            if stage_ids:
                stages = await SalesStage.find({"_id": {"$in": stage_ids}}).to_list()
                stages_map = {str(stage.id): stage.name for stage in stages}
                
            users_map = {}
            if owner_ids:
                owners = await User.find({"_id": {"$in": owner_ids}}).to_list()
                users_map = {str(u.id): u.name for u in owners}
            # -----------------------------------------------------------
            
            for opp in opportunities:
                stage_name = stages_map.get(str(opp.sales_stage_id)) if opp.sales_stage_id else None
                owner_name = users_map.get(str(opp.owner_id)) if opp.owner_id else None
                
                related_opportunities.append({
                    "id": str(opp.id),
                    "name": opp.name,
                    "amount": opp.amount,
                    "sales_stage_id": str(opp.sales_stage_id) if opp.sales_stage_id else None,
                    "sales_stage_name": stage_name,
                    "owner_id": str(opp.owner_id) if opp.owner_id else None,
                    "owner_name": owner_name,
                    "close_date": opp.close_date.isoformat() if opp.close_date else None,
                    "probability": opp.probability,
                    "no_of_pax": opp.no_of_pax,
                    "no_of_nights": opp.no_of_nights,
                    "travel_date": opp.travel_date.isoformat() if opp.travel_date else None,
                    "created_at": opp.created_at.isoformat()
                })
        except Exception as e:
            print(f"Error loading opportunities: {e}")
        
        # Get related tasks
        related_tasks = []
        try:
            from app.models.task import Task
            
            tasks = await Task.find(
                Task.taskable_type == "Account",
                Task.taskable_id == account.id,
                Task.tenant_id == tenant_id,
                Task.deleted_at == None
            ).to_list()
            
            # --- N+1 OPTIMIZATION: Bulk fetch assigned Users ---
            user_ids = list({task.assigned_user_id for task in tasks if task.assigned_user_id})
            users_map = {}
            if user_ids:
                users = await User.find({"_id": {"$in": user_ids}}).to_list()
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
            print(f"Error loading tasks: {e}")
        
        # Get parent account name
        parent_account_name = None
        if account.acc_parent_id:
            parent = await Account.get(account.acc_parent_id)
            if parent:
                parent_account_name = parent.name
        
        # Get account type name
        account_type_name = None
        if account.acc_type_id:
            from app.models.picklists import AccountType
            acc_type = await AccountType.get(account.acc_type_id)
            if acc_type:
                account_type_name = acc_type.name
        
        # Get industry name
        industry_name = None
        if account.industry_id:
            from app.models.picklists import Industry
            industry = await Industry.get(account.industry_id)
            if industry:
                industry_name = industry.name
        
        # Get rating name
        rating_name = None
        if account.rating_id:
            from app.models.picklists import Rating
            rating = await Rating.get(account.rating_id)
            if rating:
                rating_name = rating.name
        
        # Build response
        return {
            **account.model_dump(),
            "id": str(account.id),
            "tenant_id": str(account.tenant_id),
            "owner_id": str(account.owner_id),
            "created_by": str(account.created_by),
            "last_modified_by_id": str(account.last_modified_by_id) if account.last_modified_by_id else None,
            "acc_type_id": str(account.acc_type_id) if account.acc_type_id else None,
            "acc_parent_id": str(account.acc_parent_id) if account.acc_parent_id else None,
            "industry_id": str(account.industry_id) if account.industry_id else None,
            "rating_id": str(account.rating_id) if account.rating_id else None,
            "account_source_id": str(getattr(account, 'account_source_id', '')) if getattr(account, 'account_source_id', None) else None,
            "owner_name": owner.name if owner else None,
            "owner_email": owner.email if owner else None,
            "created_by_name": creator.name if creator else None,
            "last_modified_by_name": modifier.name if modifier else None,
            "related_contacts": related_contacts,
            "related_opportunities": related_opportunities,
            "related_tasks": related_tasks,
            "parent_account_name": parent_account_name,
            "account_type_name": account_type_name,
            "industry_name": industry_name,
            "rating_name": rating_name
        }
    
    async def update_account(
        self,
        account_id: str,
        account_data: AccountUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Account]:
        """Update an account"""
        account = await self.get_account(account_id, tenant_id)
        
        if not account:
            return None
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        # Update fields
        update_data = account_data.model_dump(exclude_unset=True)
        
        # If id is provided in update_data, ensure it matches the URL account_id
        if "id" in update_data and update_data["id"] != account_id:
            raise ValueError("Account ID in request body does not match URL account ID")
        
        # Remove id from update_data as it shouldn't be updated
        update_data.pop("id", None)
        
        for field, value in update_data.items():
            old_values[field] = getattr(account, field, None)
            setattr(account, field, value)
            updated_fields[field] = value
        
        account.last_modified_by_id = user_id
        await account.save()
        
        # Log update
        await self.log_entity_updated(
            entity=account,
            entity_type="account",
            old_values=old_values,
            updated_fields=updated_fields
        )
        
        return account
    
    async def delete_account(self, account_id: str, tenant_id: ObjectId, user_id: ObjectId = None) -> bool:
        """Soft delete an account with hierarchy checks"""
        from fastapi import HTTPException
        from app.models.contact import Contact
        from app.models.account_contact import AccountContact
        from app.models.opportunity import Opportunity

        account = await self.get_account(account_id, tenant_id)
        
        if not account:
            return False
        
        # Check hierarchy constraints
        if account.is_person_account:
            # Person Account: Check for active opportunities
            active_opps_count = await Opportunity.find(
                Opportunity.account_id == account.id,
                Opportunity.tenant_id == tenant_id,
                Opportunity.deleted_at == None
            ).count()
            
            if active_opps_count > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete person account with associated opportunities. Please delete the opportunities first."
                )
        else:
            # Regular Account: Check for active contacts
            # Check primary link
            active_contacts_count = await Contact.find(
                Contact.account_id == account.id,
                Contact.tenant_id == tenant_id,
                Contact.deleted_at == None
            ).count()
            
            if active_contacts_count > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete account with associated contacts. Please delete the contacts first."
                )
            
            # Check pivot links
            pivots_count = await AccountContact.find(
                AccountContact.account_id == account.id,
                AccountContact.tenant_id == tenant_id
            ).count()
            
            if pivots_count > 0:
                # Double check if any of these pivot contacts are active
                pivots = await AccountContact.find(
                    AccountContact.account_id == account.id,
                    AccountContact.tenant_id == tenant_id
                ).to_list()
                contact_ids = [p.contact_id for p in pivots]
                active_pivot_contacts = await Contact.find(
                    {"_id": {"$in": contact_ids}},
                    Contact.tenant_id == tenant_id,
                    Contact.deleted_at == None
                ).count()
                
                if active_pivot_contacts > 0:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot delete account with associated contacts. Please delete the contacts first."
                    )

        await account.soft_delete()
        
        # Log deletion
        await self.log_entity_deleted(
            entity=account,
            entity_type="account",
            additional_data={
                "name": account.name,
                "industry_id": str(account.industry_id) if account.industry_id else None,
                "website": account.website,
                "email": account.email
            }
        )
        
        return True
    
    async def change_account_owner(
        self,
        account_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Account]:
        """Change account owner with activity logging"""
        account = await self.get_account(account_id, tenant_id)
        
        if not account:
            return None
        
        old_owner = account.owner_id
        
        account.owner_id = new_owner_id
        account.last_modified_by_id = current_user_id
        await account.save()
        
        # Log assignment change
        await self.log_assignment_changed(
            entity=account,
            entity_type="account",
            old_assigned_to=str(old_owner),
            new_assigned_to=str(new_owner_id)
        )
        
        return account
    
    async def get_accounts_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10,
        owner_id: Optional[ObjectId] = None
    ) -> tuple[List[Account], int]:
        """Get accounts for a tenant with pagination"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if owner_id:
            query["owner_id"] = owner_id
        
        # Get total count
        total = await Account.find(query).count()
        
        # Get paginated results
        accounts = await Account.find(query)\
            .sort("-created_at")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return accounts, total
    
    async def search_accounts(
        self,
        search_params: AccountSearch,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10
    ) -> tuple[List[Account], int]:
        """Search accounts with filters"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        # Text search
        if search_params.query:
            query["$or"] = [
                {"name": {"$regex": search_params.query, "$options": "i"}},
                {"email": {"$regex": search_params.query, "$options": "i"}},
                {"phone": {"$regex": search_params.query, "$options": "i"}}
            ]
        
        # Filters (moved outside of text search block to prevent UnboundLocalError)
        if getattr(search_params, 'acc_type_id', None):
            query["acc_type_id"] = ObjectId(search_params.acc_type_id)
        
        if getattr(search_params, 'industry_id', None):
            query["industry_id"] = ObjectId(search_params.industry_id)
        
        if getattr(search_params, 'rating_id', None):
            query["rating_id"] = ObjectId(search_params.rating_id)
        
        if getattr(search_params, 'owner_id', None):
            query["owner_id"] = ObjectId(search_params.owner_id)
        
        if getattr(search_params, 'billing_country', None):
            query["billing_country"] = search_params.billing_country
        
        if getattr(search_params, 'billing_state', None):
            query["billing_state"] = search_params.billing_state
        
        # Get total count
        total = await Account.find(query).count()
        
        # Get results
        accounts = await Account.find(query)\
            .sort("-created_at")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return accounts, total
    
    async def change_owner(
        self,
        account_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Account]:
        """Change account owner"""
        account = await self.get_account(account_id, tenant_id)
        
        if not account:
            return None
        
        old_owner_id = account.owner_id
        account.owner_id = new_owner_id
        account.last_modified_by_id = current_user_id
        await account.save()
        
        # TODO: Send email notification about owner change
        # TODO: Dispatch background job for owner change tracking
        
        return account
    
    async def get_parent_accounts(
        self,
        tenant_id: ObjectId,
        limit: int = 100
    ) -> List[Account]:
        """Get accounts that can be parents (no parent themselves)"""
        return await Account.find(
            Account.tenant_id == tenant_id,
            Account.acc_parent_id == None,
            Account.deleted_at == None
        ).limit(limit).to_list()
    
    async def _track_user_view(
        self,
        user_id: ObjectId,
        account_id: ObjectId,
        tenant_id: ObjectId
    ):
        """Track that a user viewed an account"""
        from app.models.user_account_view import UserAccountView
        
        # Check if view exists
        view = await UserAccountView.find_one(
            UserAccountView.user_id == user_id,
            UserAccountView.account_id == account_id
        )
        
        if view:
            # Increment count
            view.view_count += 1
            view.updated_at = datetime.utcnow()
            await view.save()
        else:
            # Create new view
            view = UserAccountView(
                user_id=user_id,
                account_id=account_id,
                tenant_id=tenant_id,
                view_count=1
            )
            await view.insert()
