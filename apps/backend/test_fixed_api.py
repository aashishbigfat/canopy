import asyncio
import sys
import os

# Add app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.mongodb import init_db
from app.services.lead_service import LeadService
from beanie import PydanticObjectId

async def test_fixed_api():
    """Test fixed sales stages API"""
    await init_db()
    
    print("🔍 Testing fixed sales stages API...")
    
    service = LeadService()
    tenant_id = PydanticObjectId()
    
    # Test leads API metadata
    result = await service.get_leads_with_metadata(tenant_id=tenant_id, page=1, per_page=10)
    
    sales_stages = result.get('sales_stages', [])
    print(f'Sales stages after fix: {len(sales_stages)}')
    
    for stage in sales_stages:
        print(f'  - {stage.get("name", "N/A")} (ID: {stage.get("id", "N/A")}, Default: {stage.get("is_default", "N/A")})')
    
    print('\n✅ API test complete!')

if __name__ == '__main__':
    asyncio.run(test_fixed_api())
