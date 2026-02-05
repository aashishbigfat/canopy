"""
Example Account Service with Activity Logging
"""
from typing import Optional, Dict
from bson import ObjectId

from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate
from app.mixins.activity_mixin import ActivityMixin


class AccountService(ActivityMixin):
    """Account service with comprehensive activity logging"""
    
    async def create_account(
        self,
        account_data: AccountCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ):
        """Create a new account with activity logging"""
        
        account = Account(
            **account_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            created_by=user_id,
            owner_id=user_id
        )
        
        await account.insert()
        
        # Log account creation
        await self.log_entity_created(
            entity=account,
            entity_type="account",
            additional_data={
                "industry": account.industry,
                "annual_revenue": account.annual_revenue
            }
        )
        
        return account
    
    async def update_account(
        self,
        account_id: str,
        account_data: AccountUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ):
        """Update an account with activity logging"""
        account = await Account.get(ObjectId(account_id))
        
        if not account or account.tenant_id != tenant_id:
            return None
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        for field, value in account_data.model_dump(exclude_unset=True).items():
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
    
    async def delete_account(
        self,
        account_id: str,
        tenant_id: ObjectId,
        user_id: ObjectId
    ):
        """Delete an account with activity logging"""
        account = await Account.get(ObjectId(account_id))
        
        if not account or account.tenant_id != tenant_id:
            return False
        
        await account.delete()
        
        # Log deletion
        await self.log_entity_deleted(
            entity=account,
            entity_type="account",
            additional_data={
                "account_name": account.name,
                "industry": account.industry
            }
        )
        
        return True
    
    async def change_account_owner(
        self,
        account_id: str,
        new_owner_id: ObjectId,
        current_user_id: ObjectId,
        tenant_id: ObjectId
    ):
        """Change account owner with activity logging"""
        account = await Account.get(ObjectId(account_id))
        
        if not account or account.tenant_id != tenant_id:
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
