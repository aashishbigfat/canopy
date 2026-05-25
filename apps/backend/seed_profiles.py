"""
Seed the correct profiles matching the production system.
Removes previously seeded test profiles and creates the actual ones.

Usage:
  cd apps/backend
  python seed_profiles.py
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

# ---------------------------------------------------------------------------
# Full permission list from role_service.py
# ---------------------------------------------------------------------------
ALL_CRUD = lambda entity: [f"view_{entity}", f"create_{entity}", f"edit_{entity}", f"delete_{entity}"]

FULL_PERMS = (
    ALL_CRUD("lead") + ALL_CRUD("opportunity") + ALL_CRUD("account") +
    ALL_CRUD("person_account") + ALL_CRUD("contact") + ALL_CRUD("task") +
    ALL_CRUD("event") + ALL_CRUD("note") + ALL_CRUD("email") +
    ALL_CRUD("supplier") + ALL_CRUD("destination") +
    ALL_CRUD("itinerary") + ALL_CRUD("package") +
    ALL_CRUD("product") + ALL_CRUD("quote") + ALL_CRUD("invoice") +
    ALL_CRUD("hierarchy") + ALL_CRUD("department") +
    ALL_CRUD("user") + ALL_CRUD("role") +
    ALL_CRUD("email_template") + ALL_CRUD("webhook") +
    ALL_CRUD("report") +
    ["view_file", "upload_file", "delete_file", "download_file", "share_file", "public_link_file"] +
    ["send_email", "view_reports", "view_dashboard", "view_leaderboard"] +
    ["manage_sales_stages", "manage_sales_targets", "manage_incentives"] +
    ["manage_settings", "manage_system", "manage_tenants", "manage_billing", "manage_notifications"] +
    ["manage_package_pricing", "feature_package"] +
    ["lock_opportunity", "owner_change"]
)

# ---------------------------------------------------------------------------
# Profile definitions matching production
# ---------------------------------------------------------------------------
PROFILES = [
    {
        "name": "Dook_Standard",
        "display_name": "Dook_Standard",
        "description": "Standard user with full CRM access",
        "is_admin": False,
        "permissions": (
            ALL_CRUD("lead") + ALL_CRUD("opportunity") + ALL_CRUD("account") +
            ALL_CRUD("person_account") + ALL_CRUD("contact") + ALL_CRUD("task") +
            ALL_CRUD("event") + ALL_CRUD("note") + ALL_CRUD("email") +
            ALL_CRUD("supplier") + ALL_CRUD("destination") +
            ALL_CRUD("itinerary") + ALL_CRUD("package") +
            ALL_CRUD("product") + ALL_CRUD("quote") + ALL_CRUD("invoice") +
            ALL_CRUD("email_template") + ALL_CRUD("report") +
            ALL_CRUD("hierarchy") + ALL_CRUD("department") +
            ["view_file", "upload_file", "delete_file", "download_file", "share_file", "public_link_file"] +
            ["send_email", "view_reports", "view_dashboard", "view_leaderboard"] +
            ["manage_sales_stages", "manage_sales_targets", "manage_incentives"] +
            ["manage_package_pricing", "feature_package"] +
            ["lock_opportunity", "owner_change"]
        ),
    },
    {
        "name": "standard_admin",
        "display_name": "standard_admin",
        "description": "Full access to all modules and settings",
        "is_admin": True,
        "permissions": list(set(FULL_PERMS)),
    },
    {
        "name": "Dook_Power",
        "display_name": "Dook_Power",
        "description": "Power user with elevated access",
        "is_admin": False,
        "permissions": (
            ALL_CRUD("lead") + ALL_CRUD("opportunity") + ALL_CRUD("account") +
            ALL_CRUD("person_account") + ALL_CRUD("contact") +
            ["view_task", "create_task", "edit_task"] +
            ALL_CRUD("event") + ALL_CRUD("note") +
            ["view_email", "create_email", "send_email"] +
            ["view_supplier", "create_supplier", "edit_supplier"] +
            ["view_destination", "create_destination", "edit_destination"] +
            ["view_itinerary", "create_itinerary", "edit_itinerary"] +
            ["view_file", "upload_file", "download_file"] +
            ["view_reports", "view_report", "view_dashboard", "view_leaderboard"] +
            ["lock_opportunity", "owner_change"]
        ),
    },
    {
        "name": "Dook_B2C",
        "display_name": "Dook B2C",
        "description": "B2C sales team profile",
        "is_admin": False,
        "permissions": (
            ALL_CRUD("lead") + ALL_CRUD("opportunity") +
            ["view_account", "create_account", "edit_account"] +
            ["view_person_account", "create_person_account", "edit_person_account"] +
            ALL_CRUD("contact") +
            ["view_task", "create_task", "edit_task"] +
            ["view_event", "create_event"] +
            ["view_note", "create_note", "edit_note"] +
            ["view_email", "create_email", "send_email"] +
            ["view_destination"] +
            ["view_itinerary", "create_itinerary"] +
            ["view_file", "upload_file", "download_file"] +
            ["view_reports", "view_dashboard"]
        ),
    },
    {
        "name": "Product_Management",
        "display_name": "Product Management",
        "description": "Product and package management",
        "is_admin": False,
        "permissions": (
            ["view_lead", "view_opportunity", "view_account", "view_contact"] +
            ALL_CRUD("package") + ALL_CRUD("itinerary") +
            ALL_CRUD("destination") + ALL_CRUD("product") +
            ["view_supplier", "create_supplier", "edit_supplier"] +
            ["manage_package_pricing", "feature_package"] +
            ["view_file", "upload_file", "download_file"] +
            ["view_dashboard", "view_reports"]
        ),
    },
    {
        "name": "Account_Head",
        "display_name": "Account Head",
        "description": "Account management head with oversight",
        "is_admin": False,
        "permissions": (
            ALL_CRUD("account") + ALL_CRUD("person_account") + ALL_CRUD("contact") +
            ["view_lead", "view_opportunity"] +
            ["view_task", "create_task", "edit_task"] +
            ["view_note", "create_note"] +
            ["view_email", "create_email", "send_email"] +
            ["view_file", "upload_file", "download_file"] +
            ["view_reports", "view_report", "view_dashboard"]
        ),
    },
    {
        "name": "Account",
        "display_name": "Account",
        "description": "Account management team",
        "is_admin": False,
        "permissions": (
            ["view_account", "create_account", "edit_account"] +
            ["view_person_account", "create_person_account", "edit_person_account"] +
            ["view_contact", "create_contact", "edit_contact"] +
            ["view_lead", "view_opportunity"] +
            ["view_task", "create_task"] +
            ["view_note", "create_note"] +
            ["view_email", "create_email", "send_email"] +
            ["view_file", "upload_file"] +
            ["view_dashboard"]
        ),
    },
    {
        "name": "Dook_Limited",
        "display_name": "Dook_Limited",
        "description": "Limited access profile",
        "is_admin": False,
        "permissions": (
            ["view_lead", "create_lead", "edit_lead"] +
            ["view_opportunity", "create_opportunity", "edit_opportunity"] +
            ["view_account", "view_contact"] +
            ["view_task", "create_task", "edit_task"] +
            ["view_note", "create_note"] +
            ["view_email", "create_email", "send_email"] +
            ["view_destination"] +
            ["view_file", "upload_file"] +
            ["view_dashboard"]
        ),
    },
    {
        "name": "Operations",
        "display_name": "Operations",
        "description": "Operations team profile",
        "is_admin": False,
        "permissions": (
            ["view_lead", "view_opportunity", "view_account", "view_contact"] +
            ALL_CRUD("task") +
            ["view_event", "create_event", "edit_event"] +
            ALL_CRUD("note") +
            ["view_supplier", "create_supplier", "edit_supplier"] +
            ALL_CRUD("destination") +
            ["view_itinerary", "create_itinerary", "edit_itinerary"] +
            ["view_file", "upload_file", "download_file"] +
            ["view_dashboard"]
        ),
    },
    {
        "name": "Dook_Digital_Marketing",
        "display_name": "Dook Digital Marketing",
        "description": "Digital marketing team",
        "is_admin": False,
        "permissions": (
            ["view_lead", "create_lead", "edit_lead"] +
            ["view_opportunity"] +
            ["view_account", "view_contact"] +
            ["view_email", "create_email", "send_email"] +
            ["view_email_template", "create_email_template", "edit_email_template"] +
            ["view_destination"] +
            ["view_file", "upload_file"] +
            ["view_reports", "view_dashboard"]
        ),
    },
]

# Profiles to remove (previously seeded test profiles)
PROFILES_TO_REMOVE = [
    "super_admin", "director", "manager", "team_lead", "executive", "read_only",
    "Test Role", "Test Role 165340", "Seller P",
]


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[Role, User, Tenant])

    tenant = await Tenant.find_one()
    if not tenant:
        print("ERROR: No tenant found.")
        sys.exit(1)

    print(f"Tenant: {tenant.company_name} (ID: {tenant.id})")
    print()

    # 1. Remove old/test profiles
    for name in PROFILES_TO_REMOVE:
        old = await Role.find_one({"tenant_id": tenant.id, "name": name})
        if old:
            # Check if any users reference this role
            user_count = await User.find({"tenant_id": tenant.id, "role_ids": old.id}).count()
            if user_count > 0:
                print(f"  SKIPPED (in use by {user_count} users): {name}")
            else:
                await old.delete()
                print(f"  Deleted: {name}")
        # Also try by display_name
        old2 = await Role.find_one({"tenant_id": tenant.id, "display_name": name})
        if old2 and old2.id != (old.id if old else None):
            user_count = await User.find({"tenant_id": tenant.id, "role_ids": old2.id}).count()
            if user_count > 0:
                print(f"  SKIPPED (in use by {user_count} users): {name}")
            else:
                await old2.delete()
                print(f"  Deleted: {name}")

    print()

    # 2. Upsert standard profiles
    for profile_def in PROFILES:
        existing = await Role.find_one({
            "tenant_id": tenant.id,
            "name": profile_def["name"],
            "deleted_at": None,
        })

        perms = list(set(profile_def["permissions"]))  # deduplicate

        if existing:
            existing.permissions = perms
            existing.display_name = profile_def["display_name"]
            existing.description = profile_def["description"]
            existing.is_admin = profile_def["is_admin"]
            await existing.save()
            print(f"  Updated: {profile_def['display_name']} ({len(perms)} perms)")
        else:
            role = Role(
                name=profile_def["name"],
                display_name=profile_def["display_name"],
                description=profile_def["description"],
                tenant_id=tenant.id,
                is_admin=profile_def["is_admin"],
                permissions=perms,
            )
            await role.insert()
            print(f"  Created: {profile_def['display_name']} ({len(perms)} perms)")

    print()

    # 3. Final summary
    all_roles = await Role.find({"tenant_id": tenant.id, "deleted_at": None}).to_list()
    print(f"=== Final Profiles ({len(all_roles)}) ===")
    for r in all_roles:
        dn = r.display_name or r.name
        print(f"  {dn} | admin={r.is_admin} | perms={len(r.permissions)}")

    print()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(seed())
