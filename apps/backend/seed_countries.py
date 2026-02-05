"""
Seed countries, states, and cities into the database
"""
import asyncio
import sys
import os

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.country import Country, State, City


async def seed_countries():
    """Seed countries, states, and cities into the database"""
    
    print("🌍 Starting Countries Seeding Process")
    print("=" * 50)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Initialize Beanie
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Country, State, City]
    )
    
    print("✅ Connected to MongoDB")
    
    # Clear existing data (optional - uncomment if you want to start fresh)
    print("🗑️  Clearing existing data...")
    await Country.find_all().delete()
    await State.find_all().delete()
    await City.find_all().delete()
    print("✅ Cleared existing data")
    
    # Seed Countries
    print("\n📝 Seeding Countries...")
    countries_data = [
        {
            "name": "United States",
            "code": "US",
            "code3": "USA",
            "phone_code": "+1",
            "currency": "USD",
            "currency_symbol": "$",
            "continent": "North America",
            "capital": "Washington DC",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "United Kingdom",
            "code": "GB",
            "code3": "GBR",
            "phone_code": "+44",
            "currency": "GBP",
            "currency_symbol": "£",
            "continent": "Europe",
            "capital": "London",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Canada",
            "code": "CA",
            "code3": "CAN",
            "phone_code": "+1",
            "currency": "CAD",
            "currency_symbol": "C$",
            "continent": "North America",
            "capital": "Ottawa",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Australia",
            "code": "AU",
            "code3": "AUS",
            "phone_code": "+61",
            "currency": "AUD",
            "currency_symbol": "A$",
            "continent": "Oceania",
            "capital": "Canberra",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "India",
            "code": "IN",
            "code3": "IND",
            "phone_code": "+91",
            "currency": "INR",
            "currency_symbol": "₹",
            "continent": "Asia",
            "capital": "New Delhi",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "United Arab Emirates",
            "code": "AE",
            "code3": "ARE",
            "phone_code": "+971",
            "currency": "AED",
            "currency_symbol": "د.إ",
            "continent": "Asia",
            "capital": "Abu Dhabi",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Singapore",
            "code": "SG",
            "code3": "SGP",
            "phone_code": "+65",
            "currency": "SGD",
            "currency_symbol": "S$",
            "continent": "Asia",
            "capital": "Singapore",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "France",
            "code": "FR",
            "code3": "FRA",
            "phone_code": "+33",
            "currency": "EUR",
            "currency_symbol": "€",
            "continent": "Europe",
            "capital": "Paris",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Germany",
            "code": "DE",
            "code3": "DEU",
            "phone_code": "+49",
            "currency": "EUR",
            "currency_symbol": "€",
            "continent": "Europe",
            "capital": "Berlin",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Japan",
            "code": "JP",
            "code3": "JPN",
            "phone_code": "+81",
            "currency": "JPY",
            "currency_symbol": "¥",
            "continent": "Asia",
            "capital": "Tokyo",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "China",
            "code": "CN",
            "code3": "CHN",
            "phone_code": "+86",
            "currency": "CNY",
            "currency_symbol": "¥",
            "continent": "Asia",
            "capital": "Beijing",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Italy",
            "code": "IT",
            "code3": "ITA",
            "phone_code": "+39",
            "currency": "EUR",
            "currency_symbol": "€",
            "continent": "Europe",
            "capital": "Rome",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Spain",
            "code": "ES",
            "code3": "ESP",
            "phone_code": "+34",
            "currency": "EUR",
            "currency_symbol": "€",
            "continent": "Europe",
            "capital": "Madrid",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Mexico",
            "code": "MX",
            "code3": "MEX",
            "phone_code": "+52",
            "currency": "MXN",
            "currency_symbol": "$",
            "continent": "North America",
            "capital": "Mexico City",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Brazil",
            "code": "BR",
            "code3": "BRA",
            "phone_code": "+55",
            "currency": "BRL",
            "currency_symbol": "R$",
            "continent": "South America",
            "capital": "Brasília",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "South Africa",
            "code": "ZA",
            "code3": "ZAF",
            "phone_code": "+27",
            "currency": "ZAR",
            "currency_symbol": "R",
            "continent": "Africa",
            "capital": "Pretoria",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Thailand",
            "code": "TH",
            "code3": "THA",
            "phone_code": "+66",
            "currency": "THB",
            "currency_symbol": "฿",
            "continent": "Asia",
            "capital": "Bangkok",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Malaysia",
            "code": "MY",
            "code3": "MYS",
            "phone_code": "+60",
            "currency": "MYR",
            "currency_symbol": "RM",
            "continent": "Asia",
            "capital": "Kuala Lumpur",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Indonesia",
            "code": "ID",
            "code3": "IDN",
            "phone_code": "+62",
            "currency": "IDR",
            "currency_symbol": "Rp",
            "continent": "Asia",
            "capital": "Jakarta",
            "is_active": True,
            "is_popular": True
        },
        {
            "name": "Netherlands",
            "code": "NL",
            "code3": "NLD",
            "phone_code": "+31",
            "currency": "EUR",
            "currency_symbol": "€",
            "continent": "Europe",
            "capital": "Amsterdam",
            "is_active": True,
            "is_popular": False
        }
    ]
    
    created_countries = []
    for country_data in countries_data:
        country = Country(**country_data)
        await country.insert()
        created_countries.append(country)
        print(f"   ✅ Created: {country.name} ({country.code})")
    
    print(f"✅ Created {len(created_countries)} countries")
    
    # Seed States for United States
    print("\n📝 Seeding US States...")
    us_country = next((c for c in created_countries if c.code == "US"), None)
    
    if us_country:
        us_states = [
            {"name": "California", "code": "CA"},
            {"name": "Texas", "code": "TX"},
            {"name": "New York", "code": "NY"},
            {"name": "Florida", "code": "FL"},
            {"name": "Illinois", "code": "IL"},
            {"name": "Pennsylvania", "code": "PA"},
            {"name": "Ohio", "code": "OH"},
            {"name": "Georgia", "code": "GA"},
            {"name": "North Carolina", "code": "NC"},
            {"name": "Michigan", "code": "MI"},
            {"name": "New Jersey", "code": "NJ"},
            {"name": "Virginia", "code": "VA"},
            {"name": "Washington", "code": "WA"},
            {"name": "Arizona", "code": "AZ"},
            {"name": "Massachusetts", "code": "MA"}
        ]
        
        created_states = []
        for state_data in us_states:
            state = State(
                name=state_data["name"],
                code=state_data["code"],
                country_id=us_country.id,
                is_active=True
            )
            await state.insert()
            created_states.append(state)
            print(f"   ✅ Created: {state.name} ({state.code})")
        
        print(f"✅ Created {len(created_states)} US states")
        
        # Seed Cities for United States
        print("\n📝 Seeding US Cities...")
        us_cities = [
            {"name": "New York", "state_code": "NY", "is_popular": True, "latitude": 40.7128, "longitude": -74.0060, "timezone": "America/New_York"},
            {"name": "Los Angeles", "state_code": "CA", "is_popular": True, "latitude": 34.0522, "longitude": -118.2437, "timezone": "America/Los_Angeles"},
            {"name": "Chicago", "state_code": "IL", "is_popular": True, "latitude": 41.8781, "longitude": -87.6298, "timezone": "America/Chicago"},
            {"name": "Houston", "state_code": "TX", "is_popular": True, "latitude": 29.7604, "longitude": -95.3698, "timezone": "America/Chicago"},
            {"name": "Phoenix", "state_code": "AZ", "is_popular": True, "latitude": 33.4484, "longitude": -112.0740, "timezone": "America/Phoenix"},
            {"name": "Philadelphia", "state_code": "PA", "is_popular": True, "latitude": 39.9526, "longitude": -75.1652, "timezone": "America/New_York"},
            {"name": "San Antonio", "state_code": "TX", "is_popular": True, "latitude": 29.4241, "longitude": -98.4936, "timezone": "America/Chicago"},
            {"name": "San Diego", "state_code": "CA", "is_popular": True, "latitude": 32.7157, "longitude": -117.1611, "timezone": "America/Los_Angeles"},
            {"name": "Dallas", "state_code": "TX", "is_popular": True, "latitude": 32.7767, "longitude": -96.7970, "timezone": "America/Chicago"},
            {"name": "San Jose", "state_code": "CA", "is_popular": True, "latitude": 37.3382, "longitude": -121.8863, "timezone": "America/Los_Angeles"},
            {"name": "Austin", "state_code": "TX", "is_popular": True, "latitude": 30.2672, "longitude": -97.7431, "timezone": "America/Chicago"},
            {"name": "Jacksonville", "state_code": "FL", "is_popular": True, "latitude": 30.3322, "longitude": -81.6557, "timezone": "America/New_York"},
            {"name": "Fort Worth", "state_code": "TX", "is_popular": True, "latitude": 32.7555, "longitude": -97.3308, "timezone": "America/Chicago"},
            {"name": "Columbus", "state_code": "OH", "is_popular": True, "latitude": 39.9612, "longitude": -82.9988, "timezone": "America/New_York"},
            {"name": "Charlotte", "state_code": "NC", "is_popular": True, "latitude": 35.2271, "longitude": -80.8431, "timezone": "America/New_York"},
            {"name": "San Francisco", "state_code": "CA", "is_popular": True, "latitude": 37.7749, "longitude": -122.4194, "timezone": "America/Los_Angeles"},
            {"name": "Indianapolis", "state_code": "IN", "is_popular": True, "latitude": 39.7684, "longitude": -86.1581, "timezone": "America/Indiana/Indianapolis"},
            {"name": "Seattle", "state_code": "WA", "is_popular": True, "latitude": 47.6062, "longitude": -122.3321, "timezone": "America/Los_Angeles"},
            {"name": "Denver", "state_code": "CO", "is_popular": True, "latitude": 39.7392, "longitude": -104.9903, "timezone": "America/Denver"},
            {"name": "Boston", "state_code": "MA", "is_popular": True, "latitude": 42.3601, "longitude": -71.0589, "timezone": "America/New_York"}
        ]
        
        created_cities = []
        for city_data in us_cities:
            # Find the state
            state = next((s for s in created_states if s.code == city_data["state_code"]), None)
            if state:
                city = City(
                    name=city_data["name"],
                    country_id=us_country.id,
                    state_id=state.id,
                    latitude=city_data["latitude"],
                    longitude=city_data["longitude"],
                    timezone=city_data["timezone"],
                    is_popular=city_data["is_popular"],
                    is_active=True
                )
                await city.insert()
                created_cities.append(city)
                print(f"   ✅ Created: {city.name}, {city_data['state_code']}")
        
        print(f"✅ Created {len(created_cities)} US cities")
    
    # Seed Cities for other popular countries
    print("\n📝 Seeding International Cities...")
    
    international_cities = [
        # United Kingdom
        {"name": "London", "country_code": "GB", "is_popular": True, "latitude": 51.5074, "longitude": -0.1278, "timezone": "Europe/London"},
        {"name": "Manchester", "country_code": "GB", "is_popular": True, "latitude": 53.4808, "longitude": -2.2426, "timezone": "Europe/London"},
        {"name": "Birmingham", "country_code": "GB", "is_popular": False, "latitude": 52.4862, "longitude": -1.8904, "timezone": "Europe/London"},
        
        # Canada
        {"name": "Toronto", "country_code": "CA", "is_popular": True, "latitude": 43.6532, "longitude": -79.3832, "timezone": "America/Toronto"},
        {"name": "Vancouver", "country_code": "CA", "is_popular": True, "latitude": 49.2827, "longitude": -123.1207, "timezone": "America/Vancouver"},
        {"name": "Montreal", "country_code": "CA", "is_popular": True, "latitude": 45.5017, "longitude": -73.5673, "timezone": "America/Montreal"},
        
        # Australia
        {"name": "Sydney", "country_code": "AU", "is_popular": True, "latitude": -33.8688, "longitude": 151.2093, "timezone": "Australia/Sydney"},
        {"name": "Melbourne", "country_code": "AU", "is_popular": True, "latitude": -37.8136, "longitude": 144.9631, "timezone": "Australia/Melbourne"},
        {"name": "Brisbane", "country_code": "AU", "is_popular": True, "latitude": -27.4698, "longitude": 153.0251, "timezone": "Australia/Brisbane"},
        
        # India
        {"name": "Mumbai", "country_code": "IN", "is_popular": True, "latitude": 19.0760, "longitude": 72.8777, "timezone": "Asia/Kolkata"},
        {"name": "Delhi", "country_code": "IN", "is_popular": True, "latitude": 28.7041, "longitude": 77.1025, "timezone": "Asia/Kolkata"},
        {"name": "Bangalore", "country_code": "IN", "is_popular": True, "latitude": 12.9716, "longitude": 77.5946, "timezone": "Asia/Kolkata"},
        
        # UAE
        {"name": "Dubai", "country_code": "AE", "is_popular": True, "latitude": 25.2048, "longitude": 55.2708, "timezone": "Asia/Dubai"},
        {"name": "Abu Dhabi", "country_code": "AE", "is_popular": True, "latitude": 24.4539, "longitude": 54.3773, "timezone": "Asia/Dubai"},
        
        # Singapore
        {"name": "Singapore", "country_code": "SG", "is_popular": True, "latitude": 1.3521, "longitude": 103.8198, "timezone": "Asia/Singapore"},
        
        # France
        {"name": "Paris", "country_code": "FR", "is_popular": True, "latitude": 48.8566, "longitude": 2.3522, "timezone": "Europe/Paris"},
        {"name": "Nice", "country_code": "FR", "is_popular": True, "latitude": 43.7102, "longitude": 7.2620, "timezone": "Europe/Paris"},
        
        # Germany
        {"name": "Berlin", "country_code": "DE", "is_popular": True, "latitude": 52.5200, "longitude": 13.4050, "timezone": "Europe/Berlin"},
        {"name": "Munich", "country_code": "DE", "is_popular": True, "latitude": 48.1351, "longitude": 11.5820, "timezone": "Europe/Berlin"},
        
        # Japan
        {"name": "Tokyo", "country_code": "JP", "is_popular": True, "latitude": 35.6762, "longitude": 139.6503, "timezone": "Asia/Tokyo"},
        {"name": "Osaka", "country_code": "JP", "is_popular": True, "latitude": 34.6937, "longitude": 135.5023, "timezone": "Asia/Tokyo"},
        
        # China
        {"name": "Beijing", "country_code": "CN", "is_popular": True, "latitude": 39.9042, "longitude": 116.4074, "timezone": "Asia/Shanghai"},
        {"name": "Shanghai", "country_code": "CN", "is_popular": True, "latitude": 31.2304, "longitude": 121.4737, "timezone": "Asia/Shanghai"},
        
        # Italy
        {"name": "Rome", "country_code": "IT", "is_popular": True, "latitude": 41.9028, "longitude": 12.4964, "timezone": "Europe/Rome"},
        {"name": "Venice", "country_code": "IT", "is_popular": True, "latitude": 45.4408, "longitude": 12.3155, "timezone": "Europe/Rome"},
        
        # Spain
        {"name": "Madrid", "country_code": "ES", "is_popular": True, "latitude": 40.4168, "longitude": -3.7038, "timezone": "Europe/Madrid"},
        {"name": "Barcelona", "country_code": "ES", "is_popular": True, "latitude": 41.3851, "longitude": 2.1734, "timezone": "Europe/Madrid"},
        
        # Thailand
        {"name": "Bangkok", "country_code": "TH", "is_popular": True, "latitude": 13.7563, "longitude": 100.5018, "timezone": "Asia/Bangkok"},
        {"name": "Phuket", "country_code": "TH", "is_popular": True, "latitude": 7.8804, "longitude": 98.3923, "timezone": "Asia/Bangkok"},
        
        # Malaysia
        {"name": "Kuala Lumpur", "country_code": "MY", "is_popular": True, "latitude": 3.1390, "longitude": 101.6869, "timezone": "Asia/Kuala_Lumpur"},
        {"name": "Penang", "country_code": "MY", "is_popular": True, "latitude": 5.4164, "longitude": 100.3327, "timezone": "Asia/Kuala_Lumpur"}
    ]
    
    international_created_cities = []
    for city_data in international_cities:
        # Find the country
        country = next((c for c in created_countries if c.code == city_data["country_code"]), None)
        if country:
            city = City(
                name=city_data["name"],
                country_id=country.id,
                latitude=city_data["latitude"],
                longitude=city_data["longitude"],
                timezone=city_data["timezone"],
                is_popular=city_data["is_popular"],
                is_active=True
            )
            await city.insert()
            international_created_cities.append(city)
            print(f"   ✅ Created: {city.name}, {city_data['country_code']}")
    
    print(f"✅ Created {len(international_created_cities)} international cities")
    
    # Summary
    print("\n📊 Seeding Summary:")
    print(f"   🌍 Countries: {len(created_countries)}")
    print(f"   🗺️  States: {len(created_states)}")
    print(f"   🏙️  Cities: {len(created_cities) + len(international_created_cities)}")
    print(f"   📍 Total Locations: {len(created_countries) + len(created_states) + len(created_cities) + len(international_created_cities)}")
    
    # Close connection
    client.close()
    
    print("\n🎉 Countries Seeding Complete!")
    print("=" * 50)
    print("✅ Your database now has comprehensive geographic data!")
    print("🚀 Ready for travel CRM operations!")


if __name__ == "__main__":
    asyncio.run(seed_countries())
