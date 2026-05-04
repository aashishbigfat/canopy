"""
Seed missing picklist data into the consolidated 'picklists' collection
for ALL existing tenants based on their industry type.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from bson import ObjectId
from datetime import datetime

# Import seed data from existing scripts
from app.scripts.seed_travel import TRAVEL_SEED
from app.scripts.seed_healthcare import HEALTHCARE_SEED
from app.scripts.seed_education import EDUCATION_SEED
from app.scripts.seed_manufacturing import MANUFACTURING_SEED


INDUSTRY_SEEDS = {
    "travel": TRAVEL_SEED,
    "healthcare": HEALTHCARE_SEED,
    "education": EDUCATION_SEED,
    "manufacturing": MANUFACTURING_SEED,
}

# Mapping: seed key -> (picklist_type, class_name)
SEED_KEY_MAP = {
    "lead_statuses": ("lead_status", "LeadStatus"),
    "sources": ("source", "Source"),
    "source_mediums": ("source_medium", "SourceMedium"),
    "sales_stages": ("sales_stage", "SalesStage"),
    "experiences": ("experience", "Experience"),
    "industries": ("industry", "Industry"),
}

COLORS_DEFAULT = ["#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#F97316", "#6B7280"]


async def seed_consolidated():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    now = datetime.utcnow()

    # Get all tenants
    tenants = await db["tenants"].find().to_list(100)
    
    for tenant in tenants:
        tid = tenant["_id"]
        industry = tenant.get("industry", "").lower().strip()
        company = tenant.get("company_name", "Unknown")
        
        if industry not in INDUSTRY_SEEDS:
            print(f"[SKIP] {company} (id={tid}) - industry '{industry}' has no seed data")
            continue
        
        seed_data = INDUSTRY_SEEDS[industry]
        print(f"\n[SEED] {company} (id={tid}, industry={industry})")
        
        for seed_key, values in seed_data.items():
            if seed_key not in SEED_KEY_MAP:
                continue
            
            picklist_type, class_name = SEED_KEY_MAP[seed_key]
            seeded = 0
            
            for i, name in enumerate(values):
                # Check if already exists
                existing = await db["picklists"].find_one({
                    "picklist_type": picklist_type,
                    "name": name,
                    "tenant_id": tid,
                })
                if existing:
                    continue
                
                doc = {
                    "name": name,
                    "picklist_type": picklist_type,
                    "tenant_id": tid,
                    "sorting": i * 10 if seed_key == "lead_statuses" else i,
                    "is_active": True,
                    "is_default": i == 0,
                    "description": None,
                    "created_at": now,
                    "updated_at": now,
                    "_class_id": f"BasePicklist.{class_name}",
                }
                
                # Type-specific fields
                if seed_key == "lead_statuses":
                    doc["color"] = COLORS_DEFAULT[i % len(COLORS_DEFAULT)]
                elif seed_key == "sales_stages":
                    doc["probability"] = (i + 1) * 15
                    won_names = ["Closed Won", "Completed", "Enrolled", "Delivered"]
                    lost_names = ["Closed Lost", "Lost", "Withdrawn", "Rejected"]
                    doc["is_won"] = name in won_names
                    doc["is_lost"] = name in lost_names
                
                await db["picklists"].insert_one(doc)
                seeded += 1
            
            if seeded > 0:
                print(f"  {seed_key} -> {picklist_type}: seeded {seeded} new entries")
    
    # Final count
    total = await db["picklists"].count_documents({})
    print(f"\n[DONE] Total picklists: {total}")
    types = await db["picklists"].distinct("picklist_type")
    for pt in sorted(types):
        c = await db["picklists"].count_documents({"picklist_type": pt})
        print(f"  {pt}: {c}")
    
    client.close()


if __name__ == "__main__":
    print("[SEED] Seeding missing picklist data into consolidated collection...")
    asyncio.run(seed_consolidated())
