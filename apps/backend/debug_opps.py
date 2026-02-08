
import asyncio
import os
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
from bson import ObjectId
from app.db.mongodb import init_db
from app.services.opportunity_service import OpportunityService
from app.models.user import User

async def debug_opportunities():
    # Initialize DB
    await init_db()
    
    # Get a tenant and user
    user = await User.find_one({})
    if not user:
        print("No user found")
        return
        
    print(f"Using user: {user.email}, tenant: {user.tenant_id}")
    
    service = OpportunityService()
    try:
        # Build filters
        tenant_id = user.tenant_id
        page = 1
        per_page = 10
        
        # Get opportunities
        print("Fetching opportunities...")
        opportunities, total = await service.get_opportunities_by_tenant(
            tenant_id=tenant_id,
            skip=(page - 1) * per_page,
            limit=per_page
        )
        print(f"Found {total} opportunities")
        
        # Try to convert them to Response objects
        from app.schemas.opportunity import OpportunityResponse, OpportunityListResponse
        from app.models.opportunity_picklists import SalesStage, OpportunityType
        
        opportunity_responses = []
        for opp in opportunities:
            print(f"Processing opp: {opp.id}")
            sales_stage = None
            if opp.sales_stage_id:
                sales_stage = await SalesStage.get(opp.sales_stage_id)
            
            opportunity_type = None
            if opp.opportunity_type_id:
                opportunity_type = await OpportunityType.get(opp.opportunity_type_id)
            
            # Build response
            print("Calling from_orm...")
            opp_response = OpportunityResponse.from_orm(opp)
            if sales_stage:
                opp_response.sales_stage_name = sales_stage.name
            if opportunity_type:
                opp_response.opportunity_type_name = opportunity_type.name
                
            opportunity_responses.append(opp_response)
            
        print("Building final response...")
        final_response = OpportunityListResponse(
            opportunities=opportunity_responses,
            total=total,
            page=page,
            per_page=per_page,
            pages=(total + per_page - 1) // per_page
        )
        print("Successfully built final response!")
        
    except Exception as e:
        print(f"CAUGHT EXCEPTION: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_opportunities())
