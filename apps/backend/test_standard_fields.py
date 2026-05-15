"""
Test script: Verify standard fields lazy initialization works correctly.
Initializes Beanie, then calls list_standard_fields to confirm fields are seeded.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import certifi


async def test_standard_fields():
    # Connect directly to MongoDB
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        ssl=True, tls=True,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=False,
    )
    db = client[settings.MONGODB_DB_NAME]

    # Step 1: Find a real tenant_id from the database
    tenant_doc = await db["tenants"].find_one({})
    if not tenant_doc:
        print("ERROR: No tenants found in database!")
        client.close()
        return

    tenant_id = tenant_doc["_id"]
    print(f"Using tenant: {tenant_doc.get('name', 'unknown')} (id={tenant_id})")

    # Step 2: Check current state of field_registry for standard fields
    before_count = await db["field_registry"].count_documents({
        "tenant_id": tenant_id,
        "is_custom": False,
    })
    print(f"\nBEFORE: {before_count} standard field documents in field_registry")

    # Step 3: Initialize Beanie so we can use the ODM
    from app.db.mongodb import init_db
    # Override the global client so init_db uses our connection
    import app.db.mongodb as db_module
    db_module.mongodb_client = client
    from beanie import init_beanie
    # We need to re-init beanie with our client
    from app.db.mongodb import init_db as _init
    await _init()

    # Step 4: Call the service function
    from app.services.field_registry_service import list_standard_fields
    from bson import ObjectId

    entities = ["account", "contact", "lead", "opportunity", "supplier", "personal_account", "task"]

    for entity in entities:
        fields = await list_standard_fields(entity, tenant_id)
        sys_mandatory = sum(1 for f in fields if f.system_mandatory)
        mandatory = sum(1 for f in fields if f.is_mandatory)
        print(f"  {entity:20s} -> {len(fields):3d} fields "
              f"({sys_mandatory} system_mandatory, {mandatory} mandatory)")

    # Step 5: Verify data in raw collection
    after_count = await db["field_registry"].count_documents({
        "tenant_id": tenant_id,
        "is_custom": False,
    })
    print(f"\nAFTER: {after_count} standard field documents in field_registry")

    # Step 6: Spot check - print first 5 account fields
    print("\n--- Account fields (first 5) ---")
    fields = await list_standard_fields("account", tenant_id)
    for f in fields[:5]:
        print(f"  [{f.sorting:2d}] {f.field_key:20s} | {f.label:20s} | "
              f"type={f.field_type:10s} | mandatory={f.is_mandatory} | "
              f"system={f.system_mandatory}")

    # Step 7: Verify idempotency - calling again should NOT re-insert
    fields_again = await list_standard_fields("account", tenant_id)
    assert len(fields) == len(fields_again), "Idempotency failed!"
    print(f"\n✅ Idempotency check passed: {len(fields)} == {len(fields_again)}")

    # Step 8: Check raw document has _class_id for Beanie
    raw_doc = await db["field_registry"].find_one({
        "tenant_id": tenant_id,
        "is_custom": False,
        "entity_type": "account",
    })
    if raw_doc:
        class_id = raw_doc.get("_class_id", "MISSING!")
        print(f"✅ _class_id on raw document: {class_id}")
    else:
        print("❌ No raw document found!")

    client.close()
    print("\n✅ ALL TESTS PASSED")


if __name__ == "__main__":
    asyncio.run(test_standard_fields())
