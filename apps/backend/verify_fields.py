"""Trigger lazy init for lead via the service layer, then verify."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import certifi

async def main():
    client = AsyncIOMotorClient(
        settings.MONGODB_URL, ssl=True, tls=True,
        tlsCAFile=certifi.where(),
    )
    db = client[settings.MONGODB_DB_NAME]
    
    # Init Beanie
    import app.db.mongodb as db_module
    db_module.mongodb_client = client
    from app.db.mongodb import init_db
    await init_db()
    
    tenant_doc = await db["tenants"].find_one({})
    tid = tenant_doc["_id"]
    
    from app.services.field_registry_service import list_standard_fields
    
    entities = ["account", "contact", "lead", "opportunity",
                "supplier", "personal_account", "task"]
    
    for e in entities:
        fields = await list_standard_fields(e, tid)
        sys_m = sum(1 for f in fields if f.system_mandatory)
        print(f"  {e:20s}: {len(fields):3d} fields ({sys_m} system_mandatory)")
    
    # Raw count
    total = await db["field_registry"].count_documents({
        "tenant_id": tid, "is_custom": False
    })
    print(f"\nTotal standard fields in DB: {total}")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
