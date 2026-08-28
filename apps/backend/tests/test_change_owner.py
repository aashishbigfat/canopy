import asyncio
import httpx
import sys
import os

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1")

async def test_change_owner():
    print("Testing Change Owner endpoints...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Login
        login_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": "admin@tutterfly.com", "password": "admin1"}
        )
        if login_resp.status_code != 200:
            print(f"Login failed: {login_resp.status_code} -- {login_resp.text}")
            return False
            
        data = login_resp.json()
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in successfully.")

        # 2. Get active users list from form-data (e.g. suppliers/form-data)
        form_data_resp = await client.get(f"{BASE_URL}/suppliers/form-data", headers=headers)
        if form_data_resp.status_code != 200:
            print(f"Failed to fetch form data: {form_data_resp.status_code} -- {form_data_resp.text}")
            return False
        
        users = form_data_resp.json().get("users", [])
        if len(users) < 2:
            print(f"Need at least 2 active users for test, found: {len(users)}")
            return False
        
        admin_user = next((u for u in users if u["name"] == "Admin User"), users[0])
        other_user = next((u for u in users if u["id"] != admin_user["id"]), None)
        if not other_user:
            print("Could not find another active user for owner change test")
            return False
            
        print(f"Will change owner from {admin_user['name']} ({admin_user['id']}) to {other_user['name']} ({other_user['id']})")

        # 3. Test Supplier Change Owner
        print("Creating test supplier...")
        create_supplier_resp = await client.post(
            f"{BASE_URL}/suppliers/",
            json={
                "name": "Test Supplier Owner Change",
                "supplier_type": "Hotel",
                "is_preferred": False
            },
            headers=headers
        )
        if create_supplier_resp.status_code != 201:
            print(f"Failed to create test supplier: {create_supplier_resp.status_code} -- {create_supplier_resp.text}")
            return False
            
        supplier = create_supplier_resp.json()
        supplier_id = supplier["id"]
        assert supplier["owner_id"] == admin_user["id"]
        print(f"Test supplier created with ID {supplier_id}")

        print("Triggering change owner API for supplier...")
        change_supplier_owner_resp = await client.post(
            f"{BASE_URL}/suppliers/{supplier_id}/change-owner",
            json={"new_owner_id": other_user["id"]},
            headers=headers
        )
        if change_supplier_owner_resp.status_code != 200:
            print(f"Failed to change supplier owner: {change_supplier_owner_resp.status_code} -- {change_supplier_owner_resp.text}")
            return False
            
        change_supplier_result = change_supplier_owner_resp.json()
        assert change_supplier_result["error"] is False
        assert change_supplier_result["supplier"]["owner_id"] == other_user["id"]
        print("Supplier owner changed successfully in response.")

        # Get supplier to verify DB persistence
        get_supplier_resp = await client.get(f"{BASE_URL}/suppliers/{supplier_id}", headers=headers)
        assert get_supplier_resp.status_code == 200
        assert get_supplier_resp.json()["owner_id"] == other_user["id"]
        print("Supplier owner change successfully verified in database!")

        # 4. Test Lead Change Owner
        # We need a status ID and source ID to create a lead, let's fetch picklists
        lead_form_resp = await client.get(f"{BASE_URL}/picklists/lead_status", headers=headers)
        if lead_form_resp.status_code != 200:
            print(f"Failed to fetch lead statuses: {lead_form_resp.status_code} -- {lead_form_resp.text}")
            return False
        statuses = lead_form_resp.json()
        lead_status_id = statuses[0]["id"] if statuses else None

        lead_source_resp = await client.get(f"{BASE_URL}/picklists/source", headers=headers)
        sources = lead_source_resp.json() if lead_source_resp.status_code == 200 else []
        lead_source_id = sources[0]["id"] if sources else None


        print("Creating test lead...")
        create_lead_resp = await client.post(
            f"{BASE_URL}/leads/",
            json={
                "first_name": "TestLead",
                "last_name": "OwnerChange",
                "lead_status_id": lead_status_id,
                "source_id": lead_source_id,
                "segment": "B2C"
            },
            headers=headers
        )
        if create_lead_resp.status_code != 201:
            print(f"Failed to create test lead: {create_lead_resp.status_code} -- {create_lead_resp.text}")
            return False
            
        lead = create_lead_resp.json()
        lead_id = lead["id"]
        assert lead["owner_id"] == admin_user["id"]
        print(f"Test lead created with ID {lead_id}")

        print("Triggering change owner API for lead...")
        change_lead_owner_resp = await client.post(
            f"{BASE_URL}/leads/{lead_id}/change-owner",
            json={"new_owner_id": other_user["id"]},
            headers=headers
        )
        if change_lead_owner_resp.status_code != 200:
            print(f"Failed to change lead owner: {change_lead_owner_resp.status_code} -- {change_lead_owner_resp.text}")
            return False
            
        change_lead_result = change_lead_owner_resp.json()
        assert change_lead_result["error"] is False
        assert change_lead_result["lead"]["owner_id"] == other_user["id"]
        print("Lead owner changed successfully in response.")

        # Get lead to verify DB persistence
        get_lead_resp = await client.get(f"{BASE_URL}/leads/{lead_id}", headers=headers)
        assert get_lead_resp.status_code == 200
        assert get_lead_resp.json()["owner_id"] == other_user["id"]
        print("Lead owner change successfully verified in database!")

        print("All tests passed successfully!")
        return True

if __name__ == "__main__":
    success = asyncio.run(test_change_owner())
    sys.exit(0 if success else 1)
