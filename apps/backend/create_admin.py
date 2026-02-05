import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from app.db.mongodb import init_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserRegister
from app.models.user import User

async def main():
    print("Initializing Database...")
    try:
        await init_db()
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return

    email = "admin@tutterfly.com"
    password = "admin"
    name = "Admin User"
    company_name = "Tutterfly HQ"

    # Check if user exists
    existing_user = await User.find_one(User.email == email)
    if existing_user:
        print(f"User {email} already exists.")
        return

    print(f"Creating user {email}...")
    service = AuthService()
    
    # Create fake register data
    user_data = UserRegister(
        email=email,
        password=password,
        name=name,
        company_name=company_name
    )
    
    try:
        user = await service.register_user(user_data)
        print("✅ User created successfully!")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"ID: {user.id}")
        
        # Make admin? (If specific role logic exists)
        # Assuming first user logic or manual role assignment might be needed later
        # For now, just having a user is enough to login
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")

if __name__ == "__main__":
    asyncio.run(main())
