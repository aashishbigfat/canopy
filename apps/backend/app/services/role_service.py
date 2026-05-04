"""
Role service layer - Business logic for role management
"""
from typing import List, Optional
from bson import ObjectId
from app.models.role import Role
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate, PermissionAdd, PermissionRemove
from app.mixins.activity_mixin import ActivityMixin


# ---------------------------------------------------------------------------
# Industry-partitioned permission registry
# ---------------------------------------------------------------------------

# Core permissions — available to ALL industries
CORE_PERMISSIONS = [
    # Account permissions
    "view_account", "create_account", "edit_account", "delete_account",
    
    # Contact permissions
    "view_contact", "create_contact", "edit_contact", "delete_contact",
    
    # Lead permissions
    "view_lead", "create_lead", "edit_lead", "delete_lead",
    
    # Opportunity permissions
    "view_opportunity", "create_opportunity", "edit_opportunity", "delete_opportunity",
    
    # Task permissions
    "view_task", "create_task", "edit_task", "delete_task",
    
    # Event permissions
    "view_event", "create_event", "edit_event", "delete_event",
    
    # Note permissions
    "view_note", "create_note", "edit_note", "delete_note",
    
    # Email permissions
    "view_email", "create_email", "edit_email", "delete_email",
    "send_email", "view_email_template", "create_email_template", "edit_email_template", "delete_email_template",
    
    # File permissions
    "view_file", "upload_file", "delete_file", "download_file",
    
    # Supplier / Provider / Vendor permissions (label differs per industry)
    "view_supplier", "create_supplier", "edit_supplier", "delete_supplier",
    
    # Department permissions
    "view_department", "create_department", "edit_department", "delete_department",
    
    # Product permissions
    "view_product", "create_product", "edit_product", "delete_product",
    
    # Quote permissions
    "view_quote", "create_quote", "edit_quote", "delete_quote",
    
    # Invoice permissions
    "view_invoice", "create_invoice", "edit_invoice", "delete_invoice",
    
    # User permissions
    "view_user", "create_user", "edit_user", "delete_user",
    
    # Role permissions
    "view_role", "create_role", "edit_role", "delete_role",
    
    # Report permissions
    "view_reports", "view_report", "create_report", "edit_report", "delete_report",
    
    # Dashboard permissions
    "view_dashboard",
    
    # Settings permissions
    "manage_settings", "manage_system", "manage_tenants",
    
    # Billing permissions
    "manage_billing",
    
    # Notification permissions
    "manage_notifications",
    
    # Webhook permissions
    "manage_webhooks", "view_webhook", "create_webhook", "edit_webhook", "delete_webhook",
]

# Travel-only permissions — destinations, itineraries, packages
TRAVEL_PERMISSIONS = [
    "view_destination", "create_destination", "edit_destination", "delete_destination",
    "view_itinerary", "create_itinerary", "edit_itinerary", "delete_itinerary",
    "view_package", "create_package", "edit_package", "delete_package",
    "manage_package_pricing", "feature_package",
]

# Per-industry extra permissions (extend as modules grow)
INDUSTRY_PERMISSIONS: dict = {
    "travel": TRAVEL_PERMISSIONS,
    "healthcare": [],   # Future: view_patient, view_appointment, etc.
    "education": [],
    "manufacturing": [],
}

# Flat list — backward compatibility (validation uses this)
ALL_PERMISSIONS = CORE_PERMISSIONS + TRAVEL_PERMISSIONS


