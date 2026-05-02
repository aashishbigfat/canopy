import asyncio
import httpx

async def main():
    # Login as admin to get token
    async with httpx.AsyncClient() as client:
        # First, login
        login_data = {
            "username": "admin@tutterfly.com",
            "password": "Password123!"
        }
        res = await client.post("http://localhost:8000/api/v1/auth/login", data=login_data)
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
            
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        account_id = "69ef969423b1cf15ab12584a"
        new_owner_id = "6970c2973fe1a7d96fc53e65" # Jane Smith
        
        # Call the change-owner endpoint
        res = await client.post(
            f"http://localhost:8000/api/v1/accounts/change-owner",
            params={"account_id": account_id},
            json={"new_owner_id": new_owner_id},
            headers=headers
        )
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")
        
        # Verify if owner changed
        res2 = await client.get(
            f"http://localhost:8000/api/v1/accounts/{account_id}?include_related=true",
            headers=headers
        )
        print(f"\nVerify Status: {res2.status_code}")
        account_data = res2.json()
        if "account" in account_data:
            acc = account_data["account"]
            print(f"Owner ID: {acc.get('owner_id')}")
            print(f"Owner Name: {acc.get('owner_name')}")
        else:
            print(f"Owner ID: {account_data.get('owner_id')}")
            print(f"Owner Name: {account_data.get('owner_name')}")

if __name__ == "__main__":
    asyncio.run(main())
