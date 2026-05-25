"""
Hierarchy-Wise Data Isolation & Role-Based Access Control Integration Tests

Tests that:
1. Hierarchy scoping correctly controls which records each user can see
2. RBAC permission checks block users without required permissions (HTTP 403)
3. Cross-tenant hierarchy isolation works correctly
4. Single-record GET enforces visibility scope

Run:  python tests/test_hierarchy_rbac.py
"""

import asyncio
import sys
import os
import time
import httpx
from typing import Dict, Any, Optional, List

# --- Configuration -------------------------------------------------------

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1")
TS = int(time.time())
PASSWORD = "TestPass123!"

ADMIN_CREDS = {
    "email": "admin@tutterfly.com",
    "password": "admin1",
}

HEALTHCARE_CREDS = {
    "email": "admin-health@tutterfly.com",
    "password": "admin1",
}


# --- Helpers --------------------------------------------------------------

async def login(client: httpx.AsyncClient, email: str, password: str) -> Dict[str, Any]:
    resp = await client.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.status_code} -- {resp.text}"
    return resp.json()


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
        print(f"  Hierarchy & RBAC Results: {self.passed}/{total} passed, {self.failed} failed")
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

    # Storage for seeded entity IDs (for cleanup)
    seeded_hierarchy_ids: List[str] = []
    seeded_role_ids: List[str] = []
    seeded_user_ids: List[str] = []
    seeded_lead_ids: List[str] = []
    seeded_opp_ids: List[str] = []
    seeded_account_ids: List[str] = []

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:

        # ==================================================================
        # SECTION 1: SETUP & SEEDING
        # ==================================================================
        print("\n[1] SETUP & SEEDING")
        print("-" * 40)

        # 1a. Login as admin
        try:
            admin_data = await login(client, ADMIN_CREDS["email"], ADMIN_CREDS["password"])
            admin_headers = {"Authorization": f"Bearer {admin_data['access_token']}"}
            admin_tenant_id = admin_data["user"]["tenant_id"]
            results.ok("Admin login successful")
        except Exception as e:
            results.fail("Admin login", str(e))
            return results.summary()

        # 1b. Create hierarchy nodes
        #   Manager Node (root)
        #     ├── PeerA Node
        #     │     └── SubA Node
        #     └── PeerB Node
        #   Isolated Node (separate root)

        hierarchy_map = {}
        try:
            # Manager Node (root)
            resp = await client.post(f"{BASE_URL}/hierarchies/", json={
                "name": f"HT_Manager_{TS}", "level": 0
            }, headers=admin_headers)
            assert resp.status_code == 201, f"Manager node: {resp.status_code} -- {resp.text}"
            hierarchy_map["manager"] = resp.json()["id"]
            seeded_hierarchy_ids.append(hierarchy_map["manager"])

            # PeerA Node (child of Manager)
            resp = await client.post(f"{BASE_URL}/hierarchies/", json={
                "name": f"HT_PeerA_{TS}", "level": 1, "parent_id": hierarchy_map["manager"]
            }, headers=admin_headers)
            assert resp.status_code == 201, f"PeerA node: {resp.status_code} -- {resp.text}"
            hierarchy_map["peer_a"] = resp.json()["id"]
            seeded_hierarchy_ids.append(hierarchy_map["peer_a"])

            # PeerB Node (child of Manager)
            resp = await client.post(f"{BASE_URL}/hierarchies/", json={
                "name": f"HT_PeerB_{TS}", "level": 1, "parent_id": hierarchy_map["manager"]
            }, headers=admin_headers)
            assert resp.status_code == 201, f"PeerB node: {resp.status_code} -- {resp.text}"
            hierarchy_map["peer_b"] = resp.json()["id"]
            seeded_hierarchy_ids.append(hierarchy_map["peer_b"])

            # SubA Node (child of PeerA)
            resp = await client.post(f"{BASE_URL}/hierarchies/", json={
                "name": f"HT_SubA_{TS}", "level": 2, "parent_id": hierarchy_map["peer_a"]
            }, headers=admin_headers)
            assert resp.status_code == 201, f"SubA node: {resp.status_code} -- {resp.text}"
            hierarchy_map["sub_a"] = resp.json()["id"]
            seeded_hierarchy_ids.append(hierarchy_map["sub_a"])

            # Isolated Node (separate root)
            resp = await client.post(f"{BASE_URL}/hierarchies/", json={
                "name": f"HT_Isolated_{TS}", "level": 0
            }, headers=admin_headers)
            assert resp.status_code == 201, f"Isolated node: {resp.status_code} -- {resp.text}"
            hierarchy_map["isolated"] = resp.json()["id"]
            seeded_hierarchy_ids.append(hierarchy_map["isolated"])

            results.ok(f"Created 5 hierarchy nodes")
        except Exception as e:
            results.fail("Hierarchy seeding", str(e))
            return results.summary()

        # 1c. Create roles
        role_map = {}
        try:
            # View-only role (can view leads, opportunities, accounts, contacts, tasks)
            view_perms = [
                "view_lead", "create_lead", "edit_lead",
                "view_opportunity", "create_opportunity", "edit_opportunity",
                "view_account", "create_account", "edit_account",
                "view_contact", "create_contact", "edit_contact",
                "view_task", "create_task",
                "view_user", "view_role",
                "view_hierarchy",
                "view_dashboard",
            ]
            resp = await client.post(f"{BASE_URL}/roles/", json={
                "name": f"ht_view_role_{TS}",
                "display_name": f"HT View Role {TS}",
                "permissions": view_perms,
                "is_admin": False
            }, headers=admin_headers)
            assert resp.status_code == 201, f"View role: {resp.status_code} -- {resp.text}"
            role_map["view"] = resp.json()["id"]
            seeded_role_ids.append(role_map["view"])

            # No-permission role (completely empty)
            resp = await client.post(f"{BASE_URL}/roles/", json={
                "name": f"ht_noperm_role_{TS}",
                "display_name": f"HT No Perms {TS}",
                "permissions": [],
                "is_admin": False
            }, headers=admin_headers)
            assert resp.status_code == 201, f"NoPerm role: {resp.status_code} -- {resp.text}"
            role_map["noperm"] = resp.json()["id"]
            seeded_role_ids.append(role_map["noperm"])

            results.ok("Created 2 roles (view + no-perm)")
        except Exception as e:
            results.fail("Role seeding", str(e))
            return results.summary()

        # 1d. Create users assigned to hierarchy nodes
        user_map = {}  # key -> {"id": ..., "headers": ..., "email": ...}
        user_configs = [
            ("manager",  f"ht_manager_{TS}@test.com",  f"HT Manager {TS}",  hierarchy_map["manager"],  role_map["view"]),
            ("peer_a",   f"ht_peera_{TS}@test.com",    f"HT PeerA {TS}",    hierarchy_map["peer_a"],   role_map["view"]),
            ("peer_b",   f"ht_peerb_{TS}@test.com",    f"HT PeerB {TS}",    hierarchy_map["peer_b"],   role_map["view"]),
            ("sub_a",    f"ht_suba_{TS}@test.com",     f"HT SubA {TS}",     hierarchy_map["sub_a"],    role_map["view"]),
            ("isolated", f"ht_isolated_{TS}@test.com", f"HT Isolated {TS}", hierarchy_map["isolated"], role_map["view"]),
            ("no_perm",  f"ht_noperm_{TS}@test.com",  f"HT NoPerm {TS}",   hierarchy_map["peer_a"],   role_map["noperm"]),
        ]

        try:
            for key, email, name, hier_id, role_id in user_configs:
                resp = await client.post(f"{BASE_URL}/users/", json={
                    "name": name,
                    "email": email,
                    "password": PASSWORD,
                    "role_hierarchy_id": hier_id,
                    "role_ids": [role_id],
                    "is_active": True
                }, headers=admin_headers)
                assert resp.status_code == 201, f"User {key}: {resp.status_code} -- {resp.text}"
                user_id = resp.json()["id"]
                seeded_user_ids.append(user_id)

                # Login as this user
                login_data = await login(client, email, PASSWORD)
                user_map[key] = {
                    "id": user_id,
                    "email": email,
                    "headers": {"Authorization": f"Bearer {login_data['access_token']}"},
                }

            results.ok(f"Created and logged in 6 test users")
        except Exception as e:
            results.fail("User seeding", str(e))
            # Attempt cleanup before aborting
            await _cleanup(client, admin_headers, seeded_lead_ids, seeded_opp_ids, seeded_account_ids,
                          seeded_user_ids, seeded_role_ids, seeded_hierarchy_ids)
            return results.summary()

        # 1e. Create test data owned by each user
        # We need to create leads and accounts via each user's own token so owner_id = that user
        lead_map = {}   # key -> lead_id
        opp_map = {}    # key -> opp_id
        account_map = {}  # key -> account_id

        data_users = ["manager", "peer_a", "peer_b", "sub_a", "isolated"]
        try:
            for key in data_users:
                h = user_map[key]["headers"]

                # Create a lead
                resp = await client.post(f"{BASE_URL}/leads/", json={
                    "first_name": f"Lead_{key}",
                    "last_name": f"Test_{TS}",
                    "email": f"lead_{key}_{TS}@test.com",
                }, headers=h)
                assert resp.status_code in [200, 201], f"Lead {key}: {resp.status_code} -- {resp.text}"
                lead_map[key] = resp.json()["id"]
                seeded_lead_ids.append(lead_map[key])

                # Create an account
                resp = await client.post(f"{BASE_URL}/accounts/", json={
                    "name": f"Account_{key}_{TS}",
                    "email": f"account_{key}_{TS}@test.com",
                    "phone": "+1 1234567890",
                    "is_person_account": True,
                    "billing_state": "Test",
                    "billing_country": "IND",
                    "first_name": f"AccFirst_{key}",
                    "last_name": f"AccLast_{TS}"
                }, headers=h)
                assert resp.status_code in [200, 201], f"Account {key}: {resp.status_code} -- {resp.text}"
                account_map[key] = resp.json()["id"]
                seeded_account_ids.append(account_map[key])

            # Create opportunities (requires sales stage)
            # Get a sales stage for the travel tenant
            stage_resp = await client.get(f"{BASE_URL}/opportunities/sales-stages", headers=admin_headers)
            assert stage_resp.status_code == 200, f"Sales stages: {stage_resp.text}"
            travel_stage_id = stage_resp.json()[0]["id"]

            for key in data_users:
                h = user_map[key]["headers"]
                resp = await client.post(f"{BASE_URL}/opportunities/", json={
                    "name": f"Opp_{key}_{TS}",
                    "amount": 5000.0,
                    "sales_stage_id": travel_stage_id,
                    "account_id": account_map[key],
                }, headers=h)
                assert resp.status_code in [200, 201], f"Opp {key}: {resp.status_code} -- {resp.text}"
                opp_map[key] = resp.json()["id"]
                seeded_opp_ids.append(opp_map[key])

            results.ok(f"Created {len(lead_map)} leads, {len(account_map)} accounts, {len(opp_map)} opportunities")
        except Exception as e:
            results.fail("Test data seeding", str(e))
            await _cleanup(client, admin_headers, seeded_lead_ids, seeded_opp_ids, seeded_account_ids,
                          seeded_user_ids, seeded_role_ids, seeded_hierarchy_ids)
            return results.summary()

        # ==================================================================
        # SECTION 2: HIERARCHY DATA ISOLATION
        # ==================================================================
        print("\n[2] HIERARCHY DATA ISOLATION -- LEADS")
        print("-" * 40)

        # Helper: get all lead IDs visible to a user
        async def get_visible_lead_ids(headers: dict) -> List[str]:
            resp = await client.get(f"{BASE_URL}/leads/", params={"page": 1, "per_page": 100, "view": "all"}, headers=headers)
            if resp.status_code != 200:
                return []
            leads = resp.json().get("leads", [])
            return [ld["id"] for ld in leads]

        # Expected visibility:
        #   admin     -> all 5 leads
        #   manager   -> manager + peer_a + peer_b + sub_a leads (4)
        #   peer_a    -> peer_a + sub_a leads (2)
        #   peer_b    -> peer_b leads only (1)
        #   sub_a     -> sub_a leads only (1)
        #   isolated  -> isolated leads only (1)

        visibility_checks_leads = [
            # (user_key, expected_visible_keys, test_description)
            ("manager",  ["manager", "peer_a", "peer_b", "sub_a"], "Manager sees own + all subordinates' leads"),
            ("peer_a",   ["peer_a", "sub_a"],                      "PeerA sees own + SubA leads"),
            ("peer_b",   ["peer_b"],                                "PeerB sees only own leads"),
            ("sub_a",    ["sub_a"],                                 "SubA sees only own leads"),
            ("isolated", ["isolated"],                              "Isolated sees only own leads"),
        ]

        for user_key, expected_keys, desc in visibility_checks_leads:
            try:
                visible_ids = await get_visible_lead_ids(user_map[user_key]["headers"])
                expected_ids = {lead_map[k] for k in expected_keys}
                # Filter to only our test leads (there may be pre-existing leads)
                our_visible = {lid for lid in visible_ids if lid in set(lead_map.values())}

                if our_visible == expected_ids:
                    results.ok(f"Leads: {desc}")
                else:
                    missing = expected_ids - our_visible
                    extra = our_visible - expected_ids
                    detail = ""
                    if missing:
                        detail += f"missing={[k for k,v in lead_map.items() if v in missing]} "
                    if extra:
                        detail += f"extra={[k for k,v in lead_map.items() if v in extra]}"
                    results.fail(f"Leads: {desc}", detail)
            except Exception as e:
                results.fail(f"Leads: {desc}", str(e))

        # Admin sees all leads
        try:
            admin_visible = await get_visible_lead_ids(admin_headers)
            our_admin_visible = {lid for lid in admin_visible if lid in set(lead_map.values())}
            if our_admin_visible == set(lead_map.values()):
                results.ok("Leads: Admin sees all 5 test leads")
            else:
                results.fail("Leads: Admin visibility", f"Expected all 5 test leads, got {len(our_admin_visible)}")
        except Exception as e:
            results.fail("Leads: Admin visibility", str(e))

        # Peer isolation
        try:
            peer_a_visible = await get_visible_lead_ids(user_map["peer_a"]["headers"])
            if lead_map["peer_b"] not in peer_a_visible:
                results.ok("Leads: PeerA cannot see PeerB's lead (peer isolation)")
            else:
                results.fail("Leads: PeerA sees PeerB", "Peer isolation broken!")
        except Exception as e:
            results.fail("Leads: Peer isolation", str(e))

        try:
            peer_b_visible = await get_visible_lead_ids(user_map["peer_b"]["headers"])
            if lead_map["peer_a"] not in peer_b_visible:
                results.ok("Leads: PeerB cannot see PeerA's lead (peer isolation)")
            else:
                results.fail("Leads: PeerB sees PeerA", "Peer isolation broken!")
        except Exception as e:
            results.fail("Leads: Peer isolation B->A", str(e))

        # ---- OPPORTUNITIES VISIBILITY ----
        print("\n[2b] HIERARCHY DATA ISOLATION -- OPPORTUNITIES")
        print("-" * 40)

        async def get_visible_opp_ids(headers: dict) -> List[str]:
            resp = await client.get(f"{BASE_URL}/opportunities/", params={"page": 1, "per_page": 100, "view": "all"}, headers=headers)
            if resp.status_code != 200:
                return []
            opps = resp.json().get("opportunities", [])
            return [o["id"] for o in opps]

        visibility_checks_opps = [
            ("manager",  ["manager", "peer_a", "peer_b", "sub_a"], "Manager sees own + subordinates' opps"),
            ("peer_a",   ["peer_a", "sub_a"],                      "PeerA sees own + SubA opps"),
            ("peer_b",   ["peer_b"],                                "PeerB sees only own opps"),
            ("sub_a",    ["sub_a"],                                 "SubA sees only own opps"),
            ("isolated", ["isolated"],                              "Isolated sees only own opps"),
        ]

        for user_key, expected_keys, desc in visibility_checks_opps:
            try:
                visible_ids = await get_visible_opp_ids(user_map[user_key]["headers"])
                expected_ids = {opp_map[k] for k in expected_keys}
                our_visible = {oid for oid in visible_ids if oid in set(opp_map.values())}

                if our_visible == expected_ids:
                    results.ok(f"Opps: {desc}")
                else:
                    missing = expected_ids - our_visible
                    extra = our_visible - expected_ids
                    detail = ""
                    if missing:
                        detail += f"missing={[k for k,v in opp_map.items() if v in missing]} "
                    if extra:
                        detail += f"extra={[k for k,v in opp_map.items() if v in extra]}"
                    results.fail(f"Opps: {desc}", detail)
            except Exception as e:
                results.fail(f"Opps: {desc}", str(e))

        # Admin sees all opps (among test opps)
        try:
            admin_opp_visible = await get_visible_opp_ids(admin_headers)
            our_admin_opps = {oid for oid in admin_opp_visible if oid in set(opp_map.values())}
            if our_admin_opps == set(opp_map.values()):
                results.ok("Opps: Admin sees all 5 test opportunities")
            else:
                results.fail("Opps: Admin visibility", f"Expected all 5, got {len(our_admin_opps)}")
        except Exception as e:
            results.fail("Opps: Admin visibility", str(e))

        # Opp peer isolation
        try:
            peer_a_opps = await get_visible_opp_ids(user_map["peer_a"]["headers"])
            if opp_map["peer_b"] not in peer_a_opps:
                results.ok("Opps: PeerA cannot see PeerB's opportunity")
            else:
                results.fail("Opps: PeerA sees PeerB opp", "Peer isolation broken!")
        except Exception as e:
            results.fail("Opps: Peer isolation", str(e))

        # ---- ACCOUNTS VISIBILITY ----
        print("\n[2c] HIERARCHY DATA ISOLATION -- ACCOUNTS")
        print("-" * 40)

        async def get_visible_account_ids(headers: dict) -> List[str]:
            resp = await client.get(f"{BASE_URL}/accounts/", params={"skip": 0, "limit": 100}, headers=headers)
            if resp.status_code != 200:
                return []
            accounts = resp.json().get("accounts", [])
            return [a["id"] for a in accounts]

        visibility_checks_accounts = [
            ("manager",  ["manager", "peer_a", "peer_b", "sub_a"], "Manager sees own + subordinates' accounts"),
            ("peer_a",   ["peer_a", "sub_a"],                      "PeerA sees own + SubA accounts"),
            ("peer_b",   ["peer_b"],                                "PeerB sees only own accounts"),
            ("sub_a",    ["sub_a"],                                 "SubA sees only own accounts"),
            ("isolated", ["isolated"],                              "Isolated sees only own accounts"),
        ]

        for user_key, expected_keys, desc in visibility_checks_accounts:
            try:
                visible_ids = await get_visible_account_ids(user_map[user_key]["headers"])
                expected_ids = {account_map[k] for k in expected_keys}
                our_visible = {aid for aid in visible_ids if aid in set(account_map.values())}

                if our_visible == expected_ids:
                    results.ok(f"Accounts: {desc}")
                else:
                    missing = expected_ids - our_visible
                    extra = our_visible - expected_ids
                    detail = ""
                    if missing:
                        detail += f"missing={[k for k,v in account_map.items() if v in missing]} "
                    if extra:
                        detail += f"extra={[k for k,v in account_map.items() if v in extra]}"
                    results.fail(f"Accounts: {desc}", detail)
            except Exception as e:
                results.fail(f"Accounts: {desc}", str(e))

        # Admin sees all accounts
        try:
            admin_acc_visible = await get_visible_account_ids(admin_headers)
            our_admin_accs = {aid for aid in admin_acc_visible if aid in set(account_map.values())}
            if our_admin_accs == set(account_map.values()):
                results.ok("Accounts: Admin sees all 5 test accounts")
            else:
                results.fail("Accounts: Admin visibility", f"Expected all 5, got {len(our_admin_accs)}")
        except Exception as e:
            results.fail("Accounts: Admin visibility", str(e))

        # ==================================================================
        # SECTION 3: RBAC PERMISSION ENFORCEMENT
        # ==================================================================
        print("\n[3] RBAC PERMISSION ENFORCEMENT (no_perm_user expects 403)")
        print("-" * 40)

        np_headers = user_map["no_perm"]["headers"]

        rbac_checks = [
            ("GET",  "/leads/",          "view_lead"),
            ("POST", "/leads/",          "create_lead"),
            ("GET",  "/opportunities/",  "view_opportunity"),
            ("GET",  "/accounts/",       "view_account"),
            ("GET",  "/contacts/",       "view_contact"),
            ("GET",  "/tasks/",          "view_task"),
            ("GET",  "/users/",          "view_user"),
            ("GET",  "/roles/",          "view_role"),
            ("GET",  "/hierarchies/",    "view_hierarchy"),
        ]

        for method, path, perm_name in rbac_checks:
            try:
                if method == "GET":
                    resp = await client.get(f"{BASE_URL}{path}", headers=np_headers)
                else:
                    resp = await client.post(f"{BASE_URL}{path}", json={}, headers=np_headers)

                if resp.status_code == 403:
                    results.ok(f"RBAC: {method} {path} 403 (missing {perm_name})")
                else:
                    results.fail(f"RBAC: {method} {path}", f"Expected 403, got {resp.status_code}")
            except Exception as e:
                results.fail(f"RBAC: {method} {path}", str(e))

        # Verify that a user WITH permissions can access those same endpoints
        print("\n[3b] RBAC -- user WITH permissions gets 200")
        print("-" * 40)

        pa_headers = user_map["peer_a"]["headers"]

        rbac_positive_checks = [
            ("GET", "/leads/",          "view_lead"),
            ("GET", "/opportunities/",  "view_opportunity"),
            ("GET", "/accounts/",       "view_account"),
            ("GET", "/contacts/",       "view_contact"),
            ("GET", "/users/",          "view_user"),
            ("GET", "/roles/",          "view_role"),
            ("GET", "/hierarchies/",    "view_hierarchy"),
        ]

        for method, path, perm_name in rbac_positive_checks:
            try:
                resp = await client.get(f"{BASE_URL}{path}", headers=pa_headers)
                if resp.status_code == 200:
                    results.ok(f"RBAC: PeerA {method} {path} -> 200 (has {perm_name})")
                else:
                    results.fail(f"RBAC: PeerA {method} {path}", f"Expected 200, got {resp.status_code}")
            except Exception as e:
                results.fail(f"RBAC: PeerA {method} {path}", str(e))

        # ==================================================================
        # SECTION 4: CROSS-TENANT HIERARCHY ISOLATION
        # ==================================================================
        print("\n[4] CROSS-TENANT HIERARCHY ISOLATION")
        print("-" * 40)

        try:
            health_data = await login(client, HEALTHCARE_CREDS["email"], HEALTHCARE_CREDS["password"])
            health_headers = {"Authorization": f"Bearer {health_data['access_token']}"}
            results.ok("Healthcare admin login successful")
        except Exception as e:
            results.fail("Healthcare login", str(e))
            health_headers = None

        if health_headers:
            # Healthcare should not see travel hierarchies
            try:
                resp = await client.get(f"{BASE_URL}/hierarchies/", headers=health_headers)
                if resp.status_code == 200:
                    h_list = resp.json().get("hierarchies", [])
                    travel_leaked = [h for h in h_list if f"HT_" in h.get("name", "")]
                    if len(travel_leaked) == 0:
                        results.ok("Healthcare sees 0 travel hierarchy nodes (isolated)")
                    else:
                        results.fail("Cross-tenant hierarchy leak", f"Healthcare sees {len(travel_leaked)} travel nodes!")
                else:
                    results.ok(f"Healthcare hierarchies endpoint: {resp.status_code} (access controlled)")
            except Exception as e:
                results.fail("Cross-tenant hierarchy check", str(e))

            # Healthcare should not see travel leads
            try:
                resp = await client.get(f"{BASE_URL}/leads/", params={"page": 1, "per_page": 100, "view": "all"}, headers=health_headers)
                if resp.status_code == 200:
                    h_leads = resp.json().get("leads", [])
                    travel_lead_names = [l for l in h_leads if "Lead_manager" in l.get("first_name", "") or "Lead_peer" in l.get("first_name", "")]
                    if len(travel_lead_names) == 0:
                        results.ok("Healthcare sees 0 travel test leads (isolated)")
                    else:
                        results.fail("Cross-tenant lead leak", f"Healthcare sees travel leads!")
                else:
                    results.ok(f"Healthcare leads: {resp.status_code}")
            except Exception as e:
                results.fail("Cross-tenant lead check", str(e))

            # Healthcare should not see travel opportunities
            try:
                resp = await client.get(f"{BASE_URL}/opportunities/", params={"page": 1, "per_page": 100}, headers=health_headers)
                if resp.status_code == 200:
                    h_opps = resp.json().get("opportunities", [])
                    travel_opp_names = [o for o in h_opps if f"Opp_" in o.get("name", "") and f"_{TS}" in o.get("name", "")]
                    if len(travel_opp_names) == 0:
                        results.ok("Healthcare sees 0 travel test opportunities (isolated)")
                    else:
                        results.fail("Cross-tenant opp leak", f"Healthcare sees travel opps!")
                else:
                    results.ok(f"Healthcare opps: {resp.status_code}")
            except Exception as e:
                results.fail("Cross-tenant opp check", str(e))

            # Travel admin should not see healthcare test data via hierarchy
            try:
                resp = await client.get(f"{BASE_URL}/leads/", params={"page": 1, "per_page": 100, "view": "all"}, headers=admin_headers)
                if resp.status_code == 200:
                    travel_leads = resp.json().get("leads", [])
                    health_leaked = [l for l in travel_leads if "health" in (l.get("email", "") or "").lower() and f"_{TS}" in (l.get("email", "") or "")]
                    if len(health_leaked) == 0:
                        results.ok("Travel admin sees 0 healthcare leads (cross-tenant isolation)")
                    else:
                        results.fail("Cross-tenant leak travel->health", f"Found {len(health_leaked)} healthcare leads!")
            except Exception as e:
                results.fail("Cross-tenant travel->health check", str(e))

        # ==================================================================
        # SECTION 5: SINGLE-RECORD ACCESS ENFORCEMENT
        # ==================================================================
        print("\n[5] SINGLE-RECORD ACCESS ENFORCEMENT")
        print("-" * 40)

        # PeerB cannot access PeerA's lead by ID
        try:
            resp = await client.get(f"{BASE_URL}/leads/{lead_map['peer_a']}", headers=user_map["peer_b"]["headers"])
            if resp.status_code == 404:
                results.ok("PeerB cannot access PeerA's lead by ID (404)")
            else:
                results.fail("Single-record: PeerB->PeerA lead", f"Expected 404, got {resp.status_code}")
        except Exception as e:
            results.fail("Single-record: PeerB->PeerA lead", str(e))

        # PeerA cannot access PeerB's lead by ID
        try:
            resp = await client.get(f"{BASE_URL}/leads/{lead_map['peer_b']}", headers=user_map["peer_a"]["headers"])
            if resp.status_code == 404:
                results.ok("PeerA cannot access PeerB's lead by ID (404)")
            else:
                results.fail("Single-record: PeerA->PeerB lead", f"Expected 404, got {resp.status_code}")
        except Exception as e:
            results.fail("Single-record: PeerA->PeerB lead", str(e))

        # Isolated cannot access Manager's opportunity by ID
        try:
            resp = await client.get(f"{BASE_URL}/opportunities/{opp_map['manager']}", headers=user_map["isolated"]["headers"])
            if resp.status_code == 404:
                results.ok("Isolated cannot access Manager's opp by ID (404)")
            else:
                results.fail("Single-record: Isolated->Manager opp", f"Expected 404, got {resp.status_code}")
        except Exception as e:
            results.fail("Single-record: Isolated->Manager opp", str(e))

        # Manager CAN access SubA's lead by ID (subordinate)
        try:
            resp = await client.get(f"{BASE_URL}/leads/{lead_map['sub_a']}", headers=user_map["manager"]["headers"])
            if resp.status_code == 200:
                results.ok("Manager CAN access SubA's lead by ID (subordinate)")
            else:
                results.fail("Single-record: Manager->SubA lead", f"Expected 200, got {resp.status_code}")
        except Exception as e:
            results.fail("Single-record: Manager->SubA lead", str(e))

        # PeerA CAN access SubA's lead by ID (subordinate)
        try:
            resp = await client.get(f"{BASE_URL}/leads/{lead_map['sub_a']}", headers=user_map["peer_a"]["headers"])
            if resp.status_code == 200:
                results.ok("PeerA CAN access SubA's lead by ID (subordinate)")
            else:
                results.fail("Single-record: PeerA->SubA lead", f"Expected 200, got {resp.status_code}")
        except Exception as e:
            results.fail("Single-record: PeerA->SubA lead", str(e))

        # PeerB CANNOT access SubA's lead by ID (not in hierarchy)
        try:
            resp = await client.get(f"{BASE_URL}/leads/{lead_map['sub_a']}", headers=user_map["peer_b"]["headers"])
            if resp.status_code == 404:
                results.ok("PeerB CANNOT access SubA's lead by ID (not subordinate)")
            else:
                results.fail("Single-record: PeerB->SubA lead", f"Expected 404, got {resp.status_code}")
        except Exception as e:
            results.fail("Single-record: PeerB->SubA lead", str(e))

        # ==================================================================
        # SECTION 6: CLEANUP
        # ==================================================================
        print("\n[6] CLEANUP")
        print("-" * 40)

        await _cleanup(client, admin_headers, seeded_lead_ids, seeded_opp_ids, seeded_account_ids,
                      seeded_user_ids, seeded_role_ids, seeded_hierarchy_ids)
        results.ok("Cleanup completed")

    return results.summary()


