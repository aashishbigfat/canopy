"""Test BD API endpoints directly."""
import asyncio
import httpx

BASE = "http://127.0.0.1:8000/api/v1"

async def test():
    async with httpx.AsyncClient(timeout=10) as c:
        # Login
        r = await c.post(f"{BASE}/auth/login", json={"email": "admin@tutterfly.com", "password": "admin123"})
        print(f"Login: {r.status_code}")
        if r.status_code != 200:
            print(f"  Body: {r.text[:300]}")
            return
        token = r.json().get("access_token", "")
        headers = {"Authorization": f"Bearer {token}"}

        # KPIs
        r2 = await c.get(f"{BASE}/bd-visits/dashboard-kpis", headers=headers)
        print(f"\nKPIs: {r2.status_code}")
        if r2.status_code == 200:
            d = r2.json()
            print(f"  today: {d.get('today')}")
            print(f"  pending_expenses: {d.get('pending_expenses')}")
            print(f"  approvals_owed: {d.get('approvals_owed')}")
            print(f"  week_chart count: {len(d.get('week_chart', []))}")
        else:
            print(f"  Body: {r2.text[:300]}")

        # Visit list
        r3 = await c.get(f"{BASE}/bd-visits", headers=headers)
        print(f"\nVisits list: {r3.status_code}")
        if r3.status_code == 200:
            d = r3.json()
            print(f"  total: {d.get('total')}")
            print(f"  visits returned: {len(d.get('visits', []))}")
            if d.get("visits"):
                v = d["visits"][0]
                print(f"  first: {v.get('title')} | status={v.get('status')} | owner={v.get('owner_name')}")
        else:
            print(f"  Body: {r3.text[:300]}")

        # Today
        r4 = await c.get(f"{BASE}/bd-visits/today", headers=headers)
        print(f"\nToday visits: {r4.status_code}")
        if r4.status_code == 200:
            d = r4.json()
            print(f"  total: {d.get('total')}")
        else:
            print(f"  Body: {r4.text[:300]}")

        # Pending approvals
        r5 = await c.get(f"{BASE}/bd-visits/pending-approvals", headers=headers)
        print(f"\nPending approvals: {r5.status_code}")
        if r5.status_code == 200:
            d = r5.json()
            print(f"  total: {d.get('total')}")
        else:
            print(f"  Body: {r5.text[:300]}")

        # Expense summary
        r6 = await c.get(f"{BASE}/expenses/summary", headers=headers)
        print(f"\nExpense summary: {r6.status_code}")
        if r6.status_code == 200:
            print(f"  data: {r6.json()}")
        else:
            print(f"  Body: {r6.text[:300]}")

        # Expense list
        r7 = await c.get(f"{BASE}/expenses", headers=headers)
        print(f"\nExpense list: {r7.status_code}")
        if r7.status_code == 200:
            d = r7.json()
            print(f"  total: {d.get('total')}")
        else:
            print(f"  Body: {r7.text[:300]}")

asyncio.run(test())
