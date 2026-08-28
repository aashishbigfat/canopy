"""
Assign proper hierarchy roles and profiles to all users.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.core.config import settings
from app.models.role import Role, RoleHierarchy
from app.models.user import User
from app.models.tenant import Tenant


# Assignment plan based on user names:
ASSIGNMENTS = {
    "Admin User": {"hierarchy": "Dook_Super", "profile": "standard_admin"},
    "Ankit Sharma": {"hierarchy": "Director Sales", "profile": "Dook_Standard"},
    "Jane Smith": {"hierarchy": "CIS Operations", "profile": "Dook_Standard"},
    "Alice Johnson": {"hierarchy": "Operation Team Lead 1", "profile": "Dook_Standard"},
    "Scarlet Johnson": {"hierarchy": "Executive Team 1", "profile": "Dook_Standard"},
    "Kartik Bansal": {"hierarchy": "System Handler", "profile": "standard_admin"},
    "Amitesh Maurya": {"hierarchy": "Executive Team 2", "profile": "Dook_Standard"},
}


async def fix():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[RoleHierarchy, User, Role, Tenant])
    tenant = await Tenant.find_one()

    # Build lookup maps
    hierarchies = await RoleHierarchy.find(
        {"tenant_id": tenant.id, "deleted_at": None}
    ).to_list()
    h_map = {h.name: str(h.id) for h in hierarchies}

    roles = await Role.find({"tenant_id": tenant.id, "deleted_at": None}).to_list()
    p_map = {r.name: str(r.id) for r in roles}

    users = await User.find({"tenant_id": tenant.id, "deleted_at": None}).to_list()
    for u in users:
        assign = ASSIGNMENTS.get(u.name)
        if not assign:
            print(f"  SKIPPED (no assignment rule): {u.name}")
            continue

        h_id = h_map.get(assign["hierarchy"])
        p_id = p_map.get(assign["profile"])
        if not h_id:
            print(f'  ERROR: hierarchy "{assign["hierarchy"]}" not found for {u.name}')
            continue
        if not p_id:
            print(f'  ERROR: profile "{assign["profile"]}" not found for {u.name}')
            continue

        u.role_hierarchy_id = ObjectId(h_id)
        u.role_ids = [ObjectId(p_id)]
        await u.save()
        print(f"  OK: {u.name} -> hierarchy={assign['hierarchy']}, profile={assign['profile']}")

    print()
    print("Done! Final state:")
    print()

    users = await User.find({"tenant_id": tenant.id, "deleted_at": None}).to_list()
    for u in users:
        h_id = getattr(u, "role_hierarchy_id", None)
        h_name = "NONE"
        if h_id:
            h = next((x for x in hierarchies if str(x.id) == str(h_id)), None)
            h_name = h.name if h else "INVALID"
        profile_names = []
        for rid in u.role_ids:
            r = next((x for x in roles if str(x.id) == str(rid)), None)
            profile_names.append((r.display_name or r.name) if r else "?")
        print(f"  {u.name} | hierarchy={h_name} | profiles={profile_names}")


if __name__ == "__main__":
    asyncio.run(fix())
