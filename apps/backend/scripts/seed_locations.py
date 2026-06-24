"""
Re-seed the geographic master data (countries / states / cities) and the
travel **destination picklist** from the authoritative SQL dumps shipped by
the data team in ``docs/locations/*.sql``.

WHY
---
The geo collections that were seeded from a different open dataset don't line
up with the data team's country ids, and every travel destination picklist had
an EMPTY ``country`` field — i.e. destinations were not mapped to countries.
This script wipes and re-seeds all four data sets *from one consistent source*
so the cross-table mapping is exact:

    states.country_id  -> countries._id
    cities.state_id    -> states._id
    cities.country_id  -> countries._id
    destination.country (name) <- countries (resolved from the SQL FK)

SAFETY
------
* Defaults to ``--dry-run``: parses + validates + prints a full report and
  touches NOTHING in the database.  You must pass ``--apply`` to write.
* ``--apply`` first writes a JSON backup of every collection it will modify
  (plus a snapshot of opportunity/lead ``destination_ids``) to
  ~/tutterfly_geo_backup_<timestamp>/ so the change is recoverable.
* Country ``phone_code`` / ``capital`` / ``is_popular`` (absent from the SQL)
  are carried over from the existing rows, matched by ISO-2 code, so nothing
  regresses.
* Destinations are seeded into the LIVE store the app reads — the ``picklists``
  collection (picklist_type='destination') — scoped to the single travel tenant.
  The legacy ``destinations`` collection is intentionally left untouched.

Run from apps/backend:
    python scripts/seed_locations.py            # dry-run (safe, no writes)
    python scripts/seed_locations.py --apply     # perform the re-seed
"""
import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

SQL_DIR = Path(__file__).resolve().parents[3] / "docs" / "locations"
CITY_BATCH = 5000


# ───────────────────────── SQL dump parser ──────────────────────────────────
def _skip_ws(s: str, i: int) -> int:
    while i < len(s) and s[i] in " \t\r\n":
        i += 1
    return i


def _parse_tuple(s: str, i: int):
    """Parse one ``(v1, v2, ...)`` tuple starting at s[i] == '('.

    Returns (list_of_values, next_index).  Quoted values are returned as
    unescaped strings; NULL becomes None; bare numbers stay as strings.
    """
    assert s[i] == "(", f"expected '(' at {i}, got {s[i]!r}"
    i += 1
    fields = []
    while True:
        i = _skip_ws(s, i)
        if s[i] == "'":
            i += 1
            buf = []
            while True:
                c = s[i]
                if c == "\\":                     # backslash escape (\' \" \\ ...)
                    buf.append(s[i + 1])
                    i += 2
                    continue
                if c == "'":
                    if i + 1 < len(s) and s[i + 1] == "'":   # doubled '' -> '
                        buf.append("'")
                        i += 2
                        continue
                    i += 1
                    break
                buf.append(c)
                i += 1
            fields.append("".join(buf))
        else:                                     # bare literal: number / NULL
            buf = []
            while s[i] not in ",)":
                buf.append(s[i])
                i += 1
            tok = "".join(buf).strip()
            fields.append(None if tok.upper() == "NULL" else tok)
        i = _skip_ws(s, i)
        if s[i] == ",":
            i += 1
            continue
        if s[i] == ")":
            i += 1
            break
    return fields, i