class RoleService(ActivityMixin):
    """Service for Role business logic"""
    
    def __init__(self):
        super().__init__()
    
    async def create_role(
        self,
        role_data: RoleCreate,
        tenant_id: ObjectId,
        created_by: ObjectId
    ) -> Role:
        """Create a new role"""
        
        # Check if role name already exists
        existing = await Role.find_one(
            {"name": role_data.name, "tenant_id": tenant_id, "deleted_at": None}
        )

        if existing:
            raise ValueError(f"Role with name '{role_data.name}' already exists")
        
        # Validate permissions against the tenant's industry
        from app.models.tenant import Tenant
        tenant = await Tenant.get(tenant_id)
        industry = tenant.industry if tenant else "travel"
        valid_perms = self.get_permissions_for_industry(industry)
        invalid_perms = [p for p in role_data.permissions if p not in valid_perms]
        if invalid_perms:
            raise ValueError(f"Invalid permissions: {', '.join(invalid_perms)}")
        
        # Create role
        role = Role(
            **role_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            created_by=created_by
        )
        
        await role.insert()
        
        # Log role creation
        await self.log_entity_created(
            entity=role,
            entity_type="role",
            additional_data={
                "name": role.name,
                "display_name": role.display_name,
                "permissions": role.permissions,
                "description": role.description
            }
        )
        
        return role
    
    async def get_role(
        self,
        role_id: str,
        tenant_id: ObjectId
    ) -> Optional[Role]:
        """Get role by ID"""
        role = await Role.get(ObjectId(role_id))
        
        if role and role.tenant_id == tenant_id and not role.deleted_at:
            return role
        return None
    
    async def update_role(
        self,
        role_id: str,
        role_data: RoleUpdate,
        tenant_id: ObjectId,
        updated_by: ObjectId
    ) -> Optional[Role]:
        """Update a role"""
        role = await self.get_role(role_id, tenant_id)
        
        if not role:
            return None
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        # Check name uniqueness if being updated
        if role_data.name and role_data.name != role.name:
            existing = await Role.find_one(
                {"name": role_data.name, "tenant_id": tenant_id, "deleted_at": None}
            )
            if existing:
                raise ValueError(f"Role with name '{role_data.name}' already exists")
        
        # Validate permissions if being updated
        if role_data.permissions is not None:
            from app.models.tenant import Tenant
            tenant = await Tenant.get(tenant_id)
            industry = tenant.industry if tenant else "travel"
            valid_perms = self.get_permissions_for_industry(industry)
            invalid_perms = [p for p in role_data.permissions if p not in valid_perms]
            if invalid_perms:
                raise ValueError(f"Invalid permissions: {', '.join(invalid_perms)}")
        
        # Update fields
        update_data = role_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            old_values[field] = getattr(role, field, None)
            setattr(role, field, value)
            updated_fields[field] = value
        
        role.last_modified_by_id = updated_by
        await role.save()
        
        # Log update
        await self.log_entity_updated(
            entity=role,
            entity_type="role",
            old_values=old_values,
            updated_fields=updated_fields
        )
        
        return role
    
    async def delete_role(
        self,
        role_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Soft delete a role"""
        role = await self.get_role(role_id, tenant_id)
        
        if not role:
            return False
        
        # Check if any users have this role
        users_with_role = await User.find(
            {"role_ids": ObjectId(role_id), "tenant_id": tenant_id, "deleted_at": None}
        ).count()
        
        if users_with_role > 0:
            raise ValueError(f"Cannot delete role: {users_with_role} users are assigned to this role")
        
        await role.soft_delete()
        
        # Log deletion
        await self.log_entity_deleted(
            entity=role,
            entity_type="role",
            additional_data={
                "name": role.name,
                "display_name": role.display_name,
                "permissions": role.permissions
            }
        )
        
        return True
    
    async def get_roles_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 100
    ) -> List[Role]:
        """Get roles for a tenant"""
        
        roles = await Role.find(
            {"tenant_id": tenant_id, "deleted_at": None}
        ).skip(skip).limit(limit).sort("+name").to_list()
        
        return roles
    
    async def add_permissions(
        self,
        role_id: str,
        permission_data: PermissionAdd,
        tenant_id: ObjectId
    ) -> Optional[Role]:
        """Add permissions to a role"""
        role = await self.get_role(role_id, tenant_id)
        
        if not role:
            return None
        
        # Validate permissions against the tenant's industry
        from app.models.tenant import Tenant
        tenant = await Tenant.get(tenant_id)
        industry = tenant.industry if tenant else "travel"
        valid_perms = self.get_permissions_for_industry(industry)
        invalid_perms = [p for p in permission_data.permissions if p not in valid_perms]
        if invalid_perms:
            raise ValueError(f"Invalid permissions: {', '.join(invalid_perms)}")
        
        # Add new permissions (avoid duplicates)
        current_perms = set(role.permissions)
        new_perms = set(permission_data.permissions)
        role.permissions = list(current_perms | new_perms)
        
        await role.save()
        return role
    
    async def remove_permissions(
        self,
        role_id: str,
        permission_data: PermissionRemove,
        tenant_id: ObjectId
    ) -> Optional[Role]:
        """Remove permissions from a role"""
        role = await self.get_role(role_id, tenant_id)
        
        if not role:
            return None
        
        # Remove permissions
        current_perms = set(role.permissions)
        remove_perms = set(permission_data.permissions)
        role.permissions = list(current_perms - remove_perms)
        
        await role.save()
        return role
    
    async def get_users_by_role(
        self,
        role_id: str,
        tenant_id: ObjectId
    ) -> List[User]:
        """Get all users with a specific role"""
        
        users = await User.find(
            {"role_ids": ObjectId(role_id), "tenant_id": tenant_id, "deleted_at": None}
        ).to_list()
        
        return users
    
    @staticmethod
    def get_all_permissions() -> List[str]:
        """Get list of all available permissions"""
        return ALL_PERMISSIONS.copy()
    
    @staticmethod
    def get_permissions_for_industry(industry: str) -> List[str]:
        """Get permissions relevant to a specific industry.
        
        Returns CORE_PERMISSIONS + industry-specific extras.
        """
        extras = INDUSTRY_PERMISSIONS.get(industry, [])
        return CORE_PERMISSIONS + extras
