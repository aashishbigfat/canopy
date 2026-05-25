"""
Backfill BD assignments (territory_id / bd_owner_id / reporting_manager_id)
for existing leads that pre-date Phase 1 of the BD panel rollout.

Usage:
    python -m app.scripts.backfill_bd_assignments [--tenant <tenant_id>] [--limit N] [--dry-run]

Idempotent: leads that already have territory_id set are skipped by default
(use --force to re-resolve them).
"""
import argparse
import asyncio
import logging
from typing import Optional

from bson import ObjectId

from app.db.mongodb import init_db
from app.models.lead import Lead
from app.services.bd_assignment_service import bd_assignment_service
from datetime import datetime

logger = logging.getLogger("backfill_bd")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


async def _backfill_one(lead: Lead, dry_run: bool) -> bool:
    """Returns True if updated."""
    assignment = await bd_assignment_service.resolve_for_address(
        tenant_id=lead.tenant_id,
        country=lead.country,
        state=lead.state,
        zip_code=lead.zip,
    )
    if assignment.is_empty():
        return False

    if dry_run:
        logger.info(
            "DRY [tenant=%s] lead=%s would set territory=%s bd=%s mgr=%s via %s",
            lead.tenant_id, lead.id,
            assignment.territory_id, assignment.bd_owner_id,
            assignment.reporting_manager_id, assignment.match_source,
        )
        return False

    lead.territory_id = assignment.territory_id
    lead.region_id = assignment.region_id
    lead.bd_owner_id = assignment.bd_owner_id
    lead.reporting_manager_id = assignment.reporting_manager_id
    lead.territory_match_source = assignment.match_source
    lead.territory_assigned_at = datetime.utcnow()
    await lead.save()
    return True


async def run(tenant: Optional[str], limit: Optional[int], dry_run: bool, force: bool) -> None:
    await init_db()

    query: dict = {"deleted_at": None}
    if tenant:
        query["tenant_id"] = ObjectId(tenant)
    if not force:
        query["territory_id"] = None

    total = 0
    updated = 0
    batch_size = 200
    cursor = Lead.find(query)
    if limit:
        cursor = cursor.limit(limit)

    async for lead in cursor:
        total += 1
        try:
            if await _backfill_one(lead, dry_run):
                updated += 1
        except Exception:
            logger.exception("Failed to backfill lead %s", lead.id)
        if total % batch_size == 0:
            logger.info("Progress: %d scanned, %d updated", total, updated)

    logger.info("Done. %d scanned, %d updated, dry_run=%s, force=%s", total, updated, dry_run, force)


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill BD assignments on existing leads")
    parser.add_argument("--tenant", help="Restrict to one tenant_id (ObjectId)")
    parser.add_argument("--limit", type=int, help="Max leads to scan")
    parser.add_argument("--dry-run", action="store_true", help="Log what would change without saving")
    parser.add_argument("--force", action="store_true", help="Re-resolve leads that already have territory_id")
    args = parser.parse_args()
    asyncio.run(run(args.tenant, args.limit, args.dry_run, args.force))


if __name__ == "__main__":
    main()
