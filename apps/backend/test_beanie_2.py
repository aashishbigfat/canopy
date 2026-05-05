import asyncio
from app.db.mongodb import init_db
from app.models.picklists import Industry
from dotenv import load_dotenv

load_dotenv()
async def main():
    await init_db()
    count = await Industry.find().count()
    print("Industry count using app.models.picklists.Industry:", count)

asyncio.run(main())
