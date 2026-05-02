import asyncio
import httpx
import json

async def test():
    async with httpx.AsyncClient() as client:
        # We need a token. Better to just query the DB to see if the log was created.
        pass

if __name__ == "__main__":
    asyncio.run(test())
