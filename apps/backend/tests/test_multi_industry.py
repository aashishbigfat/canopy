"""
Multi-Industry CRM -- Comprehensive Integration Tests

Tests data isolation, industry-specific logic, cache isolation, and schema
correctness across all 4 industry tenants.

Run:  python tests/test_multi_industry.py
"""

import asyncio
import sys
import os
import httpx
from typing import Dict, Any

# --- Configuration -------------------------------------------------------

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1")

TENANTS = {
    "travel": {
        "email": "admin@tutterfly.com",
        "password": "admin1",
        "industry": "travel",
        "label": "Travel",
    },
    "healthcare": {
        "email": "admin-health@tutterfly.com",
        "password": "admin1",
        "industry": "healthcare",
        "label": "Healthcare",
    },
    "education": {
        "email": "admin-edu@tutterfly.com",
        "password": "admin1",
        "industry": "education",
        "label": "Education",
    },
    "manufacturing": {
        "email": "admin-mfg@tutterfly.com",
        "password": "admin1",
        "industry": "manufacturing",
        "label": "Manufacturing",
    },
}


# --- Helpers --------------------------------------------------------------

async def login(client: httpx.AsyncClient, email: str, password: str) -> Dict[str, Any]:
    resp = await client.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.status_code} -- {resp.text}"
    return resp.json()


# --- Results Tracker ------------------------------------------------------

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def ok(self, name: str):
        self.passed += 1
        print(f"  [PASS] {name}")

    def fail(self, name: str, detail: str):
        self.failed += 1
        self.errors.append(f"{name}: {detail}")
        print(f"  [FAIL] {name} -- {detail}")

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"  Results: {self.passed}/{total} passed, {self.failed} failed")
        if self.errors:
            print(f"\n  Failures:")
            for e in self.errors:
                print(f"    - {e}")
        print(f"{'='*60}")
        return self.failed == 0


# ==========================================================================
# TEST SUITE
# ==========================================================================

