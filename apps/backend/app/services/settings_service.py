"""
Settings service layer
"""
from typing import Optional
from bson import ObjectId
from beanie import PydanticObjectId
from app.models.settings import TenantSettings, UserSettings
from app.schemas.settings import TenantSettingsUpdate, UserSettingsUpdate


class SettingsService:
    """Service for Settings business logic"""
    
    # Tenant Settings
    async def get_tenant_settings(self, tenant_id: str) -> TenantSettings:
        """Get or create tenant settings"""
        # Convert string to ObjectId
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        settings = await TenantSettings.find_one(TenantSettings.tenant_id == tenant_obj_id)
        if not settings:
            settings = TenantSettings(tenant_id=tenant_obj_id)
            await settings.insert()
        return settings
    
    async def update_tenant_settings(
        self,
        tenant_id: str,
        data: TenantSettingsUpdate
    ) -> TenantSettings:
        """Update tenant settings"""
        # Convert string to ObjectId
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        settings = await TenantSettings.find_one(TenantSettings.tenant_id == tenant_obj_id)
        if not settings:
            settings = TenantSettings(tenant_id=tenant_obj_id)
            await settings.insert()
        
        update_data = data.model_dump(exclude_unset=True, exclude={'default_lead_owner_id'})
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        if data.default_lead_owner_id is not None:
            settings.default_lead_owner_id = PydanticObjectId(data.default_lead_owner_id) if data.default_lead_owner_id else None
        
        await settings.save()
        return settings
    
    # User Settings
    async def get_user_settings(self, user_id: str, tenant_id: str) -> UserSettings:
        """Get or create user settings"""
        # Convert strings to ObjectId
        user_obj_id = PydanticObjectId(user_id)
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        settings = await UserSettings.find_one(UserSettings.user_id == user_obj_id)
        if not settings:
            settings = UserSettings(user_id=user_obj_id, tenant_id=tenant_obj_id)
            await settings.insert()
        return settings
    
    async def update_user_settings(
        self,
        user_id: str,
        tenant_id: str,
        data: UserSettingsUpdate
    ) -> UserSettings:
        """Update user settings"""
        # Convert strings to ObjectId
        user_obj_id = PydanticObjectId(user_id)
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        settings = await UserSettings.find_one(UserSettings.user_id == user_obj_id)
        if not settings:
            settings = UserSettings(user_id=user_obj_id, tenant_id=tenant_obj_id)
            await settings.insert()
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        await settings.save()
        return settings
    
    async def reset_user_settings(self, user_id: str, tenant_id: str) -> UserSettings:
        """Reset user settings to defaults"""
        # Convert strings to ObjectId
        user_obj_id = PydanticObjectId(user_id)
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        settings = await UserSettings.find_one(UserSettings.user_id == user_obj_id)
        if not settings:
            settings = UserSettings(user_id=user_obj_id, tenant_id=tenant_obj_id)
            await settings.insert()
        
        settings.theme = "light"
        settings.sidebar_collapsed = False
        settings.email_notifications = True
        settings.push_notifications = True
        settings.desktop_notifications = True
        settings.notify_on_assigned_lead = True
        settings.notify_on_assigned_opportunity = True
        settings.notify_on_task_reminder = True
        settings.notify_on_mention = True
        settings.timezone = None
        settings.language = None
        settings.date_format = None
        settings.preferences = {}
        
        await settings.save()
        return settings
