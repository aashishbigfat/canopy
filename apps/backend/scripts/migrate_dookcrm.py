"""
DookCRM → Tutterfly Migration Script
=====================================
Migrates legacy MySQL data (SQL dumps in docs/) into the existing Tutterfly
travel tenant's MongoDB database.

Records:
  - 100 opportunities
  -   8 company accounts
  -  93 personal accounts → Account(is_person_account=True)
  -   7 contacts

Usage:
    cd apps/backend
    python scripts/migrate_dookcrm.py --dry-run   # validate only
    python scripts/migrate_dookcrm.py              # commit to DB

Safety:
  - Every imported record is tagged with custom_fields.legacy_ref = "dookcrm:<table>:<id>"
  - Rollback: delete all docs where custom_fields.legacy_ref starts with "dookcrm:"
  - Dry-run mode validates everything without writing a single document.
"""
import asyncio
import re
import sys
import os
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path

# Ensure the backend app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Force UTF-8 output on Windows (cp1252 can't handle Unicode arrows/emojis)
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from bson import ObjectId


# ============================================================================
# PHASE 0 — SQL Parsing
# ============================================================================

def _parse_sql_values(sql_text: str) -> List[Tuple]:
    """
    Parse INSERT INTO ... VALUES (...), (...); from a SQL dump.
    Returns a list of tuples, each tuple being one row's values.
    
    This handles:
    - NULL values
    - Quoted strings with escaped quotes and commas inside
    - Numeric values (int, float)
    - Empty strings
    """
    # Find the VALUES section
    values_match = re.search(r'VALUES\s*\n?(.*);', sql_text, re.DOTALL)
    if not values_match:
        return []
    
    values_block = values_match.group(1)
    rows = []
    
    # Split into individual row tuples — match balanced parentheses
    # Pattern: find each (...) group
    depth = 0
    current_row_start = None
    
    for i, ch in enumerate(values_block):
        if ch == '(' and depth == 0:
            current_row_start = i + 1
            depth = 1
        elif ch == '(':
            depth += 1
        elif ch == ')' and depth == 1:
            depth = 0
            if current_row_start is not None:
                row_str = values_block[current_row_start:i]
                rows.append(_parse_row(row_str))
                current_row_start = None
        elif ch == ')':
            depth -= 1
    
    return rows


def _parse_row(row_str: str) -> Tuple:
    """Parse a single row's comma-separated values."""
    values = []
    i = 0
    n = len(row_str)
    
    while i < n:
        # Skip whitespace
        while i < n and row_str[i] in (' ', '\t', '\n', '\r'):
            i += 1
        
        if i >= n:
            break
        
        if row_str[i] == "'":
            # Quoted string — find the closing quote
            i += 1  # skip opening quote
            parts = []
            while i < n:
                if row_str[i] == '\\' and i + 1 < n:
                    # Escaped character
                    parts.append(row_str[i + 1])
                    i += 2
                elif row_str[i] == "'" and i + 1 < n and row_str[i + 1] == "'":
                    # Double-quote escape
                    parts.append("'")
                    i += 2
                elif row_str[i] == "'":
                    i += 1  # skip closing quote
                    break
                else:
                    parts.append(row_str[i])
                    i += 1
            values.append(''.join(parts))
        elif row_str[i:i+4].upper() == 'NULL':
            values.append(None)
            i += 4
        else:
            # Numeric or other unquoted value
            start = i
            while i < n and row_str[i] != ',':
                i += 1
            val_str = row_str[start:i].strip()
            # Try to parse as number
            try:
                if '.' in val_str:
                    values.append(float(val_str))
                else:
                    values.append(int(val_str))
            except ValueError:
                values.append(val_str)
        
        # Skip comma separator
        while i < n and row_str[i] in (' ', '\t', '\n', '\r'):
            i += 1
        if i < n and row_str[i] == ',':
            i += 1
    
    return tuple(values)


def _parse_columns(sql_text: str) -> List[str]:
    """Extract column names from INSERT INTO ... (...) VALUES."""
    match = re.search(r'INSERT INTO `\w+` \(([^)]+)\)', sql_text)
    if not match:
        return []
    cols_str = match.group(1)
    return [c.strip().strip('`') for c in cols_str.split(',')]


