import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from bson import ObjectId

from app.models.activity_log import ActivityLog
from app.services.activity_log_service import ActivityLogService

async def test_log():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tutterfly
    await init_beanie(database=db, document_models=[ActivityLog])
    
    service = ActivityLogService()
    try:
        user_id = ObjectId()
        tenant_id = ObjectId()
        
        log = await service.log_activity(
            user_id=user_id,
            user_name="Test User",
            tenant_id=tenant_id,
            action="created",
            entity_type="Task",
            description="Test description"
        )
        print("SUCCESS! Log ID:", log.id)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_log())
