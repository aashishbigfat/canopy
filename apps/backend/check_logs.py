import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_logs():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tutterfly
    
    logs = await db.activity_logs.find().sort("created_at", -1).limit(5).to_list(length=5)
    
    print("--- RECENT ACTIVITY LOGS ---")
    for log in logs:
        print(f"[{log.get('created_at')}] User: {log.get('user_name')} | Action: {log.get('action')} | Type: {log.get('entity_type')} | ID: {log.get('entity_id')}")
        print(f"Desc: {log.get('description')}")
        print("-------------------")

if __name__ == "__main__":
    asyncio.run(check_logs())