def parse_sql_file(filepath: str) -> List[Dict[str, Any]]:
    """Parse a SQL dump file into a list of dicts (column -> value).
    
    Handles phpMyAdmin dumps that include CREATE TABLE, ALTER TABLE, etc.
    Only parses INSERT INTO ... VALUES (...) blocks. Handles multiple INSERTs.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    # Extract ALL INSERT statements — phpMyAdmin may split large tables into multiple INSERTs
    insert_matches = re.findall(
        r'INSERT\s+INTO\s+`\w+`\s+\(([^)]+)\)\s+VALUES\s*\n?(.*?);',
        sql, re.DOTALL
    )
    if not insert_matches:
        print(f"  [WARN] No INSERT statement found in {filepath}")
        return []
    
    result = []
    columns = None
    
    for cols_str, values_block in insert_matches:
        # Parse column names (should be same across all INSERTs for same table)
        current_columns = [c.strip().strip('`') for c in cols_str.split(',')]
        if columns is None:
            columns = current_columns
        
        # Parse the VALUES block
        rows = _parse_sql_values_block(values_block)
        
        for row_idx, row in enumerate(rows):
            if len(row) != len(current_columns):
                print(f"  [WARN] Row {row_idx}: column/value count mismatch: {len(current_columns)} cols vs {len(row)} vals - skipping")
                continue
            result.append(dict(zip(current_columns, row)))
    
    print(f"  [{os.path.basename(filepath)}] {len(insert_matches)} INSERT block(s), {len(result)} total rows")
    return result


def _parse_sql_values_block(values_block: str) -> List[Tuple]:
    """Parse the VALUES portion: (row1), (row2), ...
    
    Uses balanced-parenthesis matching to split rows, then parses each row.
    """
    rows = []
    depth = 0
    current_row_start = None
    in_string = False
    escape_next = False
    
    for i, ch in enumerate(values_block):
        if escape_next:
            escape_next = False
            continue
        if ch == '\\':
            if in_string:
                escape_next = True
            continue
        if ch == "'" and not escape_next:
            in_string = not in_string
            continue
        if in_string:
            continue
        
        if ch == '(' and depth == 0:
            current_row_start = i + 1
            depth = 1
        elif ch == '(':
            depth += 1
        elif ch == ')' and depth == 1:
            depth = 0
            if current_row_start is not None:
                row_str = values_block[current_row_start:i]
                rows.append(_parse_row(row_str))
                current_row_start = None
        elif ch == ')':
            depth -= 1
    
    return rows


# ============================================================================
# PHASE 0.5 — Helper functions
# ============================================================================

def _to_bool(val) -> bool:
    """Convert MySQL tinyint/enum to Python bool."""
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val != 0
    if isinstance(val, str):
        return val.strip() not in ('0', '', 'false', 'False', 'no')
    return bool(val)


def _empty_to_none(val) -> Optional[str]:
    """Convert empty strings to None."""
    if val is None:
        return None
    if isinstance(val, str) and val.strip() == '':
        return None
    return val


def _parse_datetime(val) -> Optional[datetime]:
    """Parse MySQL datetime strings."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    if s in ('', '0000-00-00 00:00:00', '0000-00-00'):
        return None
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _parse_date_to_iso(val) -> Optional[str]:
    """Parse a date to ISO string for industry_data."""
    dt = _parse_datetime(val)
    if dt is None:
        return None
    return dt.isoformat()


def _clean_polymorphic_type(val) -> Optional[str]:
    """Convert 'App\\Models\\Account' → 'Account', etc."""
    if val is None:
        return None
    s = str(val)
    if 'PersonalAccount' in s:
        return 'PersonalAccount'
    if 'Account' in s:
        return 'Account'
    return _empty_to_none(s)


def _csv_to_list(val) -> List[str]:
    """Convert CSV string like '1,3,17' to list of strings."""
    if val is None:
        return []
    s = str(val).strip()
    if not s:
        return []
    return [x.strip() for x in s.split(',') if x.strip()]


# ============================================================================
# MAIN MIGRATION LOGIC
# ============================================================================

