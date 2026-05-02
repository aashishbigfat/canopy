import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from bson import ObjectId
import json

from app.models.activity_log import ActivityLog
from app.models.task import Task
from app.models.user import User
from app.services.task_service import TaskService
from app.schemas.task import TaskCreate

async def test_create_task():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tutterfly
    await init_beanie(database=db, document_models=[ActivityLog, Task, User])
    
    # Get any valid user
    user = await User.find_one()
    if not user:
        print("No user found")
        return
        
    print(f"Using user: {user.name} ({user.id})")
    
    # Test TaskService (which uses ActivityMixin)
    service = TaskService()
    
    # Fake a request context using the mixin methods manually if needed
    # Or just let it skip. Wait, if request_context is None, it skips!
    # Let's set it.
    service.request_context = {
        'ip_address': '127.0.0.1',
        'user_agent': 'test',
        'user_id': user.id,
        'user_name': user.name,
        'user_email': user.email,
        'tenant_id': user.tenant_id,
        'timestamp': user.created_at
    }
    
    task_data = TaskCreate(
        name="Test Task from Script",
        description="Testing activity logs",
        taskable_type="Lead",
        taskable_id=str(ObjectId()),
        assigned_user_id=str(user.id)
    )
    
    try:
        task = await service.create_task(task_data, user.id, user.tenant_id)
        print("Task created:", task.id)
        
        # Check logs again
        logs = await db.activity_logs.find().sort("created_at", -1).limit(5).to_list(length=5)
        print("--- RECENT ACTIVITY LOGS ---")
        for log in logs:
            print(f"[{log.get('created_at')}] User: {log.get('user_name')} | Action: {log.get('action')} | Type: {log.get('entity_type')} | ID: {log.get('entity_id')}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create_task())
