"""
Create a user and optionally a tenant. Use for first-time admin or extra users.

Usage (from repo root or apps/backend):
  cd apps/backend
  python create_user.py --email admin@tutterfly.com --password yourpassword --name "Admin" --admin

  With custom tenant (company):
  python create_user.py --email admin@myco.com --password secret --company "My Company" --admin

  Env vars (optional): CREATE_USER_EMAIL, CREATE_USER_PASSWORD, CREATE_USER_NAME,
  CREATE_USER_COMPANY, CREATE_USER_ADMIN=1
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

# Ensure backend app is importable (run from repo root or apps/backend)
BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from passlib.context import CryptContext
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.user import User
from app.models.tenant import Tenant
from app.models.role import Role

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# All permissions for admin role (from role_service)
ALL_PERMISSIONS = [
    "view_account", "create_account", "edit_account", "delete_account",
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
    "view_dashboard",
    "manage_settings", "manage_system", "manage_tenants",
    "manage_billing", "manage_notifications",
    "manage_webhooks", "view_webhook", "create_webhook", "edit_webhook",
    "delete_webhook",
]


async def create_user(
    email: str,
    password: str,
    name: str,
    company_name: str | None = None,
    admin: bool = False,
):
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[User, Tenant, Role])

    existing = await User.find_one(User.email == email)
    if existing:
        print(f"User already exists: {email}")
        return

    # Tenant: use existing or create one
    if company_name:
        tenant = await Tenant.find_one(Tenant.company_name == company_name)
        if not tenant:
            subdomain = company_name.lower().replace(" ", "-")[:32]
            tenant = Tenant(
                company_name=company_name,
                subdomain=subdomain,
                email=email,
            )
            await tenant.insert()
            print(f"Created tenant: {tenant.company_name} (ID: {tenant.id})")
        else:
            print(f"Using existing tenant: {tenant.company_name} (ID: {tenant.id})")
    else:
        tenant = await Tenant.find_one()
        if not tenant:
            tenant = Tenant(
                company_name="Default Company",
                subdomain="default",
                email=email,
            )
            await tenant.insert()
            print(f"Created tenant: {tenant.company_name} (ID: {tenant.id})")
        else:
            print(f"Using existing tenant: {tenant.company_name} (ID: {tenant.id})")

    role_ids = []
    if admin:
        admin_role = await Role.find_one(
            Role.tenant_id == tenant.id,
            Role.name == "admin",
        )
        if not admin_role:
            admin_role = Role(
                name="admin",
                display_name="Administrator",
                description="Full access",
                tenant_id=tenant.id,
                is_admin=True,
                permissions=ALL_PERMISSIONS,
            )
            await admin_role.insert()
            print(f"Created admin role (ID: {admin_role.id})")
        else:
            print(f"Using existing admin role (ID: {admin_role.id})")
        role_ids = [admin_role.id]

    hashed = pwd_context.hash(password)
    user = User(
        name=name,
        email=email,
        password=hashed,
        tenant_id=tenant.id,
        role_ids=role_ids,
        is_active=True,
        is_verified=True,
    )
    await user.insert()

    print("\nUser created successfully!")
    print(f"  Email:   {user.email}")
    print(f"  Name:    {user.name}")
    print(f"  Tenant:  {tenant.company_name}")
    print(f"  Admin:   {admin}")
    print(f"  User ID: {user.id}")


def main():
    parser = argparse.ArgumentParser(description="Create a user (and optionally tenant/admin).")
    parser.add_argument("--email", default=os.environ.get("CREATE_USER_EMAIL"), help="User email (or CREATE_USER_EMAIL)")
    parser.add_argument("--password", default=os.environ.get("CREATE_USER_PASSWORD"), help="User password (or CREATE_USER_PASSWORD)")
    parser.add_argument("--name", default=os.environ.get("CREATE_USER_NAME", "Admin"), help="Display name")
    parser.add_argument("--company", default=os.environ.get("CREATE_USER_COMPANY"), help="Tenant company name (creates tenant if new)")
    parser.add_argument(
        "--admin",
        action="store_true",
        default=os.environ.get("CREATE_USER_ADMIN", "").lower() in ("1", "true", "yes"),
        help="Create/assign admin role",
    )
    args = parser.parse_args()

    if not args.email or not args.password:
        print(
            "Error: --email and --password required "
            "(or set CREATE_USER_EMAIL and CREATE_USER_PASSWORD)."
        )
        sys.exit(1)

    asyncio.run(create_user(
        email=args.email.strip(),
        password=args.password,
        name=(args.name or "Admin").strip(),
        company_name=args.company.strip() if args.company else None,
        admin=args.admin,
    ))


if __name__ == "__main__":
    main()