async def run_migration(dry_run: bool = True):
    """Execute the full migration pipeline."""
    
    from app.db.mongodb import init_db
    from app.models.tenant import Tenant
    from app.models.user import User
    from app.models.account import Account
    from app.models.contact import Contact
    from app.models.opportunity import Opportunity
    from app.models.account_contact import AccountContact
    from app.models.consolidated_picklists import SalesStage, Source, SourceMedium, Experience
    from app.models.tenant_counter import next_opportunity_number
    
    print("=" * 70)
    print(f"  DookCRM -> Tutterfly Migration")
    print(f"  Mode: {'🔍 DRY RUN (no writes)' if dry_run else '⚡ COMMIT (writing to DB)'}")
    print(f"  Time: {datetime.now().isoformat()}")
    print("=" * 70)
    
    # ------------------------------------------------------------------
    # PHASE 0 — Parse SQL files
    # ------------------------------------------------------------------
    print("\n▶ PHASE 0: Parsing SQL files...")
    
    docs_dir = Path(__file__).resolve().parent.parent.parent.parent / 'docs'
    
    opp_data = parse_sql_file(str(docs_dir / 'opportunities.sql'))
    acc_data = parse_sql_file(str(docs_dir / 'accounts.sql'))
    pa_data = parse_sql_file(str(docs_dir / 'personal_accounts.sql'))
    con_data = parse_sql_file(str(docs_dir / 'contacts.sql'))
    
    print(f"  Opportunities:      {len(opp_data)} rows parsed")
    print(f"  Company Accounts:   {len(acc_data)} rows parsed")
    print(f"  Personal Accounts:  {len(pa_data)} rows parsed")
    print(f"  Contacts:           {len(con_data)} rows parsed")
    
    if len(opp_data) == 0:
        print("  [FATAL] No opportunities parsed. Aborting.")
        return False
    
    # ------------------------------------------------------------------
    # PHASE 1 — Connect & resolve tenant, users, picklists
    # ------------------------------------------------------------------
    print("\n▶ PHASE 1: Connecting to MongoDB & resolving lookups...")
    
    await init_db()
    
    # Find the travel tenant
    tenant = await Tenant.find_one({"industry": "travel"})
    if not tenant:
        print("  [FATAL] No travel tenant found. Aborting.")
        return False
    
    tenant_id = tenant.id
    print(f"  Tenant: {tenant.company_name!r} (id={tenant_id})")
    
    # Find an admin user to use as default owner
    users = await User.find(
        {"tenant_id": tenant_id, "is_active": True, "deleted_at": None}
    ).to_list()
    
    if not users:
        print("  [FATAL] No active users found in tenant. Aborting.")
        return False
    
    # Prefer admin user
    admin_user = None
    for u in users:
        if await u.is_super_admin():
            admin_user = u
            break
    
    if not admin_user:
        admin_user = users[0]  # fallback to first active user
    
    default_owner_id = admin_user.id
    print(f"  Default owner: {admin_user.name!r} ({admin_user.email}) id={default_owner_id}")
    
    # Load sales stages for this tenant
    stages = await SalesStage.find(
        {"tenant_id": tenant_id, "is_active": True}
    ).sort("sorting").to_list()
    
    if not stages:
        print("  [FATAL] No sales stages found for tenant. Run seed_travel_stages.py first.")
        return False
    
    print(f"  Sales stages found: {len(stages)}")
    for s in stages:
        print(f"    [{s.sorting}] {s.name} (prob={s.probability}, won={s.is_won}, lost={s.is_lost}) id={s.id}")
    
    # Build legacy sales_stage_id mapping
    # Legacy: 1=Received(first), 2=Qualified(second), 5=Closed Lost
    stage_by_name = {s.name.lower(): s for s in stages}
    
    legacy_stage_map: Dict[str, ObjectId] = {}
    
    # Map based on sorting order — the legacy IDs correspond to the position
    # 1 → first stage (Received), 2 → second stage (Qualified)
    sorted_stages = sorted(stages, key=lambda s: s.sorting)
    for s in sorted_stages:
        if s.name.lower() == 'received':
            legacy_stage_map['1'] = s.id
        elif s.name.lower() == 'qualified':
            legacy_stage_map['2'] = s.id
        elif s.name.lower() == 'closed lost':
            legacy_stage_map['5'] = s.id
    
    # Default stage for any unmapped values
    default_stage = sorted_stages[0] if sorted_stages else None
    default_stage_id = default_stage.id if default_stage else None
    
    print(f"  Legacy stage mapping:")
    for k, v in legacy_stage_map.items():
        matched = next((s for s in stages if s.id == v), None)
        print(f"    '{k}' → {matched.name if matched else '???'} ({v})")
    print(f"  Default stage (unmapped): {default_stage.name if default_stage else 'NONE'}")
    
    # Load sources (platform defaults + tenant-scoped)
    sources = await Source.find(
        {"$or": [{"tenant_id": tenant_id}, {"tenant_id": None}], "is_active": True}
    ).to_list()
    source_by_name = {s.name.lower(): s.id for s in sources}
    print(f"  Sources found: {len(sources)} — {[s.name for s in sources]}")
    
    # Load source mediums
    mediums = await SourceMedium.find(
        {"$or": [{"tenant_id": tenant_id}, {"tenant_id": None}], "is_active": True}
    ).to_list()
    medium_by_name = {m.name.lower(): m.id for m in mediums}
    print(f"  Source mediums found: {len(mediums)} — {[m.name for m in mediums]}")
    
    # Load experiences
    experiences = await Experience.find(
        {"$or": [{"tenant_id": tenant_id}, {"tenant_id": None}], "is_active": True}
    ).to_list()
    exp_by_sorting = {i: e.id for i, e in enumerate(sorted(experiences, key=lambda x: x.sorting), 1)}
    print(f"  Experiences found: {len(experiences)}")
    
    # ------------------------------------------------------------------
    # Check for existing migrated data (idempotency)
    # ------------------------------------------------------------------
    existing_migrated = await Account.find(
        {"tenant_id": tenant_id, "custom_fields.legacy_ref": {"$regex": "^dookcrm:"}}
    ).count()
    
    if existing_migrated > 0:
        print(f"\n  ⚠️  WARNING: Found {existing_migrated} previously migrated records.")
        print(f"     To re-run, first rollback with: python scripts/migrate_dookcrm.py --rollback")
        if not dry_run:
            print("     Aborting commit mode to prevent duplicates.")
            return False
        else:
            print("     Continuing dry-run for analysis...")
    
    # ------------------------------------------------------------------
    # PHASE 2 — Import Accounts
    # ------------------------------------------------------------------
    print(f"\n▶ PHASE 2: {'Validating' if dry_run else 'Importing'} Accounts...")
    
    # Mapping: (table_name, legacy_int_id) → new ObjectId
    account_id_map: Dict[Tuple[str, int], ObjectId] = {}
    
    now = datetime.now(timezone.utc)
    
    # 2a — Company accounts
    company_ok = 0
    company_errors = []
    
    for row in acc_data:
        legacy_id = row['id']
        name = _empty_to_none(row.get('name'))
        
        if not name:
            company_errors.append(f"  [ERR] Account id={legacy_id}: missing name")
            continue
        
        created_at = _parse_datetime(row.get('created_at')) or now
        updated_at = _parse_datetime(row.get('updated_at')) or now
        
        account_doc = Account(
            name=name,
            is_person_account=False,
            segment="B2B",
            email=_empty_to_none(row.get('email')),
            phone=_empty_to_none(row.get('phone')),
            website=_empty_to_none(row.get('website')),
            description=_empty_to_none(row.get('description')),
            billing_street=_empty_to_none(row.get('billing_street')),
            billing_city=_empty_to_none(row.get('billing_city')),
            billing_state=_empty_to_none(row.get('billing_state')),
            billing_zip=_empty_to_none(str(row.get('billing_zip'))) if row.get('billing_zip') else None,
            billing_country=_empty_to_none(row.get('billing_country')),
            shipping_street=_empty_to_none(row.get('shipping_street')),
            shipping_city=_empty_to_none(row.get('shipping_city')),
            shipping_state=_empty_to_none(row.get('shipping_state')),
            shipping_zip=_empty_to_none(str(row.get('shipping_zip'))) if row.get('shipping_zip') else None,
            shipping_country=_empty_to_none(row.get('shipping_country')),
            tenant_id=tenant_id,
            owner_id=default_owner_id,
            created_by=default_owner_id,
            last_modified_by_id=default_owner_id,
            created_at=created_at,
            updated_at=updated_at,
            custom_fields={"legacy_ref": f"dookcrm:accounts:{legacy_id}"},
        )
        
        new_id = ObjectId()
        account_doc.id = new_id
        account_id_map[('accounts', legacy_id)] = new_id
        
        if not dry_run:
            await account_doc.insert()
        
        company_ok += 1
    
    print(f"  Company accounts: {company_ok} OK, {len(company_errors)} errors")
    for err in company_errors:
        print(err)
    
    # 2b — Personal accounts → Account(is_person_account=True)
    person_ok = 0
    person_errors = []
    
    for row in pa_data:
        legacy_id = row['id']
        first_name = _empty_to_none(row.get('first_name'))
        last_name = _empty_to_none(row.get('last_name'))
        
        # Derive display name
        name_parts = [p for p in [first_name, last_name] if p]
        display_name = ' '.join(name_parts) if name_parts else f"PersonAccount_{legacy_id}"
        
        if not last_name:
            person_errors.append(f"  [WARN] PersonalAccount id={legacy_id}: missing last_name, using '{display_name}'")
        
        created_at = _parse_datetime(row.get('created_at')) or now
        updated_at = _parse_datetime(row.get('updated_at')) or now
        
        account_doc = Account(
            name=display_name,
            is_person_account=True,
            segment="B2C",
            salutation=_empty_to_none(row.get('salutation')),
            first_name=first_name,
            last_name=last_name,
            email=_empty_to_none(row.get('email')),
            phone=_empty_to_none(row.get('phone')),
            mobile=_empty_to_none(row.get('mobile')),
            # personal_accounts use mailing_* → billing_* on the unified model
            billing_street=_empty_to_none(row.get('mailing_street')),
            billing_city=_empty_to_none(row.get('mailing_city')),
            billing_state=_empty_to_none(row.get('mailing_state')),
            billing_zip=_empty_to_none(str(row.get('mailing_zip'))) if row.get('mailing_zip') else None,
            billing_country=_empty_to_none(row.get('mailing_country')),
            tenant_id=tenant_id,
            owner_id=default_owner_id,
            created_by=default_owner_id,
            last_modified_by_id=default_owner_id,
            created_at=created_at,
            updated_at=updated_at,
            custom_fields={"legacy_ref": f"dookcrm:personal_accounts:{legacy_id}"},
        )
        
        new_id = ObjectId()
        account_doc.id = new_id
        account_id_map[('personal_accounts', legacy_id)] = new_id
        
        if not dry_run:
            await account_doc.insert()
        
        person_ok += 1
    
    print(f"  Personal accounts: {person_ok} OK, {len(person_errors)} warnings")
    for err in person_errors[:5]:  # limit output
        print(err)
    if len(person_errors) > 5:
        print(f"  ... and {len(person_errors) - 5} more warnings")
    
    print(f"  Total account ID mappings: {len(account_id_map)}")
    
    # ------------------------------------------------------------------
    # PHASE 3 — Import Contacts
    # ------------------------------------------------------------------
    print(f"\n▶ PHASE 3: {'Validating' if dry_run else 'Importing'} Contacts...")
    
    contact_id_map: Dict[int, ObjectId] = {}
    contact_ok = 0
    contact_errors = []
    # Track which contacts should be linked to which accounts
    contact_account_links: List[Tuple[ObjectId, ObjectId]] = []
    
    for row in con_data:
        legacy_id = row['id']
        first_name = _empty_to_none(row.get('first_name'))
        last_name = _empty_to_none(row.get('last_name'))
        
        if not first_name and not last_name:
            contact_errors.append(f"  [ERR] Contact id={legacy_id}: missing first_name AND last_name")
            continue
        
        # Ensure both names have values (Contact model requires both)
        if not first_name:
            first_name = last_name  # use last_name as first_name
        if not last_name:
            last_name = first_name  # use first_name as last_name
        
        created_at = _parse_datetime(row.get('created_at')) or now
        updated_at = _parse_datetime(row.get('updated_at')) or now
        
        # Try to find the account this contact is linked to
        # In the legacy data, contacts appear in the accounts table's contact references
        # We look for opportunities that reference both this contact and an account
        linked_account_id = None
        for opp_row in opp_data:
            if opp_row.get('contact_id') == legacy_id and opp_row.get('account_id'):
                acc_legacy_id = opp_row['account_id']
                # Check both tables
                key = ('accounts', acc_legacy_id)
                if key in account_id_map:
                    linked_account_id = account_id_map[key]
                    break
        
        contact_doc = Contact(
            salutation=_empty_to_none(row.get('salutation')),
            first_name=str(first_name),
            middle_name=_empty_to_none(row.get('middle_name')),
            last_name=str(last_name),
            email=_empty_to_none(row.get('email')),
            phone=_empty_to_none(row.get('phone')),
            mobile=_empty_to_none(row.get('mobile')),
            title=_empty_to_none(row.get('title')),
            department=_empty_to_none(row.get('department')),
            mailing_street=_empty_to_none(row.get('mailing_street')),
            mailing_city=_empty_to_none(row.get('mailing_city')),
            mailing_state=_empty_to_none(row.get('mailing_state')),
            mailing_zip=_empty_to_none(str(row.get('mailing_zip'))) if row.get('mailing_zip') else None,
            mailing_country=_empty_to_none(row.get('mailing_country')),
            account_id=linked_account_id,
            tenant_id=tenant_id,
            owner_id=default_owner_id,
            created_by=default_owner_id,
            last_modified_by_id=default_owner_id,
            created_at=created_at,
            updated_at=updated_at,
            custom_fields={"legacy_ref": f"dookcrm:contacts:{legacy_id}"},
        )
        
        new_id = ObjectId()
        contact_doc.id = new_id
        contact_id_map[legacy_id] = new_id
        
        if linked_account_id:
            contact_account_links.append((linked_account_id, new_id))
        
        if not dry_run:
            await contact_doc.insert()
            # Create AccountContact pivot
            if linked_account_id:
                await AccountContact(
                    account_id=linked_account_id,
                    contact_id=new_id,
                    tenant_id=tenant_id,
                ).insert()
        
        contact_ok += 1
    
    print(f"  Contacts: {contact_ok} OK, {len(contact_errors)} errors")
    print(f"  Contact-Account links: {len(contact_account_links)}")
    for err in contact_errors:
        print(err)
    
    # ------------------------------------------------------------------
    # PHASE 4 — Import Opportunities
    # ------------------------------------------------------------------
    print(f"\n▶ PHASE 4: {'Validating' if dry_run else 'Importing'} Opportunities...")
    
    opp_ok = 0
    opp_errors = []
    opp_warnings = []
    
    for row in opp_data:
        legacy_id = row['id']
        name = _empty_to_none(row.get('name'))
        
        if not name:
            opp_errors.append(f"  [ERR] Opportunity id={legacy_id}: missing name")
            continue
        
        # --- Resolve sales_stage_id ---
        legacy_stage = str(row.get('sales_stage_id', '1')).strip()
        sales_stage_id = legacy_stage_map.get(legacy_stage, default_stage_id)
        
        if sales_stage_id is None:
            opp_errors.append(f"  [ERR] Opportunity id={legacy_id}: no valid sales stage")
            continue
        
        # --- Resolve probability from the mapped stage ---
        matched_stage = next((s for s in stages if s.id == sales_stage_id), None)
        probability = matched_stage.probability if matched_stage else 0
        
        # Override with explicit probability if present and non-None
        explicit_prob = row.get('probability')
        if explicit_prob is not None and _empty_to_none(str(explicit_prob)):
            try:
                probability = int(float(str(explicit_prob)))
            except (ValueError, TypeError):
                pass
        
        # --- Resolve opportunitable (polymorphic account) ---
        opp_type = _clean_polymorphic_type(row.get('opportunitable_type'))
        opp_table_id = row.get('opportunitable_id')
        
        resolved_opportunitable_id = None
        if opp_type and opp_table_id:
            if opp_type == 'Account':
                resolved_opportunitable_id = account_id_map.get(('accounts', opp_table_id))
            elif opp_type == 'PersonalAccount':
                resolved_opportunitable_id = account_id_map.get(('personal_accounts', opp_table_id))
            
            if resolved_opportunitable_id is None:
                opp_warnings.append(
                    f"  [WARN] Opp id={legacy_id}: opportunitable {opp_type}:{opp_table_id} not found in import set"
                )
        
        # --- Resolve account_id (set for BOTH company and person accounts) ---
        # In Tutterfly, person accounts live in the unified accounts collection,
        # so account_id should always point to the resolved account.
        resolved_account_id = resolved_opportunitable_id  # always use the resolved polymorphic ID
        
        # --- Resolve contact_id ---
        resolved_contact_id = None
        legacy_contact_id = row.get('contact_id')
        if legacy_contact_id:
            resolved_contact_id = contact_id_map.get(legacy_contact_id)
        
        # --- Resolve source_id ---
        resolved_source_id = None
        legacy_source = row.get('source_id')
        if legacy_source is not None:
            # Legacy source IDs: 1=Website, 2=Referral (common pattern)
            # Try to match by position in the picklist
            source_list = sorted(sources, key=lambda s: s.sorting)
            idx = int(legacy_source) - 1 if isinstance(legacy_source, (int, float)) else 0
            if 0 <= idx < len(source_list):
                resolved_source_id = source_list[idx].id
        
        # --- Resolve source_medium_id ---
        resolved_medium_id = None
        legacy_medium = row.get('source_medium_id')
        if legacy_medium is not None:
            medium_list = sorted(mediums, key=lambda m: m.sorting)
            idx = int(legacy_medium) - 1 if isinstance(legacy_medium, (int, float)) else 0
            if 0 <= idx < len(medium_list):
                resolved_medium_id = medium_list[idx].id
        
        # --- Build industry_data ---
        travel_date_raw = row.get('travel_date')
        travel_date_dt = _parse_datetime(travel_date_raw)
        
        industry_data = {}
        
        if travel_date_dt:
            industry_data['travel_date'] = travel_date_dt.isoformat()
        
        for field in ['no_of_pax', 'no_of_nights', 'no_of_adults', 'no_of_childs', 'no_of_infants']:
            val = row.get(field)
            if val is not None:
                try:
                    industry_data[field] = int(val)
                except (ValueError, TypeError):
                    pass
        
        dest_ids = _csv_to_list(row.get('destination_ids'))
        if dest_ids:
            industry_data['destination_ids'] = dest_ids
        
        country_of_origin = _empty_to_none(row.get('country_of_origin'))
        if country_of_origin:
            industry_data['country_of_origin'] = country_of_origin
        
        # experience_id — try to map from legacy int
        legacy_exp = row.get('experience_id')
        if legacy_exp is not None:
            exp_oid = exp_by_sorting.get(int(legacy_exp)) if isinstance(legacy_exp, (int, float)) else None
            if exp_oid:
                industry_data['experience_id'] = str(exp_oid)
        
        departure_id = _empty_to_none(row.get('departure_id'))
        if departure_id:
            industry_data['departure_id'] = str(departure_id)
        
        # If industry_data has no travel_date, we need one (it's required for travel opps)
        if 'travel_date' not in industry_data:
            # Use close_date as fallback
            close_dt = _parse_datetime(row.get('close_date'))
            if close_dt:
                industry_data['travel_date'] = close_dt.isoformat()
            else:
                industry_data['travel_date'] = now.isoformat()
                opp_warnings.append(f"  [WARN] Opp id={legacy_id}: no travel_date, using current date")
        
        # --- Parse dates ---
        close_date = _parse_datetime(row.get('close_date'))
        created_at = _parse_datetime(row.get('created_at')) or now
        updated_at = _parse_datetime(row.get('updated_at')) or now
        deleted_at = _parse_datetime(row.get('deleted_at'))
        
        # --- Build the opportunity ---
        opp_doc = Opportunity(
            name=name,
            description=_empty_to_none(row.get('description')),
            amount=float(row['amount']) if row.get('amount') else None,
            close_date=close_date,
            sales_stage_id=sales_stage_id,
            probability=probability,
            opportunitable_type=opp_type,
            opportunitable_id=resolved_opportunitable_id,
            account_id=resolved_account_id,
            contact_id=resolved_contact_id,
            source_id=resolved_source_id,
            source_medium_id=resolved_medium_id,
            source_url=_empty_to_none(row.get('source_url')),
            close_lost_reason=_empty_to_none(row.get('loss_reason')),
            owner_id=default_owner_id,
            tenant_id=tenant_id,
            created_by=default_owner_id,
            last_modified_by_id=default_owner_id,
            is_queue=_to_bool(row.get('is_queue')),
            key_deal=_to_bool(row.get('key_deal')),
            is_locked=_to_bool(row.get('is_locked')),
            fyear=_empty_to_none(row.get('fyear')),
            segment="B2C" if opp_type == 'PersonalAccount' else "B2B",
            creation_type="Auto",  # Migrated data
            industry_data=industry_data,
            custom_fields={"legacy_ref": f"dookcrm:opportunities:{legacy_id}"},
            created_at=created_at,
            updated_at=updated_at,
            deleted_at=deleted_at,
        )
        
        if not dry_run:
            await opp_doc.insert()
            
            # Assign sequential opportunity_number
            try:
                opp_doc.opportunity_number = await next_opportunity_number(tenant_id)
                await opp_doc.save()
            except Exception as e:
                opp_warnings.append(f"  [WARN] Opp id={legacy_id}: opportunity_number failed: {e}")
        
        opp_ok += 1
    
    print(f"  Opportunities: {opp_ok} OK, {len(opp_errors)} errors")
    if opp_errors:
        print(f"  ERRORS:")
        for err in opp_errors:
            print(err)
    if opp_warnings:
        print(f"  Warnings ({len(opp_warnings)}):")
        for w in opp_warnings[:10]:
            print(w)
        if len(opp_warnings) > 10:
            print(f"  ... and {len(opp_warnings) - 10} more warnings")
    
    # ------------------------------------------------------------------
    # PHASE 5 — Verification
    # ------------------------------------------------------------------
    print(f"\n▶ PHASE 5: Verification...")
    
    total_expected = company_ok + person_ok + contact_ok + opp_ok
    total_errors = len(company_errors) + len(contact_errors) + len(opp_errors)
    
    print(f"\n{'=' * 70}")
    print(f"  MIGRATION SUMMARY")
    print(f"{'=' * 70}")
    print(f"  Company Accounts:   {company_ok:>4} imported  ({len(company_errors)} errors)")
    print(f"  Person Accounts:    {person_ok:>4} imported  ({len(person_errors)} warnings)")
    print(f"  Contacts:           {contact_ok:>4} imported  ({len(contact_errors)} errors)")
    print(f"  Opportunities:      {opp_ok:>4} imported  ({len(opp_errors)} errors)")
    print(f"  {'─' * 40}")
    print(f"  Total Records:      {total_expected:>4}")
    print(f"  Total Errors:       {total_errors:>4}")
    print(f"  Total Warnings:     {len(person_errors) + len(opp_warnings):>4}")
    print(f"{'=' * 70}")
    
    if not dry_run:
        # Verify actual DB counts
        db_accounts = await Account.find(
            {"tenant_id": tenant_id, "custom_fields.legacy_ref": {"$regex": "^dookcrm:"}}
        ).count()
        db_contacts = await Contact.find(
            {"tenant_id": tenant_id, "custom_fields.legacy_ref": {"$regex": "^dookcrm:"}}
        ).count()
        db_opps = await Opportunity.find(
            {"tenant_id": tenant_id, "custom_fields.legacy_ref": {"$regex": "^dookcrm:"}}
        ).count()
        
        print(f"\n  DB Verification:")
        print(f"    Accounts in DB:      {db_accounts} (expected {company_ok + person_ok})")
        print(f"    Contacts in DB:      {db_contacts} (expected {contact_ok})")
        print(f"    Opportunities in DB: {db_opps} (expected {opp_ok})")
        
        all_match = (
            db_accounts == company_ok + person_ok
            and db_contacts == contact_ok
            and db_opps == opp_ok
        )
        
        if all_match:
            print(f"\n  ✅ ALL COUNTS MATCH — Migration successful!")
        else:
            print(f"\n  ❌ COUNT MISMATCH — Please investigate!")
            return False
        
        # Verify referential integrity of opportunities
        print(f"\n  Referential Integrity Check...")
        integrity_errors = 0
        
        migrated_opps = await Opportunity.find(
            {"tenant_id": tenant_id, "custom_fields.legacy_ref": {"$regex": "^dookcrm:opportunities:"}}
        ).to_list()
        
        for opp in migrated_opps:
            # Check sales_stage_id
            stage = await SalesStage.find_one({"_id": opp.sales_stage_id, "tenant_id": tenant_id})
            if not stage:
                print(f"    ❌ Opp {opp.name}: sales_stage_id {opp.sales_stage_id} not found!")
                integrity_errors += 1
            
            # Check opportunitable_id
            if opp.opportunitable_id:
                acct = await Account.find_one({"_id": opp.opportunitable_id, "tenant_id": tenant_id})
                if not acct:
                    print(f"    ❌ Opp {opp.name}: opportunitable_id {opp.opportunitable_id} not found!")
                    integrity_errors += 1
            
            # Check contact_id
            if opp.contact_id:
                contact = await Contact.find_one({"_id": opp.contact_id, "tenant_id": tenant_id})
                if not contact:
                    print(f"    ❌ Opp {opp.name}: contact_id {opp.contact_id} not found!")
                    integrity_errors += 1
        
        if integrity_errors == 0:
            print(f"    ✅ All {len(migrated_opps)} opportunities pass referential integrity check")
        else:
            print(f"    ❌ {integrity_errors} referential integrity errors found!")
    
    else:
        print(f"\n  🔍 DRY RUN COMPLETE — No data was written to the database.")
        if total_errors == 0:
            print(f"  ✅ All {total_expected} records validated successfully.")
            print(f"  Run without --dry-run to commit: python scripts/migrate_dookcrm.py")
        else:
            print(f"  ❌ {total_errors} errors found — fix before committing.")
    
    return total_errors == 0


