
import asyncio
import os
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from bson import ObjectId
from app.db.mongodb import init_db
from app.services.lead_service import LeadService
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import LeadConvert

async def debug_convert():
    await init_db()
    
    # Get a lead
    lead = await Lead.find_one({"is_converted": False})
    if not lead:
        print("No unconverted lead found")
        return
        
    # Get a user
    user = await User.find_one({})
    if not user:
        print("No user found")
        return
        
    print(f"Converting lead {lead.id} for user {user.email}")
    
    service = LeadService()
    try:
        conversion_data = LeadConvert(
            account_name="Test Account",
            contact_create=True,
            create_opportunity=True,
            opportunity_name="Test Opportunity",
            opportunity_amount=100.0,
            opportunity_close_date="2026-12-31"
        )
        
        print("Calling service.convert_lead...")
        result = await service.convert_lead(
            lead_id=str(lead.id),
            conversion_data=conversion_data,
            user_id=user.id,
            tenant_id=user.tenant_id
        )
        print("Conversion successful!")
        print(result)
        
    except Exception as e:
        print(f"CAUGHT EXCEPTION: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_convert())
