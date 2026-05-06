"""
Seed data for Manufacturing industry tenants.
"""

from typing import Dict, List


MANUFACTURING_SEED: Dict[str, List[str]] = {
    "lead_statuses": [
        "New RFQ",
        "Quote Requested",
        "Sample Required",
        "Negotiation",
        "PO Received",
        "Lost",
    ],
    "sales_stages": [
        "RFQ Received",
        "Quote Sent",
        "Sample Approved",
        "PO Received",
        "In Production",
        "Delivered",
        "Lost",
    ],
    "sources": [
        "Trade Show",
        "Website",
        "Distributor",
        "Direct Sales",
        "Tender",
        "Referral",
        "Online Marketplace",
    ],
    "source_mediums": [
        "Phone Call",
        "Email",
        "Trade Show Booth",
        "WhatsApp",
        "Online RFQ Form",
        "Distributor",
        "Direct Sales Rep",
    ],
}


async def seed_manufacturing_tenant(tenant_id, db=None):
    """Seed default picklist data for a manufacturing tenant."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings
    from bson import ObjectId
    from datetime import datetime

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]
    tid = ObjectId(str(tenant_id))
    now = datetime.utcnow()

    colors = ["#3B82F6", "#F59E0B", "#8B5CF6", "#F97316", "#10B981", "#6B7280"]
    for i, name in enumerate(MANUFACTURING_SEED["lead_statuses"]):
        existing = await database["picklists"].find_one({"name": name, "tenant_id": tid, "picklist_type": "lead_status"})
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "lead_status",
                "name": name,
                "color": colors[i % len(colors)],
                "sorting": i * 10,
                "is_active": True,
                "is_default": i == 0,
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    for i, name in enumerate(MANUFACTURING_SEED["sources"]):
        existing = await database["picklists"].find_one({"name": name, "tenant_id": tid, "picklist_type": "source"})
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "source",
                "name": name,
                "sorting": i,
                "is_active": True,
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    for i, name in enumerate(MANUFACTURING_SEED["sales_stages"]):
        existing = await database["picklists"].find_one({"name": name, "tenant_id": tid, "picklist_type": "sales_stage"})
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "sales_stage",
                "name": name,
                "probability": (i + 1) * 12,
                "sorting": i,
                "is_active": True,
                "is_default": i == 0,
                "is_won": name == "Delivered",
                "is_lost": name == "Lost",
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    # Seed Source Mediums (has tenant_id)
    for i, name in enumerate(MANUFACTURING_SEED["source_mediums"]):
        existing = await database["picklists"].find_one({"name": name, "tenant_id": tid, "picklist_type": "source_medium"})
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "source_medium",
                "name": name,
                "sorting": i,
                "is_active": True,
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    client.close()
    print(f"  [SEED] Manufacturing picklists seeded for tenant {tenant_id}")