async def run_rollback():
    """Remove all previously migrated DookCRM records."""
    from app.db.mongodb import init_db
    from app.models.tenant import Tenant
    from app.models.account import Account
    from app.models.contact import Contact
    from app.models.opportunity import Opportunity
    from app.models.account_contact import AccountContact
    
    await init_db()
    
    tenant = await Tenant.find_one({"industry": "travel"})
    if not tenant:
        print("[FATAL] No travel tenant found.")
        return
    
    tid = tenant.id
    print(f"Rolling back migration for tenant: {tenant.company_name!r} (id={tid})")
    
    # Get migrated contact IDs for pivot cleanup
    migrated_contacts = await Contact.find(
        {"tenant_id": tid, "custom_fields.legacy_ref": {"$regex": "^dookcrm:"}}
    ).to_list()
    contact_ids = [c.id for c in migrated_contacts]
    
    # Delete in reverse dependency order
    opp_result = await Opportunity.find(
        {"tenant_id": tid, "custom_fields.legacy_ref": {"$regex": "^dookcrm:"}}
    ).delete()
    print(f"  Deleted opportunities: {opp_result.deleted_count if opp_result else 0}")
    
    # Delete AccountContact pivots for migrated contacts
    if contact_ids:
        pivot_result = await AccountContact.find(
            {"tenant_id": tid, "contact_id": {"$in": contact_ids}}
        ).delete()
        print(f"  Deleted account-contact pivots: {pivot_result.deleted_count if pivot_result else 0}")
    
    con_result = await Contact.find(
        {"tenant_id": tid, "custom_fields.legacy_ref": {"$regex": "^dookcrm:"}}
    ).delete()
    print(f"  Deleted contacts: {con_result.deleted_count if con_result else 0}")
    
    acc_result = await Account.find(
        {"tenant_id": tid, "custom_fields.legacy_ref": {"$regex": "^dookcrm:"}}
    ).delete()
    print(f"  Deleted accounts: {acc_result.deleted_count if acc_result else 0}")
    
    print("✅ Rollback complete.")


def main():
    parser = argparse.ArgumentParser(description="Migrate DookCRM data to Tutterfly")
    parser.add_argument('--dry-run', action='store_true', default=False,
                        help='Validate without writing to DB')
    parser.add_argument('--rollback', action='store_true', default=False,
                        help='Remove all previously migrated records')
    args = parser.parse_args()
    
    if args.rollback:
        asyncio.run(run_rollback())
    else:
        success = asyncio.run(run_migration(dry_run=args.dry_run))
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
