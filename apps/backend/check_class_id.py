import asyncio
from app.db.mongodb import init_db
from app.models.consolidated_picklists import Industry

async def main():
    await init_db()
    print("class_id expected by Beanie:", Industry.get_settings().class_id)

asyncio.run(main())
