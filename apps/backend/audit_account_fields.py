"""Audit: Dump all standard fields for account and personal_account from the DB."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    for entity in ["account", "personal_account"]:
        print(f"\n{'='*60}")
        print(f"  {entity.upper()} STANDARD FIELDS")
        print(f"{'='*60}")
        cursor = db.field_registry.find(
            {"entity_type": entity, "is_custom": False},
            {"field_key": 1, "label": 1, "field_type": 1, "is_active": 1, "is_mandatory": 1, "system_mandatory": 1, "sorting": 1}
        ).sort("sorting", 1)
        
        count = 0
        async for doc in cursor:
            count += 1
            active = "ON " if doc.get("is_active") else "OFF"
            mand = "MAND" if doc.get("is_mandatory") else "    "
            sys_m = "SYS" if doc.get("system_mandatory") else "   "
            fk = doc.get("field_key", "?")
            label = doc.get("label", "?")
            ft = doc.get("field_type", "?")
            print(f"  {count:2d}. [{active}] [{mand}] [{sys_m}]  {fk:25s} {label:25s} ({ft})")
        
        if count == 0:
            print("  (no fields found)")
    
    client.close()

asyncio.run(main())
