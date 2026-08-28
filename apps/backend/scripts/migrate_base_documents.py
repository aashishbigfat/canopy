import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    from dotenv import load_dotenv
    load_dotenv()
    
    mongo_url = os.environ.get('MONGODB_URL') or os.environ.get('MONGO_URL') or 'mongodb://localhost:27017'
    db_name = os.environ.get('MONGODB_DB_NAME') or os.environ.get('DB_NAME') or 'tutterfly'
    
    print(f"Connecting to DB: {db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    docs = await db.BaseDocument.find().to_list(None)
    print(f"Found {len(docs)} stranded documents in BaseDocument collection")
    
    for doc in docs:
        if 'supplier_id' in doc:
            print(f"Migrating OpportunitySupplier {doc['_id']}")
            # Ensure it doesn't already exist
            existing = await db.opp_suppliers.find_one({'_id': doc['_id']})
            if not existing:
                await db.opp_suppliers.insert_one(doc)
            await db.BaseDocument.delete_one({'_id': doc['_id']})
            
        elif 'destination_id' in doc:
            if 'lead_id' in doc:
                print(f"Migrating DestinationLead {doc['_id']}")
                existing = await db.destination_leads.find_one({'_id': doc['_id']})
                if not existing:
                    await db.destination_leads.insert_one(doc)
                await db.BaseDocument.delete_one({'_id': doc['_id']})
            else:
                print(f"Migrating DestinationOpportunity {doc['_id']}")
                existing = await db.destination_opportunities.find_one({'_id': doc['_id']})
                if not existing:
                    await db.destination_opportunities.insert_one(doc)
                await db.BaseDocument.delete_one({'_id': doc['_id']})
                
        elif 'account_id' in doc and 'contact_id' in doc:
            print(f"Migrating AccountContact {doc['_id']}")
            existing = await db.account_contacts.find_one({'_id': doc['_id']})
            if not existing:
                await db.account_contacts.insert_one(doc)
            await db.BaseDocument.delete_one({'_id': doc['_id']})
            
        else:
            print(f"Unknown document structure for {doc['_id']}, leaving it alone")

    print("\nMigration complete!")
    
    remaining = await db.BaseDocument.count_documents({})
    print(f"Remaining in BaseDocument: {remaining}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