async def run_all_tests():
    results = TestResults()

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:

        # -- 1. AUTH & INDUSTRY RESOLUTION ---------------------------------
        print("\n[1] AUTH & INDUSTRY RESOLUTION")
        print("-" * 40)

        tenant_sessions: Dict[str, Dict] = {}

        for industry, creds in TENANTS.items():
            try:
                data = await login(client, creds["email"], creds["password"])
                user = data.get("user", {})
                tenant_sessions[industry] = {
                    "token": data["access_token"],
                    "headers": {"Authorization": f"Bearer {data['access_token']}"},
                    "tenant_id": user.get("tenant_id"),
                    "industry_from_api": user.get("industry"),
                }

                if user.get("industry") == industry:
                    results.ok(f"{creds['label']} login returns industry='{industry}'")
                else:
                    results.fail(
                        f"{creds['label']} industry mismatch",
                        f"expected '{industry}', got '{user.get('industry')}'",
                    )
            except Exception as e:
                results.fail(f"{creds['label']} login", str(e))

        # -- 2. TENANT ID UNIQUENESS --------------------------------------
        print("\n[2] TENANT ID UNIQUENESS")
        print("-" * 40)

        tenant_ids = {k: v["tenant_id"] for k, v in tenant_sessions.items()}
        unique_ids = set(tenant_ids.values())

        if len(unique_ids) == len(TENANTS):
            results.ok(f"All {len(TENANTS)} tenants have unique tenant_ids")
        else:
            seen = {}
            for ind, tid in tenant_ids.items():
                if tid in seen:
                    results.fail("Tenant ID collision", f"{ind} and {seen[tid]} share tenant_id={tid}")
                seen[tid] = ind

        # -- 3. DASHBOARD DATA ISOLATION -----------------------------------
        print("\n[3] DASHBOARD DATA ISOLATION")
        print("-" * 40)

        dashboard_data: Dict[str, Dict] = {}

        for industry, session in tenant_sessions.items():
            label = TENANTS[industry]["label"]
            try:
                resp = await client.get(f"{BASE_URL}/dashboards/stats", headers=session["headers"])
                assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:200]}"
                stats = resp.json()
                dashboard_data[industry] = stats

                api_industry = stats.get("industry")
                if api_industry == industry:
                    results.ok(f"{label} dashboard returns industry='{industry}'")
                else:
                    results.fail(f"{label} dashboard industry field", f"expected '{industry}', got '{api_industry}'")
            except Exception as e:
                results.fail(f"{label} dashboard stats fetch", str(e))

        # Travel-specific KPIs should be 0 for non-travel tenants
        for industry in ["healthcare", "education", "manufacturing"]:
            if industry not in dashboard_data:
                continue
            label = TENANTS[industry]["label"]
            stats = dashboard_data[industry]

            if stats.get("tomorrow_departures", 0) == 0:
                results.ok(f"{label} has tomorrow_departures=0 (correct)")
            else:
                results.fail(f"{label} tomorrow_departures", f"expected 0, got {stats.get('tomorrow_departures')} -- DATA LEAK")

            if stats.get("today_checkout", 0) == 0:
                results.ok(f"{label} has today_checkout=0 (correct)")
            else:
                results.fail(f"{label} today_checkout", f"expected 0, got {stats.get('today_checkout')} -- DATA LEAK")

        # Opportunity counts
        if "travel" in dashboard_data:
            travel_opps = dashboard_data["travel"].get("total_opportunities", 0)
            results.ok(f"Travel has {travel_opps} total opportunities")

        for industry in ["healthcare", "education", "manufacturing"]:
            if industry not in dashboard_data:
                continue
            label = TENANTS[industry]["label"]
            opps = dashboard_data[industry].get("total_opportunities", 0)
            if opps == 0:
                results.ok(f"{label} has 0 opportunities (data isolated)")
            else:
                results.fail(f"{label} data isolation", f"has {opps} opportunities -- DATA LEAK!")

        # -- 4. CACHE ISOLATION (sequential requests) ----------------------
        print("\n[4] DASHBOARD CACHE ISOLATION")
        print("-" * 40)

        try:
            resp_travel = await client.get(f"{BASE_URL}/dashboards/stats", headers=tenant_sessions["travel"]["headers"])
            resp_health = await client.get(f"{BASE_URL}/dashboards/stats", headers=tenant_sessions["healthcare"]["headers"])
            t_data = resp_travel.json()
            h_data = resp_health.json()

            if t_data.get("total_opportunities") != h_data.get("total_opportunities"):
                results.ok("Cache isolation: travel and healthcare return different opportunity counts")
            elif t_data.get("total_opportunities") == 0 and h_data.get("total_opportunities") == 0:
                results.ok("Cache isolation: both return 0 (acceptable)")
            else:
                results.fail("Cache isolation", f"travel={t_data.get('total_opportunities')}, healthcare={h_data.get('total_opportunities')}")

            if t_data.get("industry") != h_data.get("industry"):
                results.ok(f"Cache isolation: industry fields differ (travel vs healthcare)")
            else:
                results.fail("Cache isolation: industry", f"both return '{t_data.get('industry')}'")
        except Exception as e:
            results.fail("Cache isolation test", str(e))

        # -- 5. KEY DEALS ISOLATION ----------------------------------------
        print("\n[5] KEY DEALS DATA ISOLATION")
        print("-" * 40)

        for industry, session in tenant_sessions.items():
            label = TENANTS[industry]["label"]
            try:
                resp = await client.get(
                    f"{BASE_URL}/dashboards/analytics/key-deals",
                    params={"limit": 5},
                    headers=session["headers"],
                )
                if resp.status_code != 200:
                    results.fail(f"{label} key deals", f"HTTP {resp.status_code}: {resp.text[:200]}")
                    continue

                deals = resp.json()

                if industry != "travel":
                    if len(deals) == 0:
                        results.ok(f"{label} has 0 key deals (correct)")
                    else:
                        deal_names = [d.get("name", "") for d in deals]
                        travel_indicators = ["Barcelona", "Bali", "Cape Town", "Bangkok"]
                        leaked = [n for n in deal_names if any(t in n for t in travel_indicators)]
                        if leaked:
                            results.fail(f"{label} key deals data leak", f"contains travel deals: {leaked}")
                        else:
                            results.ok(f"{label} has {len(deals)} key deals (industry-specific)")
                else:
                    results.ok(f"{label} has {len(deals)} key deals")

                # Schema check: no hardcoded travel fields
                for deal in deals:
                    if "travel_date" in deal or "pax" in deal or "nights" in deal:
                        results.fail(f"{label} KeyDeal schema", "contains hardcoded travel fields")
                        break
                else:
                    if deals:
                        results.ok(f"{label} KeyDeal uses generic industry_data field")

            except Exception as e:
                results.fail(f"{label} key deals", str(e))

        # -- 6. LEADS API (No 500 errors) ----------------------------------
        print("\n[6] LEADS API -- No 500 Errors")
        print("-" * 40)

        for industry, session in tenant_sessions.items():
            label = TENANTS[industry]["label"]
            try:
                resp = await client.get(
                    f"{BASE_URL}/leads/",
                    params={"page": 1, "per_page": 10},
                    headers=session["headers"],
                )
                if resp.status_code == 200:
                    data = resp.json()
                    leads = data.get("leads", [])
                    results.ok(f"{label} GET /leads/ returns 200 ({len(leads)} leads)")

                    if leads:
                        lead_id = leads[0].get("id")
                        resp_detail = await client.get(f"{BASE_URL}/leads/{lead_id}", headers=session["headers"])
                        if resp_detail.status_code == 200:
                            lead_detail = resp_detail.json()
                            if "owner_name" in lead_detail:
                                results.ok(f"{label} lead detail has owner_name field")
                            else:
                                results.fail(f"{label} lead detail", "missing owner_name field")
                        else:
                            results.fail(f"{label} GET /leads/id", f"HTTP {resp_detail.status_code}")
                else:
                    results.fail(f"{label} GET /leads/", f"HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                results.fail(f"{label} leads API", str(e))

        # -- 7. LEADS DATA ISOLATION ---------------------------------------
        print("\n[7] LEADS DATA ISOLATION")
        print("-" * 40)

        for industry, session in tenant_sessions.items():
            label = TENANTS[industry]["label"]
            try:
                resp = await client.get(
                    f"{BASE_URL}/leads/",
                    params={"page": 1, "per_page": 100, "view": "all"},
                    headers=session["headers"],
                )
                if resp.status_code == 200:
                    data = resp.json()
                    count = data.get("pagination", {}).get("total", len(data.get("leads", [])))
                    results.ok(f"{label} has {count} leads")
                    if industry != "travel" and count == 0:
                        results.ok(f"{label} lead isolation confirmed (0 leads)")
            except Exception as e:
                results.fail(f"{label} leads count", str(e))

        # -- 8. /auth/me INDUSTRY CONSISTENCY ------------------------------
        print("\n[8] /auth/me INDUSTRY CONSISTENCY")
        print("-" * 40)

        for industry, session in tenant_sessions.items():
            label = TENANTS[industry]["label"]
            try:
                resp = await client.get(f"{BASE_URL}/auth/me", headers=session["headers"])
                if resp.status_code == 200:
                    me = resp.json()
                    if me.get("industry") == industry:
                        results.ok(f"{label} /auth/me industry='{industry}'")
                    else:
                        results.fail(f"{label} /auth/me industry", f"expected '{industry}', got '{me.get('industry')}'")

                    if me.get("tenant_id") == session["tenant_id"]:
                        results.ok(f"{label} /auth/me tenant_id matches login")
                    else:
                        results.fail(f"{label} /auth/me tenant_id mismatch", f"login={session['tenant_id']}, me={me.get('tenant_id')}")
                else:
                    results.fail(f"{label} /auth/me", f"HTTP {resp.status_code}")
            except Exception as e:
                results.fail(f"{label} /auth/me", str(e))

        # -- 9. OPPORTUNITIES DATA ISOLATION -------------------------------
        print("\n[9] OPPORTUNITIES DATA ISOLATION")
        print("-" * 40)

        for industry, session in tenant_sessions.items():
            label = TENANTS[industry]["label"]
            try:
                resp = await client.get(
                    f"{BASE_URL}/opportunities/",
                    params={"page": 1, "per_page": 10},
                    headers=session["headers"],
                )
                if resp.status_code == 200:
                    data = resp.json()
                    opps = data.get("opportunities", [])
                    total = data.get("total", len(opps))

                    if industry == "travel":
                        results.ok(f"{label} has {total} opportunities")
                    else:
                        if total == 0:
                            results.ok(f"{label} has 0 opportunities (data isolated)")
                        else:
                            opp_names = [o.get("name", "") for o in opps[:5]]
                            results.fail(f"{label} opp isolation", f"has {total} opportunities: {opp_names} -- DATA LEAK!")
                else:
                    results.fail(f"{label} GET /opportunities/", f"HTTP {resp.status_code}")
            except Exception as e:
                results.fail(f"{label} opportunities API", str(e))

        # -- 10. REVENUE CHART ISOLATION -----------------------------------
        print("\n[10] REVENUE CHART DATA ISOLATION")
        print("-" * 40)

        for industry, session in tenant_sessions.items():
            label = TENANTS[industry]["label"]
            try:
                resp = await client.get(
                    f"{BASE_URL}/dashboards/revenue-chart",
                    params={"period": "month"},
                    headers=session["headers"],
                )
                if resp.status_code == 200:
                    chart = resp.json()
                    results.ok(f"{label} revenue chart returns 200")

                    if industry != "travel":
                        data_points = chart if isinstance(chart, list) else chart.get("data", [])
                        non_zero = [d for d in data_points if isinstance(d, dict) and (d.get("closed", 0) > 0 or d.get("open", 0) > 0)]
                        if len(non_zero) == 0:
                            results.ok(f"{label} revenue chart all-zero (data isolated)")
                        else:
                            results.fail(f"{label} revenue chart isolation", f"{len(non_zero)} non-zero data points")
                else:
                    results.fail(f"{label} revenue chart", f"HTTP {resp.status_code}")
            except Exception as e:
                results.fail(f"{label} revenue chart", str(e))

    return results.summary()


# ==========================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  MULTI-INDUSTRY CRM -- INTEGRATION TEST SUITE")
    print("  Testing: Data Isolation, Cache, Industry Logic, Schemas")
    print("=" * 60)

    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
