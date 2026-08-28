"""
Update existing admin role to include all new permissions
(hierarchy, person_account, sales stages, incentives, leaderboard, etc.)

Usage:
  cd apps/backend
  python update_admin_permissions.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.role import Role
from app.models.user import User
from app.models.tenant import Tenant

# Complete permission set for admin — matches role_service.py + create_user.py
ALL_PERMISSIONS = [
    "view_account", "create_account", "edit_account", "delete_account",
    "view_person_account", "create_person_account", "edit_person_account", "delete_person_account",
    "view_contact", "create_contact", "edit_contact", "delete_contact",
    "view_lead", "create_lead", "edit_lead", "delete_lead",
    "view_opportunity", "create_opportunity", "edit_opportunity", "delete_opportunity",
    "view_task", "create_task", "edit_task", "delete_task",
    "view_event", "create_event", "edit_event", "delete_event",
    "view_note", "create_note", "edit_note", "delete_note",
    "view_email", "create_email", "edit_email", "delete_email",
    "send_email", "view_email_template", "create_email_template",
    "edit_email_template", "delete_email_template",
    "view_file", "upload_file", "delete_file", "download_file",
    "view_supplier", "create_supplier", "edit_supplier", "delete_supplier",
    "view_destination", "create_destination", "edit_destination", "delete_destination",
    "view_hierarchy", "create_hierarchy", "edit_hierarchy", "delete_hierarchy",
    "view_department", "create_department", "edit_department", "delete_department",
    "view_itinerary", "create_itinerary", "edit_itinerary", "delete_itinerary",
    "view_package", "create_package", "edit_package", "delete_package",
    "manage_package_pricing", "feature_package",
    "view_product", "create_product", "edit_product", "delete_product",
    "view_quote", "create_quote", "edit_quote", "delete_quote",
    "view_invoice", "create_invoice", "edit_invoice", "delete_invoice",
    "view_user", "create_user", "edit_user", "delete_user",
    "view_role", "create_role", "edit_role", "delete_role",
    "view_reports", "view_report", "create_report", "edit_report", "delete_report",
    "view_dashboard", "view_leaderboard",
    "manage_sales_stages", "manage_sales_targets", "manage_incentives",
    "manage_settings", "manage_system", "manage_tenants",
    "manage_billing", "manage_notifications",
    "manage_webhooks", "view_webhook", "create_webhook", "edit_webhook",
    "delete_webhook",
]


async def update():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[Role, User, Tenant])

    tenant = await Tenant.find_one()
    if not tenant:
        print("ERROR: No tenant found.")
        sys.exit(1)

    print(f"Tenant: {tenant.company_name} (ID: {tenant.id})")

    # Find all admin roles for this tenant
    admin_roles = await Role.find(
        {"tenant_id": tenant.id, "is_admin": True, "deleted_at": None}
    ).to_list()

    if not admin_roles:
        # Also try by name
        admin_roles = await Role.find(
            {"tenant_id": tenant.id, "name": {"$in": ["admin", "Admin", "administrator"]}, "deleted_at": None}
        ).to_list()

    if not admin_roles:
        print("No admin roles found. Creating one...")
        admin_role = Role(
            name="admin",
            display_name="Administrator",
            description="Full access to all features",
            tenant_id=tenant.id,
            is_admin=True,
            permissions=ALL_PERMISSIONS,
        )
        await admin_role.insert()
        print(f"  Created admin role (ID: {admin_role.id}) with {len(ALL_PERMISSIONS)} permissions")
    else:
        for role in admin_roles:
            old_count = len(role.permissions)
            # Merge: keep existing + add new
            merged = list(set(role.permissions) | set(ALL_PERMISSIONS))
            role.permissions = merged
            await role.save()
            print(f"  Updated '{role.display_name or role.name}' (ID: {role.id}): {old_count} -> {len(merged)} permissions")

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(update())
