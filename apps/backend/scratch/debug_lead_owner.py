import asyncio
import traceback
from bson import ObjectId
from app.db.mongodb import init_db
from app.services.lead_service import LeadService
from app.models.lead import Lead

async def debug():
    # 1. Init DB
    await init_db()
    print("DB initialized.")
    
    # 2. Get the lead we created in the test (or any lead)
    # The last ID was 6a1fdb75ef7a7ff202788fd6
    lead_id = "6a1fdb75ef7a7ff202788fd6"
    lead = await Lead.get(ObjectId(lead_id))
    if not lead:
        # Get first lead in DB
        lead = await Lead.find_one({})
        if not lead:
            print("No leads found in DB!")
            return
        lead_id = str(lead.id)
    
    print(f"Testing change_owner on lead: {lead_id} (current owner: {lead.owner_id})")
    
    # We want to change the owner. Let's find an active user to change it to.
    from app.models.user import User
    users = await User.find({"tenant_id": lead.tenant_id, "is_active": True}).to_list()
    other_user = next((u for u in users if u.id != lead.owner_id), None)
    if not other_user:
        print("No other active user found in tenant")
        return
        
    print(f"Changing owner to: {other_user.id} ({other_user.name})")
    
    service = LeadService()
    try:
        updated_lead = await service.change_owner(
            lead_id=lead_id,
            new_owner_id=other_user.id,
            current_user_id=lead.owner_id, # Just use the same user as modifier
            tenant_id=lead.tenant_id
        )
        print("Successfully changed owner! Lead owner_id:", updated_lead.owner_id)
    except Exception as e:
        print("FAIL! Raised Exception:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug())
