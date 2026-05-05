import asyncio
from app.db.mongodb import init_db
from app.models.consolidated_picklists import Industry, BasePicklist
from dotenv import load_dotenv

load_dotenv()
async def main():
    await init_db()
    c1 = await Industry.find().count()
    c2 = await BasePicklist.find().count()
    print(f'Industry count: {c1}')
    print(f'Base count: {c2}')

asyncio.run(main())
