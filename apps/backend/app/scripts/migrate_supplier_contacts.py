"""
One-time migration script: Move supplier contacts from embedded arrays
to the new standalone `supplier_contacts` collection.

Usage:
    cd apps/backend
    python -m app.scripts.migrate_supplier_contacts
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone


async def migrate():
    from app.core.config import settings
    import certifi

    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        ssl=True,
        tls=True,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=False,
    )
    db = client[settings.MONGODB_DB_NAME]

    suppliers_col = db["suppliers"]
    contacts_col = db["supplier_contacts"]

    # Find all suppliers that still have a non-empty embedded contacts array
    cursor = suppliers_col.find({"contacts": {"$exists": True, "$ne": []}})

    migrated_total = 0
    supplier_count = 0

    async for supplier in cursor:
        supplier_id = supplier["_id"]
        tenant_id = supplier.get("tenant_id")
        contacts = supplier.get("contacts", [])

        if not contacts:
            continue

        supplier_count += 1

        for contact in contacts:
            now = datetime.now(timezone.utc)
            doc = {
                "supplier_id": supplier_id,
                "tenant_id": tenant_id,
                "name": contact.get("name", "Unknown"),
                "designation": contact.get("designation"),
                "department": contact.get("department"),
                "email": contact.get("email"),
                "phone": contact.get("phone"),
                "mobile": contact.get("mobile"),
                "is_primary": contact.get("is_primary", False),
                "is_active": contact.get("is_active", True),
                "notes": contact.get("notes"),
                "created_at": contact.get("created_at", now),
                "updated_at": contact.get("updated_at", now),
                "deleted_at": None,
            }
            await contacts_col.insert_one(doc)
            migrated_total += 1

        # Remove the embedded contacts array from the supplier document
        await suppliers_col.update_one(
            {"_id": supplier_id},
            {"$unset": {"contacts": ""}}
        )

    print(f"Migration complete: {migrated_total} contacts migrated from {supplier_count} suppliers")

    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
