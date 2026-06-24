"""
Retire the LEGACY destination data that the app no longer reads.

Background: the live destination feature uses the ``picklists`` collection
(picklist_type='destination'); the old ``destinations`` collection and its
``destination_opportunities`` / ``destination_leads`` pivots are dead weight
after seed_locations.py + remap_destination_ids.py.

Per CLAUDE.md rule #1 (soft-delete domain records, never hard-delete) this
SOFT-deletes the rows (sets ``deleted_at``). They stay recoverable, and the
legacy API already filters ``deleted_at: None`` so they vanish from every read.

Usage (from apps/backend):
  python scripts/retire_legacy_destinations.py            # dry-run
  python scripts/retire_legacy_destinations.py --apply     # soft-delete (backs up first)
"""
import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

COLLECTIONS = ["destinations", "destination_opportunities", "destination_leads"]


async def main(apply: bool):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print(f"mode: {'APPLY' if apply else 'DRY-RUN'}")
    cli = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000)
    db = cli[settings.MONGODB_DB_NAME]
    await cli.admin.command("ping")

    live = {c: await db[c].count_documents({"deleted_at": None}) for c in COLLECTIONS}
    total = {c: await db[c].count_documents({}) for c in COLLECTIONS}
    for c in COLLECTIONS:
        print(f"  {c}: total={total[c]}  not-yet-deleted={live[c]}")

    if not apply:
        print("\nDRY-RUN only. Re-run with --apply to soft-delete (with backup).")
        cli.close()
        return

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = Path.home() / f"tutterfly_legacy_dest_backup_{ts}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nBacking up -> {backup_dir}")
    for c in COLLECTIONS:
        docs = await db[c].find({}).to_list(length=None)
        with open(backup_dir / f"{c}.json", "w", encoding="utf-8") as f:
            json.dump(docs, f, default=str, ensure_ascii=False)
        print(f"  backed up {c}: {len(docs)}")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    print("\nSoft-deleting:")
    for c in COLLECTIONS:
        res = await db[c].update_many(
            {"deleted_at": None},
            {"$set": {"deleted_at": now, "updated_at": now}},
        )
        print(f"  {c}: soft-deleted {res.modified_count}")

    print(f"\nDONE. Backup at: {backup_dir}")
    cli.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    asyncio.run(main(apply=args.apply))
