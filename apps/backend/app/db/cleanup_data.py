"""
Clean up all data from leads, opportunities, contacts, and accounts
Preserves schemas/collections but deletes all records
"""
import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.contact import Contact
from app.models.account import Account
from app.models.opportunity_picklists import OpportunityHistory, OpportunityLock
from app.models.account_contact import AccountContact
from app.models.activity_log import ActivityLog, LoginLog
from app.models.note import Note
from app.models.task import Task
from app.models.event import Event
from app.models.email import Email
from app.db.mongodb import init_db


async def cleanup_all_data():
    """Delete all data from leads, opportunities, contacts, and accounts"""
    # Initialize database first
    await init_db()
    
    print("🧹 Starting comprehensive data cleanup...")
    
    # Collections to clean up (in dependency order)
    cleanup_tasks = [
        # Opportunity-related data
        ("Opportunity Histories", OpportunityHistory),
        ("Opportunity Locks", OpportunityLock),
        ("Opportunities", Opportunity),
        
        # Lead-related data
        ("Leads", Lead),
        
        # Contact and Account relationships
        ("Account Contacts", AccountContact),
        
        # Activities and Interactions
        ("Activity Logs", ActivityLog),
        ("Login Logs", LoginLog),
        ("Notes", Note),
        ("Tasks", Task),
        ("Events", Event),
        ("Emails", Email),
        
        # Main entities
        ("Contacts", Contact),
        ("Accounts", Account),
    ]
    
    deleted_counts = {}
    
    for collection_name, model in cleanup_tasks:
        try:
            # Count documents before deletion
            count = await model.count()
            if count > 0:
                # Delete all documents
                await model.delete_all()
                deleted_counts[collection_name] = count
                print(f"✅ Deleted {count:,} records from {collection_name}")
            else:
                print(f"ℹ️  No records found in {collection_name}")
                
        except Exception as e:
            print(f"❌ Error cleaning {collection_name}: {e}")
    
    # Summary
    total_deleted = sum(deleted_counts.values())
    print(f"\n🎉 Cleanup completed!")
    print(f"📊 Total records deleted: {total_deleted:,}")
    
    if deleted_counts:
        print("\n📋 Deleted records summary:")
        for collection, count in deleted_counts.items():
            print(f"  - {collection}: {count:,}")
    
    return deleted_counts


async def main():
    """Main function to run the cleanup"""
    force = "--force" in sys.argv
    
    if not force:
        print("⚠️  WARNING: This will delete ALL data from leads, opportunities, contacts, and accounts!")
        print("📋 Collections to be cleaned:")
        print("   - Leads")
        print("   - Opportunities") 
        print("   - Contacts")
        print("   - Accounts")
        print("   - Activity Logs, Notes, Tasks, Events, Emails")
        print("   - All related relationships and histories")
        print("\n🔒 Schemas/collections will be preserved")
        
        # Ask for confirmation
        confirm = input("\n❓ Are you sure you want to proceed? (type 'DELETE' to confirm): ")
        if confirm.upper() != 'DELETE':
            print("❌ Cleanup cancelled - confirmation not received")
            return None

    try:
        result = await cleanup_all_data()
        print("✅ Data cleanup completed successfully!")
        return result
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    asyncio.run(main())
