"""
Import/Export Tenant-Isolation Test — Integration Harness.

Runs against a live backend (default: http://127.0.0.1:8000/api/v1) using the
same two pre-seeded tenants as test_tenant_isolation_matrix.py. Verifies:

  I1. Tenant A imports a CSV per module (lead / account / person account /
      contact) — rows land under Tenant A with A's importer as owner.
  I2. Tenant A's export contains the imported marker rows.
  I3. Tenant B's export does NOT contain Tenant A's marker rows (no leak).
  I4. Company-account export does not contain person accounts and vice versa
      (module separation on the shared `accounts` collection).
  I5. Sample download endpoints respond with CSV for an authenticated user.

Run:
    python tests/security/test_import_export_isolation.py
or via pytest:
    pytest -m security_isolation tests/security/test_import_export_isolation.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import time

import httpx

try:
    import pytest
    pytestmark = pytest.mark.security_isolation
except ImportError:  # standalone run
    pytest = None

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1")
TIMEOUT = 60.0

TENANTS = {
    "A": {"email": "admin@tutterfly.com", "password": "admin1", "label": "Travel (Tenant A)"},
    "B": {"email": "admin-health@tutterfly.com", "password": "admin1", "label": "Healthcare (Tenant B)"},
}

MARKER = f"IsoImpExp{int(time.time())}"


async def _login(client: httpx.AsyncClient, key: str) -> dict:
    creds = TENANTS[key]
    resp = await client.post(f"{BASE_URL}/auth/login", json={"email": creds["email"], "password": creds["password"]})
    if resp.status_code != 200:
        raise RuntimeError(f"Login failed for {creds['email']}: {resp.status_code} {resp.text[:200]}")
    data = resp.json()
    return {"label": creds["label"], "headers": {"Authorization": f"Bearer {data['access_token']}"}}


def _csv_upload(name: str, content: str):
    return {"file": (name, content.encode(), "text/csv")}


async def run() -> bool:
    passed, failed = [], []

    def check(name: str, cond: bool, detail: str = ""):
        if cond:
            passed.append(name)
            print(f"  [PASS] {name}")
        else:
            failed.append(f"{name}: {detail}")
            print(f"  [FAIL] {name} -- {detail}")

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        a = await _login(client, "A")
        b = await _login(client, "B")

        # ---------------- I1: imports as Tenant A ----------------
        lead_csv = (
            "First Name,Last Name,Email\n"
            f"{MARKER}Lead,Isolation,{MARKER.lower()}.lead@example.com\n"
        )
        resp = await client.post(f"{BASE_URL}/leads/import", headers=a["headers"],
                                 files=_csv_upload("leads.csv", lead_csv))
        check("I1 lead import (A)", resp.status_code == 200 and resp.json().get("data", {}).get("imported") == 1,
              f"{resp.status_code} {resp.text[:200]}")

        account_csv = f"Name,Email\n{MARKER} Corp,{MARKER.lower()}.acct@example.com\n"
        resp = await client.post(f"{BASE_URL}/accounts/import", headers=a["headers"],
                                 files=_csv_upload("accounts.csv", account_csv))
        check("I1 account import (A)", resp.status_code == 200 and resp.json().get("imported") == 1,
              f"{resp.status_code} {resp.text[:200]}")

        person_csv = (
            "First Name,Last Name,Email\n"
            f"{MARKER}Person,Isolation,{MARKER.lower()}.person@example.com\n"
        )
        resp = await client.post(f"{BASE_URL}/accounts/import?is_person_account=true", headers=a["headers"],
                                 files=_csv_upload("person_accounts.csv", person_csv))
        check("I1 person account import (A)", resp.status_code == 200 and resp.json().get("imported") == 1,
              f"{resp.status_code} {resp.text[:200]}")

        contact_csv = (
            "First Name,Last Name,Email,Account Name\n"
            f"{MARKER}Contact,Isolation,{MARKER.lower()}.contact@example.com,{MARKER} Corp\n"
        )
        resp = await client.post(f"{BASE_URL}/contacts/import", headers=a["headers"],
                                 files=_csv_upload("contacts.csv", contact_csv))
        check("I1 contact import (A, linked to imported account)",
              resp.status_code == 200 and resp.json().get("imported") == 1,
              f"{resp.status_code} {resp.text[:200]}")

        # ---------------- I2 / I3: exports ----------------
        exports = [
            ("leads", f"{BASE_URL}/leads/export/csv"),
            ("accounts", f"{BASE_URL}/accounts/export/csv"),
            ("person accounts", f"{BASE_URL}/accounts/export/csv?is_person_account=true"),
            ("contacts", f"{BASE_URL}/contacts/export/csv"),
        ]
        for label, url in exports:
            resp = await client.get(url, headers=a["headers"])
            body = resp.text if resp.status_code == 200 else ""
            check(f"I2 {label} export (A) contains marker", resp.status_code == 200 and MARKER in body,
                  f"{resp.status_code}, marker {'missing' if resp.status_code == 200 else 'n/a'}")

            resp_b = await client.get(url, headers=b["headers"])
            body_b = resp_b.text if resp_b.status_code == 200 else ""
            check(f"I3 {label} export (B) has NO Tenant-A marker",
                  resp_b.status_code == 200 and MARKER not in body_b,
                  f"{resp_b.status_code}, leak={MARKER in body_b}")

        # ---------------- I4: module separation on accounts ----------------
        resp = await client.get(f"{BASE_URL}/accounts/export/csv", headers=a["headers"])
        check("I4 company export (A) excludes person accounts",
              resp.status_code == 200 and f"{MARKER}Person" not in resp.text,
              f"{resp.status_code}")
        resp = await client.get(f"{BASE_URL}/accounts/export/csv?is_person_account=true", headers=a["headers"])
        check("I4 person export (A) excludes company accounts",
              resp.status_code == 200 and f"{MARKER} Corp" not in resp.text,
              f"{resp.status_code}")

        # ---------------- I5: sample downloads ----------------
        samples = [
            ("leads", f"{BASE_URL}/leads/import/sample"),
            ("accounts", f"{BASE_URL}/accounts/import/sample"),
            ("person accounts", f"{BASE_URL}/accounts/import/sample?is_person_account=true"),
            ("contacts", f"{BASE_URL}/contacts/import/sample"),
        ]
        for label, url in samples:
            resp = await client.get(url, headers=a["headers"])
            check(f"I5 {label} sample download",
                  resp.status_code == 200 and "First Name" in resp.text or "Name" in resp.text,
                  f"{resp.status_code}")

    print()
    print("=" * 64)
    print(f"  RESULTS: {len(passed)} passed, {len(failed)} failed")
    for f in failed:
        print(f"    - {f}")
    print("=" * 64)
    return not failed


def test_import_export_isolation():
    assert asyncio.run(run()), "import/export tenant isolation failures (see output)"


if __name__ == "__main__":
    sys.exit(0 if asyncio.run(run()) else 1)
