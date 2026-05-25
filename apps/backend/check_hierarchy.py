"""Quick check: how many hierarchy nodes exist for the first tenant?"""
import asyncio, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.role import RoleHierarchy
from app.models.user import User
from app.models.tenant import Tenant

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[RoleHierarchy, User, Tenant])
    t = await Tenant.find_one()
    nodes = await RoleHierarchy.find({"tenant_id": t.id, "deleted_at": None}).to_list()
    print(f"Total hierarchy nodes: {len(nodes)}")
    for n in nodes:
        print(f"  {n.name} (level={n.level})")

asyncio.run(check())