async def _cleanup(client, admin_headers, lead_ids, opp_ids, account_ids, user_ids, role_ids, hierarchy_ids):
    """Clean up all seeded test data in reverse dependency order."""

    # Delete leads
    for lid in lead_ids:
        try:
            await client.delete(f"{BASE_URL}/leads/{lid}", headers=admin_headers)
        except Exception:
            pass

    # Delete opportunities
    for oid in opp_ids:
        try:
            await client.delete(f"{BASE_URL}/opportunities/{oid}", headers=admin_headers)
        except Exception:
            pass

    # Delete accounts
    for aid in account_ids:
        try:
            await client.delete(f"{BASE_URL}/accounts/{aid}", headers=admin_headers)
        except Exception:
            pass

    # Delete users
    for uid in user_ids:
        try:
            await client.delete(f"{BASE_URL}/users/{uid}", headers=admin_headers)
        except Exception:
            pass

    # Delete roles
    for rid in role_ids:
        try:
            await client.delete(f"{BASE_URL}/roles/{rid}", headers=admin_headers)
        except Exception:
            pass

    # Delete hierarchy nodes (children first, parents last)
    for hid in reversed(hierarchy_ids):
        try:
            await client.delete(f"{BASE_URL}/hierarchies/{hid}", headers=admin_headers)
        except Exception:
            pass


if __name__ == "__main__":
    print("=" * 60)
    print("  HIERARCHY DATA ISOLATION & RBAC INTEGRATION TESTS")
    print("  Testing: Hierarchy Scoping, Permission Enforcement, Isolation")
    print("=" * 60)

    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