def parse_sql(path: Path, table: str):
    """Return (columns, rows) where rows is a list of dicts keyed by column."""
    import re

    text = path.read_text(encoding="utf-8")
    header_re = re.compile(r"INSERT INTO `%s` \(([^)]*)\) VALUES" % re.escape(table))
    first = header_re.search(text)
    if not first:
        raise RuntimeError(f"No INSERT for `{table}` found in {path.name}")
    columns = [c.strip().strip("`") for c in first.group(1).split(",")]

    rows = []
    for hm in header_re.finditer(text):
        i = _skip_ws(text, hm.end())
        while i < len(text):
            if text[i] == ";":
                break
            if text[i] != "(":
                i = _skip_ws(text, i)
                if i >= len(text) or text[i] in ";":
                    break
            vals, i = _parse_tuple(text, i)
            rows.append(dict(zip(columns, vals)))
            i = _skip_ws(text, i)
            if i < len(text) and text[i] == ",":
                i += 1
                continue
            if i < len(text) and text[i] == ";":
                break
    return columns, rows


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ───────────────────────────── main ─────────────────────────────────────────
async def main(apply: bool):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print("=" * 70)
    print(f"SEED LOCATIONS - mode: {'APPLY (writes!)' if apply else 'DRY-RUN (no writes)'}")
    print("=" * 70)

    # 1. Parse the four SQL dumps ------------------------------------------------
    print("\n[1/6] Parsing SQL dumps from", SQL_DIR)
    _, countries = parse_sql(SQL_DIR / "countries.sql", "countries")
    _, states = parse_sql(SQL_DIR / "states.sql", "states")
    _, cities = parse_sql(SQL_DIR / "cities.sql", "cities")
    _, destinations = parse_sql(SQL_DIR / "destinations.sql", "destinations")
    print(f"      countries={len(countries)}  states={len(states)}  "
          f"cities={len(cities)}  destinations={len(destinations)}")

    # 2. Validate referential integrity of the SQL itself -----------------------
    print("\n[2/6] Validating SQL referential integrity")
    country_sqlids = {c["id"] for c in countries}
    state_sqlids = {s["id"] for s in states}
    country_name_by_sqlid = {c["id"]: c["name"] for c in countries}

    orphan_states = [s for s in states if s["country_id"] not in country_sqlids]
    orphan_cities_c = [c for c in cities if c["country_id"] not in country_sqlids]
    orphan_cities_s = [c for c in cities if c["state_id"] not in state_sqlids]
    orphan_dests = [d for d in destinations if d["country_id"] not in country_sqlids]
    print(f"      orphan states (bad country_id):       {len(orphan_states)}")
    print(f"      orphan cities (bad country_id):       {len(orphan_cities_c)}")
    print(f"      orphan cities (bad state_id):         {len(orphan_cities_s)}")
    print(f"      destinations w/ unknown country_id:   {len(orphan_dests)}")

    # 3. Connect + show current DB state + resolve travel tenant ----------------
    print("\n[3/6] Connecting to DB:", settings.MONGODB_DB_NAME)
    cli = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000)
    db = cli[settings.MONGODB_DB_NAME]
    await cli.admin.command("ping")

    before = {
        "countries": await db.countries.count_documents({}),
        "states": await db.states.count_documents({}),
        "cities": await db.cities.count_documents({}),
        "destination_picklists": await db.picklists.count_documents({"picklist_type": "destination"}),
    }
    print("      current counts:", before)

    travel_tenants = await db.tenants.find({"industry": "travel"}).to_list(length=None)
    if len(travel_tenants) != 1:
        raise RuntimeError(
            f"Expected exactly one travel tenant, found {len(travel_tenants)}: "
            f"{[str(t['_id']) for t in travel_tenants]}. Aborting for safety."
        )
    travel_tid = travel_tenants[0]["_id"]
    print(f"      travel tenant: {travel_tid}")

    # Carry over fields the SQL lacks, matched by ISO-2 code.
    carry = {}
    async for c in db.countries.find({}, {"code": 1, "phone_code": 1, "capital": 1, "is_popular": 1}):
        if c.get("code"):
            carry[c["code"].upper()] = {
                "phone_code": c.get("phone_code"),
                "capital": c.get("capital"),
                "is_popular": bool(c.get("is_popular", False)),
            }
    print(f"      carry-over enrich rows (by ISO-2): {len(carry)}")

    if not apply:
        # Preview a few destination->country mappings to eyeball correctness.
        print("\n[DRY-RUN] sample destination -> country mappings:")
        for d in destinations[:6]:
            print(f"      {d['name']:<22} -> {country_name_by_sqlid.get(d['country_id'])}")
        print("\n[DRY-RUN] no changes written. Re-run with --apply to perform the re-seed.")
        cli.close()
        return

    # 4. Backup everything we are about to modify -------------------------------
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = Path.home() / f"tutterfly_geo_backup_{ts}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n[4/6] Backing up affected data -> {backup_dir}")

    def _dump(name, docs):
        with open(backup_dir / f"{name}.json", "w", encoding="utf-8") as f:
            json.dump(docs, f, default=str, ensure_ascii=False)
        print(f"      backed up {name}: {len(docs)}")

    _dump("countries", await db.countries.find({}).to_list(length=None))
    _dump("states", await db.states.find({}).to_list(length=None))
    _dump("cities", await db.cities.find({}).to_list(length=None))
    _dump("destination_picklists",
          await db.picklists.find({"picklist_type": "destination"}).to_list(length=None))
    _dump("opportunities_destination_ids", await db.opportunities.find(
        {"industry_data.destination_ids.0": {"$exists": True}},
        {"industry_data.destination_ids": 1}).to_list(length=None))
    _dump("leads_destination_ids", await db.leads.find(
        {"industry_data.destination_ids.0": {"$exists": True}},
        {"industry_data.destination_ids": 1}).to_list(length=None))

    # 5. Wipe + re-seed with consistent ObjectId mapping ------------------------
    print("\n[5/6] Wiping and re-seeding")
    await db.countries.delete_many({})
    await db.states.delete_many({})
    await db.cities.delete_many({})
    await db.picklists.delete_many({"picklist_type": "destination"})
    print("      wiped countries / states / cities / destination picklists")

    now = _now()

    # countries -------------------------------------------------------------
    country_oid = {}
    cdocs = []
    for c in countries:
        oid = ObjectId()
        country_oid[c["id"]] = oid
        extra = carry.get((c["iso_2"] or "").upper(), {})
        cdocs.append({
            "_id": oid, "created_at": now, "updated_at": now, "deleted_at": None,
            "name": c["name"], "code": c["iso_2"], "code3": c["iso_3"],
            "phone_code": extra.get("phone_code"),
            "currency": c.get("currency_code"),
            "currency_symbol": c.get("currency_symbol"),
            "continent": c.get("region_name") or None,
            "capital": extra.get("capital"),
            "is_active": True, "is_popular": extra.get("is_popular", False),
        })
    if cdocs:
        await db.countries.insert_many(cdocs, ordered=False)
    print(f"      inserted countries: {len(cdocs)}")

    # states ----------------------------------------------------------------
    state_oid = {}
    sdocs = []
    for s in states:
        coid = country_oid.get(s["country_id"])
        if not coid:
            continue
        oid = ObjectId()
        state_oid[s["id"]] = oid
        sdocs.append({
            "_id": oid, "created_at": now, "updated_at": now, "deleted_at": None,
            "name": s["name"], "code": None, "country_id": coid, "is_active": True,
        })
    if sdocs:
        await db.states.insert_many(sdocs, ordered=False)
    print(f"      inserted states: {len(sdocs)} (skipped {len(states) - len(sdocs)})")

    # cities ----------------------------------------------------------------
    n_city = skipped_city = 0
    batch = []

    async def _flush():
        nonlocal n_city, batch
        if batch:
            await db.cities.insert_many(batch, ordered=False)
            n_city += len(batch)
            batch = []

    for c in cities:
        coid = country_oid.get(c["country_id"])
        soid = state_oid.get(c["state_id"])
        if not coid or not soid:
            skipped_city += 1
            continue
        batch.append({
            "created_at": now, "updated_at": now, "deleted_at": None,
            "name": c["name"], "state_id": soid, "country_id": coid,
            "latitude": None, "longitude": None, "timezone": None,
            "is_active": True, "is_popular": False,
        })
        if len(batch) >= CITY_BATCH:
            await _flush()
            print(f"        cities inserted so far: {n_city}")
    await _flush()
    print(f"      inserted cities: {n_city} (skipped {skipped_city})")

    # destination picklists -------------------------------------------------
    ddocs = []
    unmapped = 0
    for idx, d in enumerate(sorted(destinations, key=lambda x: x["name"].lower())):
        cname = country_name_by_sqlid.get(d["country_id"])
        if cname is None:
            unmapped += 1
        ddocs.append({
            "name": d["name"], "description": None, "tenant_id": travel_tid,
            "sorting": idx, "is_active": True, "is_default": False,
            "picklist_type": "destination", "industry": "travel",
            "country": cname,
            "created_at": now, "updated_at": now,
        })
    if ddocs:
        await db.picklists.insert_many(ddocs, ordered=False)
    print(f"      inserted destination picklists: {len(ddocs)} "
          f"(country unmapped: {unmapped})")

    # 6. Verify -----------------------------------------------------------------
    print("\n[6/6] Verifying")
    after = {
        "countries": await db.countries.count_documents({}),
        "states": await db.states.count_documents({}),
        "cities": await db.cities.count_documents({}),
        "destination_picklists": await db.picklists.count_documents({"picklist_type": "destination"}),
        "destination_picklists_with_country": await db.picklists.count_documents(
            {"picklist_type": "destination", "country": {"$nin": [None, ""]}}),
    }
    print("      after counts:", after)

    # spot check a join: pick a known country and count its states/cities
    india = await db.countries.find_one({"code": "IN"})
    if india:
        ns = await db.states.count_documents({"country_id": india["_id"]})
        nc = await db.cities.count_documents({"country_id": india["_id"]})
        print(f"      India -> states={ns}, cities={nc}")
    dubai = await db.picklists.find_one({"picklist_type": "destination", "name": "Dubai"})
    if dubai:
        print(f"      destination 'Dubai' -> country={dubai.get('country')!r}, tenant={dubai.get('tenant_id')}")

    print(f"\nDONE. Backup at: {backup_dir}")
    cli.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="actually write (default is dry-run)")
    args = ap.parse_args()
    asyncio.run(main(apply=args.apply))
