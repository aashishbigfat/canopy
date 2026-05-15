"""
Seed default picklist values for Salutation, TaskStatus, and TaskPriority.

These are platform-wide defaults (tenant_id=None) that ALL tenants inherit
automatically via the build_picklist_query pattern.

Usage:
    cd apps/backend
    python -m scripts.seed_new_picklists

Idempotent: skips types that already have platform-default entries.
"""
import asyncio
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.consolidated_picklists import (
    BasePicklist, Salutation, TaskStatus, TaskPriority,
    SalesStage, OpportunityType, Experience, OpportunityTag,
    LeadStatus, Source, SourceMedium,
    AccountType, Industry, AccountSource, SupplierServicePicklist,
)

SEED_DATA = {
    "salutation": {
        "model": Salutation,
        "items": [
            {"name": "Mr.", "sorting": 1},
            {"name": "Mrs.", "sorting": 2},
            {"name": "Ms.", "sorting": 3},
            {"name": "Dr.", "sorting": 4},
            {"name": "Prof.", "sorting": 5},
        ],
    },
    "task_status": {
        "model": TaskStatus,
        "items": [
            {"name": "Not Started", "sorting": 1, "is_default": True},
            {"name": "In Progress", "sorting": 2},
            {"name": "Completed", "sorting": 3},
            {"name": "Deferred", "sorting": 4},
        ],
    },
    "task_priority": {
        "model": TaskPriority,
        "items": [
            {"name": "Low", "sorting": 1},
            {"name": "Normal", "sorting": 2, "is_default": True},
            {"name": "High", "sorting": 3},
            {"name": "Urgent", "sorting": 4},
        ],
    },
}


async def main():
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        ssl=True, tls=True,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=False,
    )
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[
            BasePicklist, Salutation, TaskStatus, TaskPriority,
            SalesStage, OpportunityType, Experience, OpportunityTag,
            LeadStatus, Source, SourceMedium,
            AccountType, Industry, AccountSource, SupplierServicePicklist,
        ],
        recreate_views=False,
        allow_index_dropping=False,
    )

    for type_key, cfg in SEED_DATA.items():
        Model = cfg["model"]
        # Check if platform defaults already exist
        existing = await Model.find(
            {"picklist_type": type_key, "tenant_id": None}
        ).count()

        if existing > 0:
            print(f"  [SKIP] {type_key}: {existing} platform defaults already exist -- skipping")
            continue

        for item in cfg["items"]:
            doc = Model(
                name=item["name"],
                sorting=item.get("sorting", 0),
                is_default=item.get("is_default", False),
                is_active=True,
                tenant_id=None,  # Platform default
                industry=None,   # Global (all industries)
            )
            await doc.insert()
            print(f"  [OK] {type_key}: inserted '{item['name']}'")

    print("\n[DONE] Seed complete.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
