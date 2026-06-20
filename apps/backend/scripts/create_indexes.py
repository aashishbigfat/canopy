"""
Out-of-band index creation (performance Phase 1).

WHY THIS IS A SCRIPT, NOT app-boot:
    Several models had their `Settings.indexes` commented out with the note
    "temporarily disabled to fix startup" — Beanie's init_beanie auto-creates
    indexes synchronously at boot, and a slow/large index build (or an options
    conflict) can crash or hang startup on a shared Atlas cluster. Large shops
    manage indexes as a *deploy step*, decoupled from application start. This
    script does exactly that.

SAFE TO RE-RUN:
    Indexes use Mongo's auto-generated names (derived from the key pattern), so
    creating an index that already exists is a no-op. If an index with the same
    keys but different OPTIONS exists, Mongo raises OperationFailure — we catch,
    log, and continue (one conflict never aborts the rest).

NOTE ON THE 500-COLLECTION CAP:
    Indexes do NOT count as collections. This script never creates a collection;
    it only adds indexes to existing ones. Safe under the Atlas cap.

USAGE (from apps/backend):
    python scripts/create_indexes.py
    python scripts/create_indexes.py --dry-run     # print plan, create nothing

Verify afterwards with explain():
    db.users.find({tenant_id: ..., is_active: true}).explain("executionStats")
    -> stage should be IXSCAN, not COLLSCAN.
"""
import argparse
import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", os.getenv("MONGO_URL", "mongodb://localhost:27017"))
DB_NAME = os.getenv("MONGODB_DB_NAME", os.getenv("MONGO_DB", "tutterfly_crm"))

# Each entry: (collection_name, [(field, direction), ...])
# Tenant-first compound indexes. Where a list sorts on a field, the sort field
# plus the `_id` tiebreaker are included so keyset pagination (Phase 6) is fully
# index-covered (no in-memory sort, no COLLSCAN at any page depth).
INDEXES: list[tuple[str, list[tuple[str, int]]]] = [
    # --- users: queried on EVERY list endpoint (owner dropdowns, name maps) ---
    ("users", [("tenant_id", ASCENDING), ("is_active", ASCENDING)]),
    ("users", [("tenant_id", ASCENDING), ("email", ASCENDING)]),
    ("users", [("tenant_id", ASCENDING), ("role_hierarchy_id", ASCENDING)]),
    ("users", [("tenant_id", ASCENDING), ("department_id", ASCENDING)]),

    # --- tasks: filtered by assignee/status/due date; polymorphic linkage ---
    ("tasks", [("tenant_id", ASCENDING), ("assigned_user_id", ASCENDING), ("status", ASCENDING)]),
    ("tasks", [("tenant_id", ASCENDING), ("owner_id", ASCENDING)]),
    ("tasks", [("tenant_id", ASCENDING), ("deleted_at", ASCENDING), ("due_date", ASCENDING)]),
    ("tasks", [("tenant_id", ASCENDING), ("taskable_type", ASCENDING), ("taskable_id", ASCENDING)]),

    # --- emails / notes / files: owner lists + polymorphic "activity on record" ---
    ("emails", [("tenant_id", ASCENDING), ("owner_id", ASCENDING), ("created_at", DESCENDING), ("_id", DESCENDING)]),
    ("emails", [("tenant_id", ASCENDING), ("emailable_type", ASCENDING), ("emailable_id", ASCENDING)]),
    ("notes", [("tenant_id", ASCENDING), ("owner_id", ASCENDING), ("created_at", DESCENDING), ("_id", DESCENDING)]),
    ("notes", [("tenant_id", ASCENDING), ("noteable_type", ASCENDING), ("noteable_id", ASCENDING)]),
    ("files", [("tenant_id", ASCENDING), ("owner_id", ASCENDING), ("created_at", DESCENDING), ("_id", DESCENDING)]),
    ("files", [("tenant_id", ASCENDING), ("fileable_type", ASCENDING), ("fileable_id", ASCENDING)]),

    # --- entity_views: saved views read on every list endpoint ---
    ("entity_views", [("tenant_id", ASCENDING), ("entity_type", ASCENDING)]),
    ("entity_views", [("tenant_id", ASCENDING), ("entity_type", ASCENDING), ("created_by", ASCENDING), ("is_public", ASCENDING)]),

    # --- inbox/messaging: filtered by tenant+user, sorted by received_at ---
    ("email_messages", [("tenant_id", ASCENDING), ("user_id", ASCENDING), ("received_at", DESCENDING)]),
    ("email_messages", [("tenant_id", ASCENDING), ("received_at", DESCENDING)]),
    ("whatsapp_messages", [("tenant_id", ASCENDING), ("user_id", ASCENDING), ("created_at", DESCENDING)]),

    # --- big-three + contacts: keyset-friendly versions of the default-sort index
    #     (existing 3-key indexes stay; these add the _id tiebreaker for Phase 6) ---
    ("accounts", [("tenant_id", ASCENDING), ("deleted_at", ASCENDING), ("updated_at", DESCENDING), ("_id", DESCENDING)]),
    ("contacts", [("tenant_id", ASCENDING), ("deleted_at", ASCENDING), ("updated_at", DESCENDING), ("_id", DESCENDING)]),
    ("opportunities", [("tenant_id", ASCENDING), ("deleted_at", ASCENDING), ("created_at", DESCENDING), ("_id", DESCENDING)]),
    ("leads", [("tenant_id", ASCENDING), ("deleted_at", ASCENDING), ("created_at", DESCENDING), ("_id", DESCENDING)]),
]


async def main(dry_run: bool = False) -> None:
    print(f"DB: {DB_NAME}")
    print(f"Indexes to ensure: {len(INDEXES)}\n")

    if dry_run:
        for coll, keys in INDEXES:
            print(f"  [plan] {coll}: {keys}")
        print("\nDry run — nothing created.")
        return

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    created = skipped = failed = 0
    try:
        for coll, keys in INDEXES:
            try:
                # background=True is a no-op on modern Mongo (online builds) but
                # harmless and explicit about intent for older servers.
                name = await db[coll].create_index(keys, background=True)
                print(f"  [ok]   {coll}: {name}")
                created += 1
            except OperationFailure as e:
                msg = e.details.get("errmsg", str(e)) if getattr(e, "details", None) else str(e)
                # Most common benign case: same keys already indexed under a
                # different name (e.g. a prior Beanie auto-create). Logged, not fatal.
                print(f"  [skip] {coll} {keys}: {msg}")
                skipped += 1
            except Exception as e:  # noqa: BLE001 - never let one index abort the run
                print(f"  [FAIL] {coll} {keys}: {e}")
                failed += 1
    finally:
        client.close()

    print(f"\nDone. created={created} skipped={skipped} failed={failed}")
    if failed:
        print("Some indexes failed — review the [FAIL] lines above and reconcile manually.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create performance indexes (idempotent).")
    parser.add_argument("--dry-run", action="store_true", help="Print the plan without creating indexes.")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
