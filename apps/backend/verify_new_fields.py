"""Verify standard fields are correctly seeded after cleanup."""
import requests

entities = ['account', 'contact', 'lead', 'opportunity', 'supplier', 'personal_account', 'task']
expected = {
    'account': 12,       # name, email, phone, website, industry_id, acc_type_id, billing_street/city/state/zip/country, owner_id
    'contact': 8,        # unchanged
    'lead': 23,          # unchanged
    'opportunity': 11,   # unchanged
    'supplier': 18,      # unchanged
    'personal_account': 11,  # salutation, first/last, email, phone, billing_street/city/state/zip/country, owner_id
    'task': 10,          # unchanged
}

total = 0
for e in entities:
    r = requests.get(f'http://localhost:8000/api/v1/standard_fields/{e}?active_only=false')
    count = len(r.json())
    exp = expected[e]
    status = "OK" if count == exp else f"MISMATCH (expected {exp})"
    total += count
    print(f"  {e:20s}: {count:3d} fields  {status}")

print(f"\n  Total: {total} fields")
