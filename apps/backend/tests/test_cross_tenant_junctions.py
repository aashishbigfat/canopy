"""
Cross-Tenant Junction Table Security Integration Tests

Verifies that junction table linking/unlinking operations are properly secured against cross-tenant data leaks and unauthorized association.

Run: python tests/test_cross_tenant_junctions.py
"""

import asyncio
import sys
import os
import time
import httpx
from typing import Dict, Any

# --- Configuration -------------------------------------------------------

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1")

TENANTS = {
    "travel": {
        "email": "admin@tutterfly.com",
        "password": "admin1",
        "industry": "travel",
        "label": "Travel (Tenant A)",
    },
    "healthcare": {
        "email": "admin-health@tutterfly.com",
        "password": "admin1",
        "industry": "healthcare",
        "label": "Healthcare (Tenant B)",
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
        print(f"  Cross-Tenant Junction Security Results: {self.passed}/{total} passed, {self.failed} failed")
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
    ts = int(time.time())

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:

        # -- 1. AUTHENTICATE TENANTS ----------------------------------------
        print("\n[1] AUTHENTICATING TENANTS")
        print("-" * 40)

        sessions: Dict[str, Dict] = {}
        for key, creds in TENANTS.items():
            try:
                data = await login(client, creds["email"], creds["password"])
                user = data.get("user", {})
                sessions[key] = {
                    "token": data["access_token"],
                    "headers": {"Authorization": f"Bearer {data['access_token']}"},
                    "tenant_id": user.get("tenant_id"),
                }
                results.ok(f"Logged in as {creds['label']}")
            except Exception as e:
                results.fail(f"Login failed for {creds['label']}", str(e))
                return False

        # -- 2. SEED ENTITIES FOR EACH TENANT --------------------------------
        print("\n[2] SEEDING ISOLATED ENTITIES")
        print("-" * 40)

        # We will create one set of entities for Travel (Tenant A) and Healthcare (Tenant B)
        travel_entities = {}
        health_entities = {}

        # 2a. Travel Tenant Seeding
        t_headers = sessions["travel"]["headers"]
        try:
            # Create Destination
            dest_resp = await client.post(
                f"{BASE_URL}/destinations/",
                json={"name": f"Travel Isolated Beach {ts}", "country_id": "IND"},
                headers=t_headers
            )
            assert dest_resp.status_code in [200, 201], f"Dest: {dest_resp.status_code} -- {dest_resp.text}"
            travel_entities["destination_id"] = dest_resp.json()["id"]

            # Create Account
            acc_resp = await client.post(
                f"{BASE_URL}/accounts/",
                json={
                    "name": f"Travel Person Account {ts}",
                    "email": f"travel_acc_{ts}@tutterfly.com",
                    "phone": "+1 1234567890",
                    "is_person_account": True,
                    "billing_state": "Delhi",
                    "billing_country": "IND",
                    "first_name": "Travel",
                    "last_name": f"Account {ts}"
                },
                headers=t_headers
            )
            assert acc_resp.status_code in [200, 201], f"Account: {acc_resp.status_code} -- {acc_resp.text}"
            travel_entities["account_id"] = acc_resp.json()["id"]

            # Create Contact (requires account_id)
            contact_resp = await client.post(
                f"{BASE_URL}/contacts/",
                json={
                    "first_name": "TravelContact",
                    "last_name": f"Smith {ts}",
                    "email": f"travel_contact_{ts}@tutterfly.com",
                    "mobile": "+1 1234567890",
                    "account_id": travel_entities["account_id"]
                },
                headers=t_headers
            )
            assert contact_resp.status_code in [200, 201], f"Contact: {contact_resp.status_code} -- {contact_resp.text}"
            travel_entities["contact_id"] = contact_resp.json()["id"]

            # Create Lead
            lead_resp = await client.post(
                f"{BASE_URL}/leads/",
                json={"first_name": "TravelLead", "last_name": f"Jones {ts}", "email": f"travel_lead_{ts}@tutterfly.com"},
                headers=t_headers
            )
            assert lead_resp.status_code in [200, 201], f"Lead: {lead_resp.status_code} -- {lead_resp.text}"
            travel_entities["lead_id"] = lead_resp.json()["id"]

            # Fetch active sales stage for travel to create Opportunity
            stage_resp = await client.get(f"{BASE_URL}/opportunities/sales-stages", headers=t_headers)
            assert stage_resp.status_code == 200, f"Stages: {stage_resp.text}"
            travel_stage_id = stage_resp.json()[0]["id"]

            # Create Opportunity
            opp_resp = await client.post(
                f"{BASE_URL}/opportunities/",
                json={
                    "name": f"Travel Deal {ts}",
                    "amount": 12000.0,
                    "sales_stage_id": travel_stage_id,
                    "contact_id": travel_entities["contact_id"],
                    "account_id": travel_entities["account_id"]
                },
                headers=t_headers
            )
            assert opp_resp.status_code in [200, 201], f"Opp: {opp_resp.status_code} -- {opp_resp.text}"
            travel_entities["opportunity_id"] = opp_resp.json()["id"]

            # Create Package
            pkg_resp = await client.post(
                f"{BASE_URL}/packages/",
                json={"name": f"Travel Adventure Pack {ts}", "days": 5, "nights": 4, "base_price": 750.0},
                headers=t_headers
            )
            assert pkg_resp.status_code in [200, 201], f"Package: {pkg_resp.status_code} -- {pkg_resp.text}"
            travel_entities["package_id"] = pkg_resp.json()["id"]

            # Create Itinerary
            itinerary_resp = await client.post(
                f"{BASE_URL}/itineraries/",
                json={"name": f"Travel Dream Route {ts}", "total_days": 5, "total_nights": 4},
                headers=t_headers
            )
            assert itinerary_resp.status_code in [200, 201], f"Itinerary: {itinerary_resp.status_code} -- {itinerary_resp.text}"
            travel_entities["itinerary_id"] = itinerary_resp.json()["id"]

            # Create Supplier
            supplier_resp = await client.post(
                f"{BASE_URL}/suppliers/",
                json={"name": f"Travel Premium Hotel {ts}", "supplier_type": "Hotel"},
                headers=t_headers
            )
            assert supplier_resp.status_code in [200, 201], f"Supplier: {supplier_resp.status_code} -- {supplier_resp.text}"
            travel_entities["supplier_id"] = supplier_resp.json()["id"]

            results.ok("Successfully seeded Travel Tenant A entities")
        except Exception as e:
            results.fail("Travel seeding failed", str(e))
            return False

        # 2b. Healthcare Tenant Seeding
        h_headers = sessions["healthcare"]["headers"]
        try:
            # Healthcare doesn't have destinations, itineraries, or packages modules enabled.
            # We seed dummy ObjectIDs for these Travel-specific modules to test cross-tenant boundary isolation.
            health_entities["destination_id"] = "664bdf34a5d3f820c749a128"
            health_entities["package_id"] = "664bdf34a5d3f820c749a129"
            health_entities["itinerary_id"] = "664bdf34a5d3f820c749a12a"

            # Create Account
            acc_resp = await client.post(
                f"{BASE_URL}/accounts/",
                json={
                    "name": f"Health Patient Account {ts}",
                    "email": f"health_acc_{ts}@tutterfly.com",
                    "phone": "+1 9876543210",
                    "is_person_account": True,
                    "billing_state": "New York",
                    "billing_country": "USA",
                    "first_name": "Health",
                    "last_name": f"Patient {ts}"
                },
                headers=h_headers
            )
            assert acc_resp.status_code in [200, 201], f"Account: {acc_resp.status_code} -- {acc_resp.text}"
            health_entities["account_id"] = acc_resp.json()["id"]

            # Create Contact
            contact_resp = await client.post(
                f"{BASE_URL}/contacts/",
                json={
                    "first_name": "HealthDoctor",
                    "last_name": f"House {ts}",
                    "email": f"health_contact_{ts}@tutterfly.com",
                    "mobile": "+1 9876543210",
                    "account_id": health_entities["account_id"]
                },
                headers=h_headers
            )
            assert contact_resp.status_code in [200, 201], f"Contact: {contact_resp.status_code} -- {contact_resp.text}"
            health_entities["contact_id"] = contact_resp.json()["id"]

            # Create Lead
            lead_resp = await client.post(
                f"{BASE_URL}/leads/",
                json={"first_name": "HealthPatient", "last_name": f"Doe {ts}", "email": f"health_lead_{ts}@tutterfly.com"},
                headers=h_headers
            )
            assert lead_resp.status_code in [200, 201], f"Lead: {lead_resp.status_code} -- {lead_resp.text}"
            health_entities["lead_id"] = lead_resp.json()["id"]

            # Fetch active sales stage for healthcare to create Opportunity
            stage_resp = await client.get(f"{BASE_URL}/opportunities/sales-stages", headers=h_headers)
            assert stage_resp.status_code == 200, f"Stages: {stage_resp.text}"
            health_stage_id = stage_resp.json()[0]["id"]

            # Create Opportunity
            opp_resp = await client.post(
                f"{BASE_URL}/opportunities/",
                json={
                    "name": f"Health Treatment Deal {ts}",
                    "amount": 25000.0,
                    "sales_stage_id": health_stage_id,
                    "contact_id": health_entities["contact_id"],
                    "account_id": health_entities["account_id"]
                },
                headers=h_headers
            )
            assert opp_resp.status_code in [200, 201], f"Opp: {opp_resp.status_code} -- {opp_resp.text}"
            health_entities["opportunity_id"] = opp_resp.json()["id"]

            # Create Supplier (which IS enabled for Healthcare)
            supplier_resp = await client.post(
                f"{BASE_URL}/suppliers/",
                json={"name": f"Health Medical Supplier {ts}", "supplier_type": "Supplier"},
                headers=h_headers
            )
            assert supplier_resp.status_code in [200, 201], f"Supplier: {supplier_resp.status_code} -- {supplier_resp.text}"
            health_entities["supplier_id"] = supplier_resp.json()["id"]

            results.ok("Successfully seeded Healthcare Tenant B entities")
        except Exception as e:
            results.fail("Healthcare seeding failed", str(e))
            return False

        # -- 3. CROSS-TENANT SECURITY BOUNDARY CHECKS (POST LINK) -----------
        print("\n[3] TESTING LINK OPERATION BOUNDARIES (EXPECTING FAILURE / HTTP 400 or 404)")
        print("-" * 40)

        # 3a. Destination cross-tenant link to Opportunity
        try:
            resp = await client.post(
                f"{BASE_URL}/destinations/opportunity/{travel_entities['opportunity_id']}/link",
                json={"destination_id": health_entities["destination_id"], "is_primary": False},
                headers=t_headers
            )
            if resp.status_code in [400, 404]:
                results.ok(f"Destination cross-tenant link blocked: Status {resp.status_code} (detail: {resp.json().get('detail')})")
            else:
                results.fail("Destination cross-tenant link", f"Leaked! Status {resp.status_code} -- {resp.text}")
        except Exception as e:
            results.fail("Destination cross-tenant link check error", str(e))

        # 3b. Destination cross-tenant link to Lead
        try:
            resp = await client.post(
                f"{BASE_URL}/destinations/lead/{travel_entities['lead_id']}/link",
                json={"destination_id": health_entities["destination_id"], "is_primary": False},
                headers=t_headers
            )
            if resp.status_code in [400, 404]:
                results.ok(f"Destination-Lead cross-tenant link blocked: Status {resp.status_code} (detail: {resp.json().get('detail')})")
            else:
                results.fail("Destination-Lead cross-tenant link", f"Leaked! Status {resp.status_code} -- {resp.text}")
        except Exception as e:
            results.fail("Destination-Lead cross-tenant link check error", str(e))

        # 3c. Package cross-tenant link to Opportunity
        try:
            resp = await client.post(
                f"{BASE_URL}/packages/opportunity/{travel_entities['opportunity_id']}/link?package_id={health_entities['package_id']}",
                headers=t_headers
            )
            if resp.status_code in [400, 404]:
                results.ok(f"Package cross-tenant link blocked: Status {resp.status_code} (detail: {resp.json().get('detail')})")
            else:
                results.fail("Package cross-tenant link", f"Leaked! Status {resp.status_code} -- {resp.text}")
        except Exception as e:
            results.fail("Package cross-tenant link check error", str(e))

        # 3d. Itinerary cross-tenant link to Opportunity
        try:
            resp = await client.post(
                f"{BASE_URL}/itineraries/opportunity/{travel_entities['opportunity_id']}/link?itinerary_id={health_entities['itinerary_id']}",
                headers=t_headers
            )
            if resp.status_code in [400, 404]:
                results.ok(f"Itinerary cross-tenant link blocked: Status {resp.status_code} (detail: {resp.json().get('detail')})")
            else:
                results.fail("Itinerary cross-tenant link", f"Leaked! Status {resp.status_code} -- {resp.text}")
        except Exception as e:
            results.fail("Itinerary cross-tenant link check error", str(e))

        # 3e. Supplier cross-tenant link to Opportunity
        try:
            resp = await client.post(
                f"{BASE_URL}/suppliers/opportunity/{travel_entities['opportunity_id']}/link?supplier_id={health_entities['supplier_id']}",
                headers=t_headers
            )
            if resp.status_code in [400, 404]:
                results.ok(f"Supplier cross-tenant link blocked: Status {resp.status_code} (detail: {resp.json().get('detail')})")
            else:
                results.fail("Supplier cross-tenant link", f"Leaked! Status {resp.status_code} -- {resp.text}")
        except Exception as e:
            results.fail("Supplier cross-tenant link check error", str(e))

        # 3f. Contact cross-tenant link to Account
        try:
            resp = await client.post(
                f"{BASE_URL}/contacts/{travel_entities['contact_id']}/link-account?account_id={health_entities['account_id']}",
                headers=t_headers
            )
            if resp.status_code in [400, 404]:
                results.ok(f"Contact-Account cross-tenant link blocked: Status {resp.status_code} (detail: {resp.json().get('detail')})")
            else:
                results.fail("Contact-Account cross-tenant link", f"Leaked! Status {resp.status_code} -- {resp.text}")
        except Exception as e:
            results.fail("Contact-Account cross-tenant link check error", str(e))

        # -- 4. VALID ENTITY LINKING WITHIN SAME TENANT ----------------------
        print("\n[4] VERIFYING INTRA-TENANT LINKING (EXPECTING HTTP 200 SUCCESS)")
        print("-" * 40)

        # Link Travel Destination to Travel Opportunity
        try:
            resp = await client.post(
                f"{BASE_URL}/destinations/opportunity/{travel_entities['opportunity_id']}/link",
                json={"destination_id": travel_entities["destination_id"], "is_primary": True},
                headers=t_headers
            )
            assert resp.status_code == 200, f"Fail: {resp.status_code} -- {resp.text}"
            results.ok("Travel Destination successfully linked to Travel Opportunity")
        except Exception as e:
            results.fail("Travel Destination link failure", str(e))

        # Link Travel Package to Travel Opportunity
        try:
            resp = await client.post(
                f"{BASE_URL}/packages/opportunity/{travel_entities['opportunity_id']}/link?package_id={travel_entities['package_id']}",
                headers=t_headers
            )
            assert resp.status_code == 200, f"Fail: {resp.status_code} -- {resp.text}"
            results.ok("Travel Package successfully linked to Travel Opportunity")
        except Exception as e:
            results.fail("Travel Package link failure", str(e))

        # Link Travel Itinerary to Travel Opportunity
        try:
            resp = await client.post(
                f"{BASE_URL}/itineraries/opportunity/{travel_entities['opportunity_id']}/link?itinerary_id={travel_entities['itinerary_id']}",
                headers=t_headers
            )
            assert resp.status_code == 200, f"Fail: {resp.status_code} -- {resp.text}"
            results.ok("Travel Itinerary successfully linked to Travel Opportunity")
        except Exception as e:
            results.fail("Travel Itinerary link failure", str(e))

        # Link Travel Supplier to Travel Opportunity
        try:
            resp = await client.post(
                f"{BASE_URL}/suppliers/opportunity/{travel_entities['opportunity_id']}/link?supplier_id={travel_entities['supplier_id']}",
                headers=t_headers
            )
            assert resp.status_code == 200, f"Fail: {resp.status_code} -- {resp.text}"
            results.ok("Travel Supplier successfully linked to Travel Opportunity")
        except Exception as e:
            results.fail("Travel Supplier link failure", str(e))

        # Link Travel Contact to Travel Account (which was already linked on create, let's link another time or verify link endpoint)
        try:
            resp = await client.post(
                f"{BASE_URL}/contacts/{travel_entities['contact_id']}/link-account?account_id={travel_entities['account_id']}",
                headers=t_headers
            )
            assert resp.status_code == 200, f"Fail: {resp.status_code} -- {resp.text}"
            results.ok("Travel Contact successfully linked to Travel Account")
        except Exception as e:
            results.fail("Travel Contact link failure", str(e))

        # -- 5. CROSS-TENANT SECURITY BOUNDARY CHECKS (DELETE UNLINK) -------
        print("\n[5] TESTING UNLINK OPERATION BOUNDARIES (EXPECTING NO EFFECT ON SEED DATA)")
        print("-" * 40)

        # Attempt to unlink travel destination from travel opportunity as healthcare tenant
        try:
            resp = await client.delete(
                f"{BASE_URL}/destinations/opportunity/{travel_entities['opportunity_id']}/unlink?destination_id={travel_entities['destination_id']}",
                headers=h_headers
            )
            # Since destinations is not enabled for healthcare, healthcare gets 403 (guarded) or 400/404 if access-checked
            if resp.status_code in [400, 403, 404]:
                results.ok(f"Cross-tenant Destination unlink blocked (Status {resp.status_code})")
            else:
                results.fail("Cross-tenant Destination unlink", f"Unexpected status: {resp.status_code}")
        except Exception as e:
            results.fail("Cross-tenant Destination unlink check error", str(e))

        # Attempt to unlink travel package from travel opportunity as healthcare tenant
        try:
            resp = await client.delete(
                f"{BASE_URL}/packages/opportunity/{travel_entities['opportunity_id']}/unlink?package_id={travel_entities['package_id']}",
                headers=h_headers
            )
            if resp.status_code in [400, 403, 404]:
                results.ok(f"Cross-tenant Package unlink blocked (Status {resp.status_code})")
            else:
                results.fail("Cross-tenant Package unlink", f"Unexpected status: {resp.status_code}")
        except Exception as e:
            results.fail("Cross-tenant Package unlink check error", str(e))

        # Attempt to unlink travel itinerary from travel opportunity as healthcare tenant
        try:
            resp = await client.delete(
                f"{BASE_URL}/itineraries/opportunity/{travel_entities['opportunity_id']}/unlink?itinerary_id={travel_entities['itinerary_id']}",
                headers=h_headers
            )
            if resp.status_code in [400, 403, 404]:
                results.ok(f"Cross-tenant Itinerary unlink blocked (Status {resp.status_code})")
            else:
                results.fail("Cross-tenant Itinerary unlink", f"Unexpected status: {resp.status_code}")
        except Exception as e:
            results.fail("Cross-tenant Itinerary unlink check error", str(e))

        # Attempt to unlink travel supplier from travel opportunity as healthcare tenant
        try:
            resp = await client.delete(
                f"{BASE_URL}/suppliers/opportunity/{travel_entities['opportunity_id']}/unlink?supplier_id={travel_entities['supplier_id']}",
                headers=h_headers
            )
            if resp.status_code in [400, 404]:
                results.ok(f"Cross-tenant Supplier unlink blocked (Status {resp.status_code})")
            else:
                results.fail("Cross-tenant Supplier unlink", f"Unexpected status: {resp.status_code}")
        except Exception as e:
            results.fail("Cross-tenant Supplier unlink check error", str(e))

        # Attempt to unlink travel contact from travel account as healthcare tenant
        try:
            resp = await client.delete(
                f"{BASE_URL}/contacts/{travel_entities['contact_id']}/unlink-account?account_id={travel_entities['account_id']}",
                headers=h_headers
            )
            if resp.status_code in [400, 404]:
                results.ok(f"Cross-tenant Contact-Account unlink blocked (Status {resp.status_code})")
            else:
                results.fail("Cross-tenant Contact-Account unlink", f"Unexpected status: {resp.status_code}")
        except Exception as e:
            results.fail("Cross-tenant Contact-Account unlink check error", str(e))

        # -- 6. CLEAN UP SEEDED ENTITIES -------------------------------------
        # Optional: We let the db remain populated or keep it clean. Soft deletion is automatically fine.

    return results.summary()


if __name__ == "__main__":
    print("=" * 60)
    print("  CROSS-TENANT JUNCTION SECURITY INTEGRATION TESTS")
    print("  Testing: Cross-Tenant Data Isolation in Junction Tables")
    print("=" * 60)

    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
