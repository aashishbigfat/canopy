import asyncio
from redis.asyncio import Redis

async def clear_cache():
    try:
        redis = Redis(host='localhost', port=6379, db=0)
        await redis.flushdb()
        print("Redis cache flushed successfully")
        await redis.close()
    except Exception as e:
        print(f"Error flushing cache: {e}")

if __name__ == "__main__":
    asyncio.run(clear_cache())
