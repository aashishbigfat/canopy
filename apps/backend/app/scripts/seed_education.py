"""
Seed data for Education industry tenants.

ARCHITECTURE:
  - Platform Defaults (tenant_id=None) are created by seed_platform_defaults.py
  - This script only seeds tenant-scoped items: SalesStage (which is
    auto-seeded per tenant because stages vary heavily between organizations).

For all other picklists (LeadStatus, Source, SourceMedium, etc.),
tenants inherit platform defaults automatically via the build_picklist_query
pattern: $or: [{tenant_id: current}, {tenant_id: None}]
"""


EDUCATION_SALES_STAGES = [
    "Inquiry",
    "Applied",
    "Under Review",
    "Accepted",
    "Enrolled",
    "Withdrawn",
    "Lost",
]


async def seed_education_tenant(tenant_id, db=None):
    """Seed tenant-specific data for a new education tenant.
    
    Only seeds SalesStages per-tenant. All other picklists are
    served from platform defaults (tenant_id=None).
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings
    from bson import ObjectId
    from datetime import datetime

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]
    tid = ObjectId(str(tenant_id))
    now = datetime.utcnow()

    for i, name in enumerate(EDUCATION_SALES_STAGES):
        existing = await database["picklists"].find_one({
            "name": name, "tenant_id": tid, "picklist_type": "sales_stage"
        })
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "sales_stage",
                "name": name,
                "probability": (i + 1) * 12,
                "sorting": i,
                "is_active": True,
                "is_default": i == 0,
                "is_won": name == "Enrolled",
                "is_lost": name in ("Withdrawn", "Lost"),
                "tenant_id": tid,
                "industry": "education",
                "created_at": now,
                "updated_at": now,
            })

    client.close()
    print(f"  [SEED] Education sales stages seeded for tenant {tenant_id}")
    print(f"  [INFO] All other picklists are served from platform defaults (tenant_id=None)")
