"""
Seed the global countries / states / cities reference collections from the
open dr5hn/countries-states-cities-database dataset (nested combined file).

SAFE BY DESIGN:
  * Non-destructive: only INSERTS missing rows. Never deletes or overwrites
    existing docs (so existing _ids that other data may reference stay valid).
  * Idempotent: dedups against what's already in the DB by natural keys
    (country=iso2 code, state=(country_id,name), city=(country_id,state_id,name)).
  * These collections are global reference data (no tenant_id), shared by all
    tenants. They already exist, so no new Mongo collection is created.

Run from apps/backend:  python scripts/seed_geo.py
Re-running is safe — it just tops up whatever is missing.
"""
import asyncio
import json
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

URL = ("https://raw.githubusercontent.com/dr5hn/countries-states-cities-database"
       "/master/json/countries+states+cities.json")
CACHE = Path(__file__).resolve().parent / "_geo_cache"
CITY_BATCH = 5000


def _load() -> list:
    CACHE.mkdir(exist_ok=True)
    dest = CACHE / "countries+states+cities.json"
    if not dest.exists() or dest.stat().st_size == 0:
        print(f"  downloading {URL} ...")
        urllib.request.urlretrieve(URL, dest)
    print(f"  loaded {dest.name} ({dest.stat().st_size // (1024*1024)} MB)")
    with open(dest, "r", encoding="utf-8") as f:
        return json.load(f)


def _f(v):
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _now():
    return datetime.utcnow()


async def main():
    db = AsyncIOMotorClient(settings.MONGODB_URL)[settings.MONGODB_DB_NAME]

    print("Counts BEFORE:",
          "countries", await db.countries.count_documents({}),
          "states", await db.states.count_documents({}),
          "cities", await db.cities.count_documents({}))

    print("Fetching dataset...")
    data = _load()
    print(f"dataset: {len(data)} countries (nested with states+cities)")

    # ── existing keys ─────────────────────────────────────────────────────────
    country_by_code = {c["code"]: c["_id"] async for c in db.countries.find({}, {"code": 1})}
    state_by_key = {}  # (country_oid_str, name_lower) -> state _id
    async for s in db.states.find({}, {"name": 1, "country_id": 1}):
        state_by_key[(str(s["country_id"]), (s["name"] or "").lower())] = s["_id"]
    print("loading existing city keys...")
    city_seen = set()  # (country_oid_str, state_oid_str_or_'', name_lower)
    async for c in db.cities.find({}, {"name": 1, "country_id": 1, "state_id": 1}):
        city_seen.add((str(c["country_id"]),
                       str(c["state_id"]) if c.get("state_id") else "",
                       (c["name"] or "").lower()))

    n_country = n_state = n_city = 0
    city_batch = []

    async def flush_cities():
        nonlocal n_city, city_batch
        if city_batch:
            await db.cities.insert_many(city_batch, ordered=False)
            n_city += len(city_batch)
            print(f"  cities inserted so far: {n_city}")
            city_batch = []

    for c in data:
        iso2 = c.get("iso2")
        if not iso2:
            continue
        # ── country ──
        coid = country_by_code.get(iso2)
        if not coid:
            phone = c.get("phonecode") or ""
            res = await db.countries.insert_one({
                "created_at": _now(), "updated_at": _now(), "deleted_at": None,
                "name": c.get("name"),
                "code": iso2,
                "code3": c.get("iso3"),
                "phone_code": (f"+{phone}" if phone and not str(phone).startswith("+") else (phone or None)),
                "currency": c.get("currency"),
                "currency_symbol": c.get("currency_symbol"),
                "continent": c.get("region") or None,
                "capital": c.get("capital") or None,
                "is_active": True, "is_popular": False,
            })
            coid = res.inserted_id
            country_by_code[iso2] = coid
            n_country += 1

        for s in c.get("states", []) or []:
            # ── state ──
            skey = (str(coid), (s.get("name") or "").lower())
            soid = state_by_key.get(skey)
            if not soid:
                res = await db.states.insert_one({
                    "created_at": _now(), "updated_at": _now(), "deleted_at": None,
                    "name": s.get("name"),
                    "code": s.get("state_code") or None,
                    "country_id": coid,
                    "is_active": True,
                })
                soid = res.inserted_id
                state_by_key[skey] = soid
                n_state += 1

            for ct in s.get("cities", []) or []:
                ckey = (str(coid), str(soid), (ct.get("name") or "").lower())
                if ckey in city_seen:
                    continue
                city_seen.add(ckey)
                city_batch.append({
                    "created_at": _now(), "updated_at": _now(), "deleted_at": None,
                    "name": ct.get("name"),
                    "state_id": soid,
                    "country_id": coid,
                    "latitude": _f(ct.get("latitude")),
                    "longitude": _f(ct.get("longitude")),
                    "timezone": None,
                    "is_active": True, "is_popular": False,
                })
                if len(city_batch) >= CITY_BATCH:
                    await flush_cities()
    await flush_cities()

    print(f"INSERTED -> countries: +{n_country}  states: +{n_state}  cities: +{n_city}")
    print("Counts AFTER:",
          "countries", await db.countries.count_documents({}),
          "states", await db.states.count_documents({}),
          "cities", await db.cities.count_documents({}))


if __name__ == "__main__":
    asyncio.run(main())
