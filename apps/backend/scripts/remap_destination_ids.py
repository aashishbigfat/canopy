"""
Re-point opportunity/lead ``industry_data.destination_ids`` from the OLD
destination ids (deleted by seed_locations.py) to the NEW destination picklist
ids, matched by destination NAME.

It also restores ``industry_data.destinations`` (the human-readable names) on
records that had lost them.

Sources of truth:
  * old id -> name : the seed backup's destination_picklists.json  +  the live
                     (untouched) legacy ``destinations`` collection.
  * name -> new id : the freshly seeded destination picklists.

Usage (from apps/backend):
  python scripts/remap_destination_ids.py --backup "C:\\Users\\..\\tutterfly_geo_backup_YYYYMMDD_HHMMSS"
  python scripts/remap_destination_ids.py --backup "<dir>" --apply
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def main(backup: Path, apply: bool):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print(f"mode: {'APPLY' if apply else 'DRY-RUN'}  backup={backup}")
    cli = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000)
    db = cli[settings.MONGODB_DB_NAME]
    await cli.admin.command("ping")

    # old id -> name
    old_name = {}
    for d in json.loads((backup / "destination_picklists.json").read_text(encoding="utf-8")):
        old_name[str(d["_id"])] = d.get("name")
    async for d in db.destinations.find({}, {"name": 1}):   # legacy collection (untouched)
        old_name[str(d["_id"])] = d.get("name")
    print("old id -> name entries:", len(old_name))

    # name(lower) -> new id  (new destination picklists)
    new_by_name = {}
    dup = 0
    async for d in db.picklists.find({"picklist_type": "destination"}, {"name": 1}):
        k = (d.get("name") or "").lower()
        if k in new_by_name:
            dup += 1
        else:
            new_by_name[k] = str(d["_id"])
    print(f"new name -> id entries: {len(new_by_name)} (dup names skipped: {dup})")

    async def remap_collection(coll, snapshot_file):
        snap = json.loads((backup / snapshot_file).read_text(encoding="utf-8"))
        recs = upd = ids_in = ids_out = unresolved = 0
        for row in snap:
            recs += 1
            old_ids = (row.get("industry_data") or {}).get("destination_ids") or []
            ids_in += len(old_ids)
            names, new_ids = [], []
            for oid in old_ids:
                nm = old_name.get(str(oid))
                if not nm:
                    unresolved += 1
                    continue
                nid = new_by_name.get(nm.lower())
                if not nid:
                    unresolved += 1
                    continue
                if nid not in new_ids:
                    new_ids.append(nid)
                    names.append(nm)
            ids_out += len(new_ids)
            if apply and new_ids:
                await db[coll].update_one(
                    {"_id": ObjectId(row["_id"])},
                    {"$set": {"industry_data.destination_ids": new_ids,
                              "industry_data.destinations": names}},
                )
                upd += 1
        print(f"  {coll}: records={recs} ids_in={ids_in} ids_remapped={ids_out} "
              f"unresolved={unresolved} updated={upd if apply else '(dry-run)'}")

    print("\nRemapping:")
    await remap_collection("opportunities", "opportunities_destination_ids.json")
    await remap_collection("leads", "leads_destination_ids.json")
    if not apply:
        print("\nDRY-RUN only. Re-run with --apply to write.")
    cli.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--backup", required=True, help="path to tutterfly_geo_backup_* dir")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    asyncio.run(main(Path(args.backup), apply=args.apply))
