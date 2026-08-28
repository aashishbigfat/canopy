"""
Account service layer - Business logic for Account operations
"""
import logging
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from app.models.account import Account
from app.models.user import User
from app.schemas.account import AccountCreate, AccountUpdate, AccountSearch
from app.mixins.activity_mixin import ActivityMixin
from app.services.notification_service import NotificationService
from app.services.webhook_service import webhook_service
from app.services import field_registry_service
from app.schemas.field_registry import CustomFieldValuePayload
import json


_logger = logging.getLogger(__name__)

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

        from app.core.entity_required_fields import validate_account_record
        validate_account_record(account, is_person_account=account.is_person_account)
        
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
        
        # Save custom fields via unified registry (Phase 1 §A)
        if custom_fields:
            payloads = [
                CustomFieldValuePayload(
                    additional_field_id=ObjectId(f["id"]),
                    field_value=json.dumps(f["value"]) if not isinstance(f.get("value"), str) else f["value"],
                )
                for f in custom_fields if f.get("id") is not None
            ]
            await field_registry_service.write_custom_field_values(
                "account", account.id, payloads, tenant_id,
            )
        
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
        
        # Fire webhook event
        try:
            await webhook_service.trigger_event(
                event_type="account.created",
                payload={
                    "account_id": str(account.id),
                    "name": account.name,
                    "email": account.email,
                    "phone": account.phone,
                    "is_person_account": account.is_person_account,
                },
                tenant_id=str(tenant_id),
                entity_id=str(account.id),
                entity_type="account",
                triggered_by=str(user_id)
            )
        except Exception:
            pass
        
        return account
    
    async def get_account(self, account_id: str, tenant_id: ObjectId) -> Optional[Account]:
        """Get account by ID, scoped to tenant."""
        try:
            oid = ObjectId(account_id)
        except Exception:
            return None
        return await Account.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )
    
    async def get_account_with_relations(
        self,
        account_id: str,
        tenant_id: ObjectId
    ) -> Optional[Dict]:
        """Get account with all related records for detail view"""
        account = await self.get_account(account_id, tenant_id)
        
        if not account:
            return None
        
        # Get owner / creator / modifier — bulk tenant-scoped lookup avoids
        # cross-tenant user data leakage even if a stale user_id reference exists.
        ref_user_ids = {account.owner_id, account.created_by}
        if account.last_modified_by_id:
            ref_user_ids.add(account.last_modified_by_id)
        ref_users_map: Dict = {}
        if ref_user_ids:
            ref_users = await User.find(
                {"_id": {"$in": list(ref_user_ids)}, "tenant_id": tenant_id, "deleted_at": None}
            ).to_list()
            ref_users_map = {u.id: u for u in ref_users}
        owner = ref_users_map.get(account.owner_id)
        creator = ref_users_map.get(account.created_by)
        modifier = ref_users_map.get(account.last_modified_by_id) if account.last_modified_by_id else None
        
        # Get related contacts
        related_contacts = []
        try:
            from app.models.account_contact import AccountContact
            from app.models.contact import Contact
            
            pivots = await AccountContact.find(
                {"account_id": account.id, "tenant_id": tenant_id}
            ).to_list()

            contact_ids = [p.contact_id for p in pivots]
            if contact_ids:
                contacts = await Contact.find(
                    {"_id": {"$in": contact_ids}, "tenant_id": tenant_id, "deleted_at": None}
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
            _logger.warning("Error loading contacts for account %s: %s", account.id, e)
        
        # Get related opportunities
        related_opportunities = []
        try:
            from app.models.opportunity import Opportunity
            from app.models.opportunity_picklists import SalesStage
            
            opportunities = await Opportunity.find(
                {"account_id": account.id, "tenant_id": tenant_id, "deleted_at": None}
            ).to_list()
            
            # --- N+1 OPTIMIZATION: Bulk fetch SalesStages and Owners ---
            stage_ids = list({opp.sales_stage_id for opp in opportunities if opp.sales_stage_id})
            owner_ids = list({opp.owner_id for opp in opportunities if opp.owner_id})
            
            stages_map = {}
            stage_flags = {}  # stage_id -> (is_won, is_lost)
            if stage_ids:
                from app.core.tenant_scope import fetch_picklists_in_tenant
                from app.services.industry_service import get_tenant_industry
                industry = await get_tenant_industry(tenant_id)
                stages = await fetch_picklists_in_tenant(
                    SalesStage,
                    tenant_id,
                    stage_ids,
                    picklist_type="sales_stage",
                    industry=industry,
                )
                stages_map = {str(stage.id): stage.name for stage in stages}
                stage_flags = {
                    str(stage.id): (bool(stage.is_won), bool(stage.is_lost))
                    for stage in stages
                }

            users_map = {}
            if owner_ids:
                owners = await User.find(
                    {"_id": {"$in": owner_ids}, "tenant_id": tenant_id, "deleted_at": None}
                ).to_list()
                users_map = {str(u.id): u.name for u in owners}
            # -----------------------------------------------------------

            def _to_number(v) -> float:
                """Coerce pax/amount values (which may be None or strings) to a number."""
                if v is None:
                    return 0
                try:
                    return float(v)
                except (TypeError, ValueError):
                    return 0

            # Opportunity summary buckets (Total / Won / Open / Lost) for the
            # account detail sidebar. count = number of opps, pax = sum of pax,
            # value = sum of amount.
            summary_buckets = {
                k: {"count": 0, "pax": 0.0, "value": 0.0}
                for k in ("total", "won", "open", "lost")
            }

            for opp in opportunities:
                stage_name = stages_map.get(str(opp.sales_stage_id)) if opp.sales_stage_id else None
                owner_name = users_map.get(str(opp.owner_id)) if opp.owner_id else None
                ind = opp.industry_data or {}

                pax = _to_number(ind.get('no_of_pax'))
                value = _to_number(opp.amount)
                is_won, is_lost = stage_flags.get(str(opp.sales_stage_id), (False, False))
                bucket = "won" if is_won else "lost" if is_lost else "open"
                for key in ("total", bucket):
                    summary_buckets[key]["count"] += 1
                    summary_buckets[key]["pax"] += pax
                    summary_buckets[key]["value"] += value

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
                    "no_of_pax": ind.get('no_of_pax'),
                    "no_of_nights": ind.get('no_of_nights'),
                    "travel_date": ind.get('travel_date'),
                    "created_at": opp.created_at.isoformat()
                })

            # Won % = won / total for each metric (0 when total is 0)
            total_b = summary_buckets["total"]
            won_b = summary_buckets["won"]
            opportunity_summary = {
                **summary_buckets,
                "won_percent": {
                    metric: round((won_b[metric] / total_b[metric]) * 100, 2) if total_b[metric] else 0
                    for metric in ("count", "pax", "value")
                },
            }
        except Exception as e:
            _logger.warning("Error loading opportunities for account %s: %s", account.id, e)
            opportunity_summary = {
                k: {"count": 0, "pax": 0.0, "value": 0.0}
                for k in ("total", "won", "open", "lost")
            }
            opportunity_summary["won_percent"] = {"count": 0, "pax": 0, "value": 0}
        
        # Get related tasks
        related_tasks = []
        try:
            from app.models.task import Task
            
            tasks = await Task.find(
                {"taskable_type": "Account", "taskable_id": account.id, "tenant_id": tenant_id, "deleted_at": None}
            ).to_list()
            
            # --- N+1 OPTIMIZATION: Bulk fetch assigned Users ---
            user_ids = list({task.assigned_user_id for task in tasks if task.assigned_user_id})
            users_map = {}
            if user_ids:
                users = await User.find(
                    {"_id": {"$in": user_ids}, "tenant_id": tenant_id, "deleted_at": None}
                ).to_list()
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
            _logger.warning("Error loading tasks for account %s: %s", account.id, e)
        
        # Get parent account name — must be scoped to same tenant
        parent_account_name = None
        if account.acc_parent_id:
            parent = await Account.find_one(
                {"_id": account.acc_parent_id, "tenant_id": tenant_id, "deleted_at": None}
            )
            if parent:
                parent_account_name = parent.name
        
        # Get account type name — picklists are platform-defaults (tenant_id=None)
        # OR tenant-specific overrides. Match either, but never another tenant's override.
        account_type_name = None
        if account.acc_type_id:
            from app.models.picklists import AccountType
            acc_type = await AccountType.find_one(
                {
                    "_id": account.acc_type_id,
                    "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}],
                }
            )
            if acc_type:
                account_type_name = acc_type.name

        # Get industry name (same picklist scoping rules)
        industry_name = None
        if account.industry_id:
            from app.models.picklists import Industry
            industry = await Industry.find_one(
                {
                    "_id": account.industry_id,
                    "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}],
                }
            )
            if industry:
                industry_name = industry.name

        # Get category name (same picklist scoping rules)
        category_name = None
        if getattr(account, "category_id", None):
            from app.models.picklists import AccountCategory
            category = await AccountCategory.find_one(
                {
                    "_id": account.category_id,
                    "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}],
                }
            )
            if category:
                category_name = category.name

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
            "category_id": str(account.category_id) if getattr(account, 'category_id', None) else None,
            "account_source_id": str(getattr(account, 'account_source_id', '')) if getattr(account, 'account_source_id', None) else None,
            "owner_name": owner.name if owner else None,
            "owner_email": owner.email if owner else None,
            "created_by_name": creator.name if creator else None,
            "last_modified_by_name": modifier.name if modifier else None,
            "related_contacts": related_contacts,
            "related_opportunities": related_opportunities,
            "opportunity_summary": opportunity_summary,
            "related_tasks": related_tasks,
            "parent_account_name": parent_account_name,
            "account_type_name": account_type_name,
            "industry_name": industry_name,
            "category_name": category_name,
        }
    
    async def update_account(
        self,
        account_id: str,
        account_data: AccountUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId,
        custom_fields: Optional[List[Dict[str, Any]]] = None,
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

        from app.core.entity_required_fields import validate_account_record
        validate_account_record(account, is_person_account=account.is_person_account)

        await account.save()

        # PERF: a renamed account → propagate to denormalized account_name on
        # its contacts + opportunities (one index-backed update_many each).
        if 'name' in updated_fields:
            from app.services.denormalize import propagate_account_name
            await propagate_account_name(tenant_id, account.id, account.name)

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
                "account", account.id, payloads, tenant_id,
            )
            if n:
                updated_fields["custom_fields_updated"] = n

        # Log update
        await self.log_entity_updated(
            entity=account,
            entity_type="account",
            old_values=old_values,
            updated_fields=updated_fields
        )

        # Fire webhook event
        try:
            await webhook_service.trigger_event(
                event_type="account.updated",
                payload={
                    "account_id": str(account.id),
                    "name": account.name,
                    "updated_fields": {k: str(v) for k, v in updated_fields.items()},
                },
                tenant_id=str(tenant_id),
                entity_id=str(account.id),
                entity_type="account",
                triggered_by=str(user_id)
            )
        except Exception:
            pass
        
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
                {"account_id": account.id, "tenant_id": tenant_id, "deleted_at": None}
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
                {"account_id": account.id, "tenant_id": tenant_id, "deleted_at": None}
            ).count()
            
            if active_contacts_count > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete account with associated contacts. Please delete the contacts first."
                )
            
            # Check pivot links
            pivots_count = await AccountContact.find(
                {"account_id": account.id, "tenant_id": tenant_id}
            ).count()

            if pivots_count > 0:
                # Double check if any of these pivot contacts are active
                pivots = await AccountContact.find(
                    {"account_id": account.id, "tenant_id": tenant_id}
                ).to_list()
                contact_ids = [p.contact_id for p in pivots]
                active_pivot_contacts = await Contact.find(
                    {"_id": {"$in": contact_ids}, "tenant_id": tenant_id, "deleted_at": None}
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
        
        # Fire webhook event
        try:
            await webhook_service.trigger_event(
                event_type="account.deleted",
                payload={
                    "account_id": str(account.id),
                    "name": account.name,
                    "email": account.email,
                },
                tenant_id=str(tenant_id),
                entity_id=str(account.id),
                entity_type="account",
                triggered_by=str(user_id) if user_id else None
            )
        except Exception:
            pass
        
        return True
    
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
        limit: int = 10,
        visible_owner_ids: Optional[list] = None
    ) -> tuple[List[Account], int]:
        """Search accounts with filters and visibility rules"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        # Scope results based on visibility rules
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}

        
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
        """Change account owner.

        SECURITY: new_owner_id must belong to the same tenant. Otherwise a
        privilege escalation would be possible by reassigning a record to a
        cross-tenant user that has no other relationship to this data.
        """
        account = await self.get_account(account_id, tenant_id)

        if not account:
            return None

        # Validate new owner belongs to the same tenant and is active
        owner = await User.find_one(
            {"_id": new_owner_id, "tenant_id": tenant_id, "deleted_at": None, "is_active": True}
        )
        if not owner:
            raise ValueError("new_owner_id must reference an active user in this tenant")

        old_owner_id = account.owner_id
        account.owner_id = new_owner_id
        # PERF: persist the denormalized owner_name (owner_name is now a real
        # field — no more transient-attribute hack) so lists need no user join.
        account.owner_name = owner.name
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
            {"tenant_id": tenant_id, "acc_parent_id": None, "deleted_at": None}
        ).limit(limit).to_list()
    
    async def _track_user_view(
        self,
        user_id: ObjectId,
        account_id: ObjectId,
        tenant_id: ObjectId
    ):
        """Track that a user viewed an account"""
        from app.models.user_account_view import UserAccountView
        
        # Check if view exists — scope by tenant to prevent collision across tenants
        view = await UserAccountView.find_one(
            {
                "user_id": user_id,
                "account_id": account_id,
                "tenant_id": tenant_id,
            }
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
