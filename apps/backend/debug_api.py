import asyncio
import sys
import os

# Add app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.mongodb import init_db
from app.services.lead_service import LeadService
from app.models.opportunity_picklists import SalesStage
from beanie import PydanticObjectId

async def debug_api():
    """Debug API endpoints"""
    await init_db()
    
    print("🔍 Debugging API endpoints...")
    
    # Test with different tenant IDs
    tenant_id = PydanticObjectId()
    
    # 1. Test direct SalesStage query
    print("\n1. Testing direct SalesStage query:")
    all_stages = await SalesStage.find().to_list()
    print(f"   Total stages: {len(all_stages)}")
    print(f"   Active stages: {len([s for s in all_stages if s.is_active])}")
    
    # 2. Test tenant-specific query
    print("\n2. Testing tenant-specific query:")
    tenant_stages = await SalesStage.find(SalesStage.tenant_id == tenant_id, SalesStage.is_active == True).to_list()
    print(f"   Tenant stages: {len(tenant_stages)}")
    
    # 3. Test global query
    print("\n3. Testing global query:")
    global_stages = await SalesStage.find(SalesStage.tenant_id == None, SalesStage.is_active == True).to_list()
    print(f"   Global stages: {len(global_stages)}")
    
    # 4. Test LeadService
    print("\n4. Testing LeadService:")
    service = LeadService()
    
    # Test with a real tenant ID
    test_tenant = PydanticObjectId()
    
    # Create a test stage with tenant
    test_stage = SalesStage(
        name="Test Stage",
        probability=50,
        is_active=True,
        is_default=False,
        tenant_id=test_tenant
    )
    await test_stage.insert()
    print(f"   Created test stage with tenant: {test_stage.id}")
    
    # Test API call
    result = await service.get_leads_with_metadata(tenant_id=test_tenant, page=1, per_page=10)
    sales_stages = result.get('sales_stages', [])
    print(f"\n5. LeadService API result:")
    print(f"   Sales stages returned: {len(sales_stages)}")
    for stage in sales_stages:
        print(f"   - {stage.get('name', 'N/A')} (ID: {stage.get('id', 'N/A')})")
    
    # Test with original tenant
    original_tenant = PydanticObjectId("69971c2ad38db322ce70624d")
    result2 = await service.get_leads_with_metadata(tenant_id=original_tenant, page=1, per_page=10)
    sales_stages2 = result2.get('sales_stages', [])
    print(f"\n6. LeadService with original tenant:")
    print(f"   Sales stages returned: {len(sales_stages2)}")
    
    # Clean up
    await test_stage.delete()
    print("\n✅ Cleanup complete!")

if __name__ == "__main__":
    asyncio.run(debug_api())
