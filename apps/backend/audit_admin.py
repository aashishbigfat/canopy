import asyncio, sys
sys.path.insert(0, '.')
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.role import Role, RoleHierarchy
from app.models.user import User
from app.models.tenant import Tenant

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[Role, User, Tenant, RoleHierarchy])

    tenant = await Tenant.find_one()
    print(f"=== TENANT: {tenant.company_name} (industry: {tenant.industry}) ===")
    print()

    # List all profiles (roles)
    roles = await Role.find({"tenant_id": tenant.id, "deleted_at": None}).to_list()
    print(f"=== PROFILES (Roles) - {len(roles)} found ===")
    for r in roles:
        dn = r.display_name or "-"
        print(f"  ID={r.id} | {r.name} ({dn}) | admin={r.is_admin} | perms={len(r.permissions)}")
    print()

    # List hierarchy
    hierarchies = await RoleHierarchy.find({"tenant_id": tenant.id, "deleted_at": None}).sort("+level").to_list()
    print(f"=== HIERARCHY NODES - {len(hierarchies)} found ===")
    for h in hierarchies:
        parent_name = "-"
        if h.parent_id:
            parent = await RoleHierarchy.get(h.parent_id)
            parent_name = parent.name if parent else "?"
        user_count = await User.find({"tenant_id": tenant.id, "role_hierarchy_id": h.id, "deleted_at": None}).count()
        indent = "  " * (h.level or 0)
        print(f"  {indent}{h.name} (L{h.level}) | users={user_count} | parent={parent_name}")
    print()

    # Count users
    total_users = await User.find({"tenant_id": tenant.id, "deleted_at": None}).count()
    no_hierarchy = await User.find({"tenant_id": tenant.id, "role_hierarchy_id": None, "deleted_at": None}).count()
    no_role = await User.find({"tenant_id": tenant.id, "role_ids": {"$size": 0}, "deleted_at": None}).count()
    print(f"=== USERS: {total_users} total ===")
    print(f"  Without hierarchy: {no_hierarchy}")
    print(f"  Without profile:   {no_role}")

asyncio.run(check())
