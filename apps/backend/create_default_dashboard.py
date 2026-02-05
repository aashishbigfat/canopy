"""
Create a default dashboard for testing
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.mongodb import init_db
from app.services.dashboard_service import dashboard_service
from app.schemas.dashboard import DashboardCreate

async def create_default_dashboard():
    await init_db()
    
    print('🌍 Creating Default Dashboard')
    print('=' * 40)
    
    # Default dashboard data
    default_dashboard = DashboardCreate(
        name="Default Dashboard",
        description="Default dashboard for travel CRM overview",
        layout="grid",
        columns=3,
        widgets=[
            {
                "widget_id": "revenue_widget",
                "position": {"x": 0, "y": 0, "w": 2, "h": 1}
            },
            {
                "widget_id": "sales_pipeline_widget",
                "position": {"x": 2, "y": 0, "w": 1, "h": 1}
            },
            {
                "widget_id": "recent_activities_widget",
                "position": {"x": 0, "y": 1, "w": 3, "h": 1}
            },
            {
                "widget_id": "bookings_trend_widget",
                "position": {"x": 0, "y": 2, "w": 3, "h": 1}
            },
            {
                "widget_id": "top_destinations_widget",
                "position": {"x": 0, "y": 3, "w": 2, "h": 1}
            },
            {
                "widget_id": "team_performance_widget",
                "position": {"x": 2, "y": 3, "w": 1, "h": 1}
            }
        ],
        is_public=False
    )
    
    try:
        # Get test user
        from app.models.user import User
        user = await User.find_one({"email": "jane.smith@company.com"})
        
        if not user:
            print("❌ Test user not found. Please run the comprehensive activity logging test first.")
            return
        
        print(f'✅ Found test user: {user.name} ({user.email})')
        print(f'   Tenant ID: {user.tenant_id}')
        
        # Create default dashboard
        dashboard = await dashboard_service.create_dashboard(
            data=default_dashboard,
            user_id=str(user.id),
            tenant_id=str(user.tenant_id)
        )
        
        # Set as default
        dashboard.is_default = True
        await dashboard.save()
        
        print(f'✅ Created default dashboard: {dashboard.name}')
        print(f'   Dashboard ID: {dashboard.id}')
        print(f'   Widgets: {len(dashboard.widgets)}')
        
        # Test the API endpoint
        print('\n📝 Testing GET /api/v1/dashboards/default')
        try:
            retrieved_dashboard = await dashboard_service.get_default_dashboard(
                user_id=str(user.id),
                tenant_id=str(user.tenant_id)
            )
            
            if retrieved_dashboard:
                print(f'   ✅ Default dashboard retrieved successfully')
                print(f'   ID: {retrieved_dashboard.id}')
                print(f'   Name: {retrieved_dashboard.name}')
            else:
                print('   ❌ No default dashboard found')
                
        except Exception as e:
            print(f'   ❌ Error retrieving default dashboard: {e}')
        
        print('\n🎉 Default Dashboard Created Successfully!')
        print('✅ Ready for API testing!')
        
    except Exception as e:
        print(f'❌ Error: {e}')

if __name__ == "__main__":
    asyncio.run(create_default_dashboard())
