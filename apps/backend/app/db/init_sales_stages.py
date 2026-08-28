"""
Initialize sales stages with correct probabilities
"""
import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from beanie import PydanticObjectId
from app.models.opportunity_picklists import SalesStage
from app.db.mongodb import init_db, get_database


async def create_sales_stages():
    """Create sales stages with correct probabilities"""
    # Initialize database first
    await init_db()
    
    # Define the sales stages with correct probabilities
    stages_data = [
        {
            "name": "Lead",
            "description": "Initial lead stage",
            "probability": 10,
            "color": "#6366f1",
            "sorting": 10,
            "is_active": True,
            "is_default": True,
            "is_won": False,
            "is_lost": False,
        },
        {
            "name": "Qualified",
            "description": "Qualified lead ready for proposal",
            "probability": 20,
            "color": "#8b5cf6",
            "sorting": 20,
            "is_active": True,
            "is_default": False,
            "is_won": False,
            "is_lost": False,
        },
        {
            "name": "Proposal",
            "description": "Proposal sent to client",
            "probability": 30,
            "color": "#06b6d4",
            "sorting": 30,
            "is_active": True,
            "is_default": False,
            "is_won": False,
            "is_lost": False,
        },
        {
            "name": "Closed Won",
            "description": "Deal successfully closed",
            "probability": 100,
            "color": "#10b981",
            "sorting": 40,
            "is_active": True,
            "is_default": False,
            "is_won": True,
            "is_lost": False,
        },
        {
            "name": "Closed Lost",
            "description": "Deal lost to competition or other reasons",
            "probability": 0,
            "color": "#ef4444",
            "sorting": 50,
            "is_active": True,
            "is_default": False,
            "is_won": False,
            "is_lost": True,
        },
        {
            "name": "Refunded",
            "description": "Deal refunded or cancelled",
            "probability": 0,
            "color": "#9ca3af",
            "sorting": 60,
            "is_active": True,
            "is_default": False,
            "is_won": False,
            "is_lost": True,
        },
    ]
    
    # Clear existing stages
    print("Clearing existing sales stages...")
    await SalesStage.delete_all()
    
    # Create new stages
    created_stages = []
    for stage_data in stages_data:
        stage = SalesStage(**stage_data)
        await stage.save()
        created_stages.append(stage)
        print(f"✅ Created sales stage: {stage.name} (probability: {stage.probability}%)")
    
    print(f"🎉 Successfully created {len(created_stages)} sales stages")
    return created_stages


async def main():
    """Main function to run the initialization"""
    print("🚀 Initializing sales stages with probabilities: 10%, 20%, 30%, 100%, 0%")
    try:
        stages = await create_sales_stages()
        print("✅ Sales stages initialization completed successfully!")
        return stages
    except Exception as e:
        print(f"❌ Error initializing sales stages: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    asyncio.run(main())
