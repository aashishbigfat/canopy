"""Trigger re-seeding by calling the API with proper auth."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId
from app.core.config import settings
from app.models.consolidated_fields import StandardField
from app.services.field_registry_service import _seed_defaults_if_empty

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    await init_beanie(database=db, document_models=[StandardField])
    
    # Get the first tenant_id from users collection
    user = await db.users.find_one({})
    if not user:
        print("No users found!")
        return
    
    tenant_id = user["tenant_id"]
    print(f"Using tenant_id: {tenant_id}")
    
    entities = ['account', 'contact', 'lead', 'opportunity', 'supplier', 'personal_account', 'task']
    
    for entity in entities:
        result = await _seed_defaults_if_empty(entity, tenant_id)
        count = await StandardField.find(
            {"tenant_id": tenant_id, "entity_type": entity, "is_custom": False}
        ).count()
        print(f"  {entity:20s}: seeded={result}, count={count}")
    
    client.close()

asyncio.run(main())
