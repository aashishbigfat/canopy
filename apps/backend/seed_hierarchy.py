"""
Seed the role hierarchy to match the reference Tutterfly CRM structure.

Usage:
  cd apps/backend
  python seed_hierarchy.py

This will:
1. Find the first tenant (or a specified one)
2. Delete ALL existing role_hierarchies for that tenant
3. Create the reference hierarchy tree

Safe to re-run — it clears and re-seeds.
"""
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.role import RoleHierarchy
from app.models.user import User
from app.models.tenant import Tenant

# ---------------------------------------------------------------------------
# The reference hierarchy — nested dicts.  key = name, value = children dict.
# ---------------------------------------------------------------------------
HIERARCHY_TREE = {
    "Dook_Super": {
        "Director Sales": {
            "System Handler": {},
            "Extra": {},
            "CIS": {
                "CIS Operations": {
                    "Operation Team Lead 1": {
                        "Team Lead 1": {
                            "Executive Team 1": {},
                        },
                    },
                    "CIS SM": {
                        "Team Lead 2": {
                            "Executive Team 2": {},
                        },
                        "Destination Manager": {
                            "Team Lead 5": {
                                "Executive Team 5": {},
                            },
                        },
                    },
                    "Team Lead 4": {
                        "Executive Team 4": {},
                    },
                    "Team Lead 3": {
                        "Executive Team 3": {},
                    },
                    "Manager Groups": {
                        "Team Lead 7": {
                            "Executive Team 7": {},
                        },
                        "Team Lead 6": {
                            "Executive Team 6": {},
                        },
                        "Executive Groups": {},
                    },
                    "Manager Visa": {
                        "Executive Visa": {},
                    },
                    "Manager mice & wedding": {
                        "Deputy Manager mice & wedding": {
                            "Executive mice & wedding": {},
                        },
                    },
                    "Manager Ticketing": {
                        "Executive Ticketing": {},
                    },
                },
            },
        },
    },
}


async def _insert_tree(tenant_id, tree: dict, parent_id=None, level=0) -> int:
    """Recursively insert hierarchy nodes.  Returns total inserted count."""
    count = 0
    for name, children in tree.items():
        node = RoleHierarchy(
            name=name,
            tenant_id=tenant_id,
            parent_id=parent_id,
            level=level,
        )
        await node.insert()
        count += 1
        print(f"  {'  ' * level}+-- {name}  (level={level})")
        count += await _insert_tree(tenant_id, children, parent_id=node.id, level=level + 1)
    return count


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[RoleHierarchy, User, Tenant])

    # Find tenant
    tenant = await Tenant.find_one()
    if not tenant:
        print("ERROR: No tenant found.  Run create_user.py first.")
        sys.exit(1)
    print(f"Tenant: {tenant.company_name} (ID: {tenant.id})\n")

    # Clear existing hierarchies for this tenant
    deleted = await RoleHierarchy.find(
        {"tenant_id": tenant.id}
    ).delete()
    print(f"Cleared {deleted.deleted_count if deleted else 0} existing hierarchy nodes.\n")

    # Seed
    print("Creating hierarchy:")
    total = await _insert_tree(tenant.id, HIERARCHY_TREE)
    print(f"\nDone!  Inserted {total} hierarchy nodes.")


if __name__ == "__main__":
    asyncio.run(seed())
