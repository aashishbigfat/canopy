"""
Seed data for Travel industry tenants.
"""

from typing import Dict, List


TRAVEL_SEED: Dict[str, List[str]] = {
    "lead_statuses": [
        "Open",
        "Contacted",
        "Qualified",
        "Unqualified",
    ],
    "sales_stages": [
        "Prospecting",
        "Qualification",
        "Proposal Sent",
        "Negotiation",
        "Closed Won",
        "Closed Lost",
    ],
    "sources": [
        "Instagram",
        "Facebook",
        "Google",
        "Get a Call",
        "Enquire no",
        "Organic",
        "Manual",
        "Gmail",
        "Landline",
        "Whatsapp",
        "EMT",
        "Double Click Whatsapp",
        "TIYA",
        "Website Chatbot",
        "Visa",
        "AC",
    ],
    "source_mediums": [
        "Phone Call",
        "WhatsApp",
        "Email",
        "Walk-in",
        "Website Chat",
        "Social Media DM",
        "Travel Fair",
        "Agency Referral",
    ],
    "experiences": [
        "Budget",
        "Standard",
        "Luxury",
        "Ultra-Luxury",
        "Adventure",
        "Honeymoon",
        "Family",
    ],
    "industries": [
        "Agriculture", "Apparel", "Banking", "Chemicals", "Communications",
        "Construction", "Consulting", "Education", "Electronics", "Energy",
        "Engineering", "Environmental", "Finance", "Food & Beverage", "Government",
        "Healthcare", "Hospitality", "Insurance", "Machinery", "Manufacturing",
        "Media", "Not For Profit", "Other", "Recreation", "Retail", "Shipping",
        "Technology", "Telecommunications", "Transportation", "Travel", "Utilities",
        "Law Firm", "Event Management"
    ],
}


async def seed_travel_tenant(tenant_id, db=None):
    """Seed default picklist data for a travel tenant."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings
    from bson import ObjectId
    from datetime import datetime

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]
    tid = ObjectId(str(tenant_id))
    now = datetime.utcnow()

    # Seed Lead Statuses — tenant-scoped
    colors = ["#3B82F6", "#10B981", "#8B5CF6", "#EF4444"]
    for i, name in enumerate(TRAVEL_SEED["lead_statuses"]):
        existing = await database["picklists"].find_one({"name": name, "tenant_id": tid, "picklist_type": "lead_status"})
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "lead_status",
                "name": name,
                "color": colors[i % len(colors)],
                "sorting": i * 10,
                "is_active": True,
                "is_default": name == "Open",
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    # Seed Sources (has tenant_id)
    for i, name in enumerate(TRAVEL_SEED["sources"]):
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

    # Seed Sales Stages (has tenant_id)
    for i, name in enumerate(TRAVEL_SEED["sales_stages"]):
        existing = await database["picklists"].find_one({"name": name, "tenant_id": tid, "picklist_type": "sales_stage"})
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "sales_stage",
                "name": name,
                "probability": (i + 1) * 15,
                "sorting": i,
                "is_active": True,
                "is_default": i == 0,
                "is_won": name == "Closed Won",
                "is_lost": name == "Closed Lost",
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    # Seed Industries (has tenant_id)
    for i, name in enumerate(TRAVEL_SEED["industries"]):
        existing = await database["picklists"].find_one({"name": name, "tenant_id": tid, "picklist_type": "industry"})
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "industry",
                "name": name,
                "sorting": i,
                "is_active": True,
                "tenant_id": tid,
            })

    # Seed Source Mediums (has tenant_id)
    for i, name in enumerate(TRAVEL_SEED["source_mediums"]):
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

    # Seed Experiences (travel-specific: Budget, Luxury, etc.)
    for i, name in enumerate(TRAVEL_SEED["experiences"]):
        existing = await database["picklists"].find_one({"name": name, "tenant_id": tid, "picklist_type": "experience"})
        if not existing:
            await database["picklists"].insert_one({
                "picklist_type": "experience",
                "name": name,
                "sorting": i,
                "is_active": True,
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    client.close()
    print(f"  [SEED] Travel picklists seeded for tenant {tenant_id}")
