"""
Grant the full permission set (CORE + tenant-industry extras, including all
new BD-panel permissions) to every admin role in every tenant.

Idempotent: only inserts missing permissions; never removes existing ones.

Usage:
    python -m app.scripts.grant_bd_permissions_to_admins [--dry-run] [--tenant <oid>]

Why this script and not update_admin_permissions.py?
- The legacy script targets only the first tenant returned by find_one().
- It also hard-coded an older permission list that pre-dates the BD panel.
- This version pulls the live permission registry from role_service so it
  stays in sync as new permissions are added.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from typing import List, Set

from bson import ObjectId

from app.db.mongodb import init_db
from app.models.role import Role
from app.models.tenant import Tenant
from app.services.role_service import (
    CORE_PERMISSIONS,
    INDUSTRY_PERMISSIONS,
)

logger = logging.getLogger("grant_bd_permissions")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _perms_for_industry(industry: str | None) -> Set[str]:
    base = set(CORE_PERMISSIONS)
    if industry and industry in INDUSTRY_PERMISSIONS:
        base.update(INDUSTRY_PERMISSIONS[industry])
    return base


async def run(tenant_filter: str | None, dry_run: bool) -> None:
    await init_db()

    tenant_query: dict = {"deleted_at": None}
    if tenant_filter:
        tenant_query["_id"] = ObjectId(tenant_filter)
    tenants = await Tenant.find(tenant_query).to_list()
    if not tenants:
        logger.error("No tenants matched filter.")
        sys.exit(1)

    total_roles_updated = 0
    total_perms_added = 0

    for tenant in tenants:
        all_perms = _perms_for_industry(tenant.industry)
        admin_roles = await Role.find(
            {"tenant_id": tenant.id, "is_admin": True, "deleted_at": None}
        ).to_list()

        if not admin_roles:
            # Fall back to name-based discovery (legacy seeds didn't always
            # set is_admin=True consistently).
            admin_roles = await Role.find(
                {
                    "tenant_id": tenant.id,
                    "name": {"$in": [
                        "admin", "Admin", "administrator", "Administrator",
                        "super_admin", "Super Admin", "superadmin",
                        "standard_admin",  # seen in this project's seeds
                    ]},
                    "deleted_at": None,
                }
            ).to_list()

        if not admin_roles:
            logger.warning("[%s/%s] No admin role found — skipping",
                           tenant.company_name, tenant.id)
            continue

        logger.info("[%s/%s] industry=%s, %d admin role(s), perm pool=%d",
                    tenant.company_name, tenant.id, tenant.industry,
                    len(admin_roles), len(all_perms))

        for role in admin_roles:
            current = set(role.permissions or [])
            missing = all_perms - current
            if not missing:
                logger.info("    role=%s already has full set (%d perms)",
                            role.name, len(current))
                continue
            new_perms = sorted(current | all_perms)
            if dry_run:
                logger.info("    DRY role=%s would add %d perms: %s",
                            role.name, len(missing), sorted(missing))
            else:
                role.permissions = new_perms
                await role.save()
                logger.info("    UPDATED role=%s (+%d perms, now %d)",
                            role.name, len(missing), len(new_perms))
                total_roles_updated += 1
                total_perms_added += len(missing)

    logger.info("Done. %d role(s) updated, %d permission(s) added across all tenants. dry_run=%s",
                total_roles_updated, total_perms_added, dry_run)


def main() -> None:
    parser = argparse.ArgumentParser(description="Grant full BD permission set to admin roles")
    parser.add_argument("--tenant", help="Restrict to one tenant_id (ObjectId)")
    parser.add_argument("--dry-run", action="store_true", help="Log what would change without saving")
    args = parser.parse_args()
    asyncio.run(run(args.tenant, args.dry_run))


if __name__ == "__main__":
    main()
