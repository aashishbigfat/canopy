import asyncio
import httpx
import sys
import os

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1")

async def test_csv_import():
    print("Testing CSV Lead Import...")
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

        # 2. Get existing leads status or picklist to use a valid status name
        # (Though we can use "New" as it's standard)
        
        # 3. Create dummy CSV file content
        # Note: We need a unique email / mobile to prevent deduplication trigger (unless we want to test skipping)
        import random
        num = random.randint(1000, 9999)
        email1 = f"testimport.{num}.1@example.com"
        email2 = f"testimport.{num}.2@example.com"
        phone1 = f"+1555000{num}"
        phone2 = f"+1555111{num}"
        
        csv_content = f"""First Name,Last Name,Company,Email,Phone,Mobile,Lead Status,Source,Segment
ImportedFirst{num},ImportedLast{num},Import Company,{email1},{phone1},{phone1},New,Google,B2C
ImportedSecond{num},ImportedSecondLast{num},Second Company,{email2},{phone2},{phone2},New,Google,B2C
"""
        
        # 4. Upload file
        files = {
            "file": ("test_leads.csv", csv_content, "text/csv")
        }
        
        print("Uploading test CSV...")
        import_resp = await client.post(
            f"{BASE_URL}/leads/import",
            files=files,
            headers=headers
        )
        
        if import_resp.status_code != 200:
            print(f"Import failed: {import_resp.status_code} -- {import_resp.text}")
            return False
            
        result = import_resp.json()
        print("Import Response:")
        print(result)
        
        assert result["error"] is False
        assert "Successfully imported" in result["message"]
        assert result["data"]["imported"] == 2
        assert result["data"]["skipped"] == 0
        assert len(result["data"]["errors"]) == 0
        
        # 5. Check if they were created in the database
        leads_resp = await client.get(
            f"{BASE_URL}/leads/",
            params={"page": 1, "per_page": 10, "search": f"ImportedFirst{num}"},
            headers=headers
        )
        assert leads_resp.status_code == 200
        leads_data = leads_resp.json()
        leads = leads_data.get("leads", [])
        print(f"Found {len(leads)} imported leads in search.")
        assert len(leads) >= 1
        assert leads[0]["first_name"] == f"ImportedFirst{num}"
        
        print("Test passed successfully!")
        return True

if __name__ == "__main__":
    success = asyncio.run(test_csv_import())
    sys.exit(0 if success else 1)
