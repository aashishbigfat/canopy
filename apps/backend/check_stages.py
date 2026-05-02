"""
Quick script to check what sales stages are in the DB
Run: python check_stages.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def main():
    from app.db.mongodb import init_db
    from app.models.opportunity_picklists import SalesStage
    
    await init_db()
    
    all_stages = await SalesStage.find().to_list()
    print(f"\n=== Total stages in DB: {len(all_stages)} ===\n")
    for s in all_stages:
        print(f"  Name: {s.name!r:20s} | tenant_id: {str(s.tenant_id):30s} | is_active: {s.is_active} | is_won: {s.is_won} | is_lost: {s.is_lost} | sorting: {s.sorting}")

asyncio.run(main())
