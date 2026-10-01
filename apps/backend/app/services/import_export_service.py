"""
Import/Export service for CSV and Excel files.

The import/export/sample columns for each module (lead, account,
personal_account, contact) are defined once in ENTITY_COLUMNS below.
The downloadable sample, the importer and the exporter all derive from
that spec, so the sample a client downloads always matches what the
importer accepts.

Conventions (enforced on every import):
  - Files: .csv / .xlsx / .xls, max MAX_IMPORT_ROWS data rows.
  - Phones: "+<code> <number>", 10 digits for India (see app.core.validators.PHONE_REGEX).
  - Dates: YYYY-MM-DD, DD-MM-YYYY or DD/MM/YYYY.
  - Picklist columns (Lead Status, Source, Account Type, ...) must match an
    existing picklist value for the tenant (platform defaults + overrides).
  - Rows that fail validation are reported per-row and skipped; valid rows
    are still imported.
  - tenant_id / owner_id / created_by always come from the importing user,
    never from the file.
"""
import pandas as pd
from io import BytesIO
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from fastapi import UploadFile
from bson import ObjectId

from app.core.validators import strict_phone_validator
from app.models.account import Account
from app.models.picklists import AccountType, Industry

ALLOWED_IMPORT_EXTENSIONS = (".csv", ".xlsx", ".xls")
MAX_IMPORT_ROWS = 5000

# ---------------------------------------------------------------------------
# Column spec — single source of truth for samples / imports / exports.
# Each column: header, example (sample row), required, alt (extra accepted
# header spellings on import) and industries (only included for tenants in
# one of those industries; None = always included).
# ---------------------------------------------------------------------------

ENTITY_COLUMNS: Dict[str, List[Dict[str, Any]]] = {
    "lead": [
        {"header": "Salutation", "example": "Mr."},
        {"header": "First Name", "example": "John", "required": True, "alt": ["first_name"]},
        {"header": "Last Name", "example": "Doe", "required": True, "alt": ["last_name"]},
        {"header": "Email", "example": "john.doe@example.com"},
        {"header": "Phone", "example": "+91 9876543210"},
        {"header": "Mobile", "example": "+91 9123456780"},
        {"header": "Company", "example": "Acme Corp"},
        {"header": "Title", "example": "Manager"},
        {"header": "No of Employees", "example": "50", "alt": ["No. of Employees", "Employees"]},
        {"header": "Website", "example": "https://acme.com"},
        {"header": "Street", "example": "123 Main St"},
        {"header": "City", "example": "Mumbai"},
        {"header": "State", "example": "Maharashtra"},
        {"header": "Zip", "example": "400001", "alt": ["Postal Code", "Zip/Postal Code"]},
        {"header": "Country", "example": "India"},
        {"header": "Lead Status", "example": "New", "alt": ["lead_status", "Status"]},
        {"header": "Source", "example": "Web", "alt": ["source"]},
        {"header": "Source Medium", "example": "Organic", "alt": ["source_medium"]},
        {"header": "Industry", "example": "Technology", "alt": ["industry"]},
        {"header": "Segment", "example": "B2C"},
        {"header": "Campaign Name", "example": "Summer 2026"},
        {"header": "Travel Date", "example": "2026-08-15", "alt": ["travel_date"], "industries": ["travel"]},
        {"header": "No of Pax", "example": "2", "alt": ["no_of_pax", "Pax"], "industries": ["travel"]},
        {"header": "Destinations", "example": "Paris, Bali", "alt": ["destinations"], "industries": ["travel"]},
    ],
    "account": [
        {"header": "Name", "example": "Acme Corporation", "required": True, "alt": ["Account Name", "name"]},
        {"header": "Email", "example": "contact@acme.com"},
        {"header": "Phone", "example": "+91 9876543210"},
        {"header": "Website", "example": "https://acme.com"},
        {"header": "Account Type", "example": "Customer"},
        {"header": "Industry", "example": "Technology"},
        {"header": "Segment", "example": "B2B"},
        {"header": "Description", "example": "Key enterprise client"},
        {"header": "Billing Street", "example": "123 Main St"},
        {"header": "Billing City", "example": "Mumbai"},
        {"header": "Billing State", "example": "Maharashtra"},
        {"header": "Billing Zip", "example": "400001"},
        {"header": "Billing Country", "example": "India"},
        {"header": "Shipping Street", "example": "123 Main St"},
        {"header": "Shipping City", "example": "Mumbai"},
        {"header": "Shipping State", "example": "Maharashtra"},
        {"header": "Shipping Zip", "example": "400001"},
        {"header": "Shipping Country", "example": "India"},
        {"header": "Travel Frequency", "example": "quarterly", "industries": ["travel"]},
        {"header": "Membership Tier", "example": "Gold", "industries": ["travel"]},
        {"header": "Membership Number", "example": "MB-1001", "industries": ["travel"]},
        {"header": "Preferred Destinations", "example": "Dubai, Singapore", "industries": ["travel"]},
        {"header": "Preferred Experience Types", "example": "Adventure", "industries": ["travel"]},
    ],
    "personal_account": [
        {"header": "Salutation", "example": "Ms."},
        {"header": "First Name", "example": "Jane", "required": True, "alt": ["first_name"]},
        {"header": "Last Name", "example": "Smith", "required": True, "alt": ["last_name"]},
        {"header": "Email", "example": "jane.smith@example.com"},
        {"header": "Phone", "example": "+91 9876543210"},
        {"header": "Mobile", "example": "+91 9123456780"},
        {"header": "Segment", "example": "B2C"},
        {"header": "Description", "example": "Frequent traveller"},
        {"header": "Billing Street", "example": "42 Lake Road"},
        {"header": "Billing City", "example": "Pune"},
        {"header": "Billing State", "example": "Maharashtra"},
        {"header": "Billing Zip", "example": "411001"},
        {"header": "Billing Country", "example": "India"},
        {"header": "Shipping Street", "example": "42 Lake Road"},
        {"header": "Shipping City", "example": "Pune"},
        {"header": "Shipping State", "example": "Maharashtra"},
        {"header": "Shipping Zip", "example": "411001"},
        {"header": "Shipping Country", "example": "India"},
        {"header": "Travel Frequency", "example": "annually", "industries": ["travel"]},
        {"header": "Membership Tier", "example": "Silver", "industries": ["travel"]},
        {"header": "Membership Number", "example": "MB-2002", "industries": ["travel"]},
        {"header": "Preferred Destinations", "example": "Bali, Maldives", "industries": ["travel"]},
        {"header": "Preferred Experience Types", "example": "Honeymoon", "industries": ["travel"]},
    ],
    "contact": [
        {"header": "Salutation", "example": "Mr."},
        {"header": "First Name", "example": "Ravi", "required": True, "alt": ["first_name"]},
        {"header": "Last Name", "example": "Kumar", "required": True, "alt": ["last_name"]},
        {"header": "Email", "example": "ravi.kumar@example.com"},
        {"header": "Phone", "example": "+91 9876543210"},
        {"header": "Mobile", "example": "+91 9123456780"},
        {"header": "Title", "example": "Procurement Head"},
        {"header": "Department", "example": "Operations"},
        {"header": "Account Name", "example": "Acme Corporation"},
        {"header": "Description", "example": "Primary point of contact"},
        {"header": "Mailing Street", "example": "123 Main St"},
        {"header": "Mailing City", "example": "Mumbai"},
        {"header": "Mailing State", "example": "Maharashtra"},
        {"header": "Mailing Zip", "example": "400001"},
        {"header": "Mailing Country", "example": "India"},
        {"header": "Other Street", "example": ""},
        {"header": "Other City", "example": ""},
        {"header": "Other State", "example": ""},
        {"header": "Other Zip", "example": ""},
        {"header": "Other Country", "example": ""},
        {"header": "Passport Number", "example": "N1234567", "industries": ["travel"]},
        {"header": "Passport Expiry", "example": "2030-05-20", "industries": ["travel"]},
        {"header": "Nationality", "example": "Indian", "industries": ["travel"]},
        {"header": "Date of Birth", "example": "1990-01-15", "industries": ["travel"]},
        {"header": "Frequent Flyer Number", "example": "FF-998877", "industries": ["travel"]},
        {"header": "Dietary Preferences", "example": "Vegetarian", "industries": ["travel"]},
    ],
}


def columns_for_entity(entity: str, industry: Optional[str]) -> List[Dict[str, Any]]:
    """Columns applicable to a tenant: shared ones + its industry's extras."""
    cols = []
    for col in ENTITY_COLUMNS[entity]:
        industries = col.get("industries")
        if industries and industry not in industries:
            continue
        cols.append(col)
    return cols


def generate_sample_csv(entity: str, industry: Optional[str]) -> bytes:
    """Build the downloadable sample CSV: header row + one example row."""
    cols = columns_for_entity(entity, industry)
    df = pd.DataFrame(
        [{c["header"]: c.get("example", "") for c in cols}],
        columns=[c["header"] for c in cols],
    )
    out = BytesIO()
    df.to_csv(out, index=False)
    out.seek(0)
    return out.getvalue()


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _clean_scalar(val: Any) -> Any:
    """Trim strings; turn float-ints from Excel (10001.0) back into ints."""
    if isinstance(val, float) and val.is_integer():
        return int(val)
    if isinstance(val, str):
        return val.strip()
    return val


def _get_val(row: pd.Series, *keys: str, default: Any = None) -> Any:
    """First non-empty value among the accepted header spellings."""
    for key in keys:
        if key not in row:
            continue
        val = row[key]
        if pd.isna(val):
            continue
        val = _clean_scalar(val)
        if val == "":
            continue
        return val
    return default


def _normalize_segment(val: Any, default: str) -> str:
    """Map a free-text segment cell to a canonical value (B2C / B2B / CORPORATE).

    Accepts the canonical values and the human labels case-insensitively, plus
    the legacy "B2B_DIRECT" value (-> CORPORATE) and old labels
    ("B2C (Individual)" -> B2C, "B2B (Corporate)" -> B2B). Falls back to
    ``default`` when the cell is blank or unrecognised.
    Keep in sync with app/core/segment_constants.py.
    """
    if val is None:
        return default
    s = str(val).strip().upper()
    if not s:
        return default
    if "DIRECT" in s:          # legacy "B2B_DIRECT"
        return "CORPORATE"
    if "INDIVIDUAL" in s:      # old "B2C (Individual)" label
        return "B2C"
    if s == "CORPORATE":
        return "CORPORATE"
    if s.startswith("B2B"):    # "B2B" or old "B2B (Corporate)" label
        return "B2B"
    if s.startswith("B2C"):
        return "B2C"
    return default


def _import_keys(entity: str, header: str) -> List[str]:
    """Accepted header spellings (canonical + alternates) for a column."""
    for col in ENTITY_COLUMNS[entity]:
        if col["header"] == header:
            return [header] + col.get("alt", [])
    return [header]


def _normalize_date(value: Any) -> str:
    """Normalize a date cell to ISO YYYY-MM-DD.

    Accepts datetime/date objects (Excel) and the formats the old Tutterfly
    importer allowed: DD-MM-YYYY and DD/MM/YYYY, plus ISO.
    """
    if isinstance(value, (datetime, date)):
        return value.strftime("%Y-%m-%d")
    s = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    raise ValueError(f"Invalid date '{value}'. Allowed formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY.")


def _validate_phone(value: Any, label: str) -> Optional[str]:
    """Strictly validate a phone cell; raises ValueError with the column name."""
    if value is None:
        return None
    try:
        return strict_phone_validator(str(value))
    except ValueError:
        raise ValueError(f"Invalid {label} '{value}'. Use format: +<country code> <number>, e.g. +91 9876543210 (10 digits for India)")


def _split_list(value: Any) -> List[str]:
    """Split a comma-separated cell into a clean list of names."""
    if value is None:
        return []
    return [part.strip() for part in str(value).split(",") if part.strip()]


async def _read_dataframe(file: UploadFile) -> pd.DataFrame:
    """Read an upload into a DataFrame with cleaned headers; raise ValueError on bad files."""
    filename = (file.filename or "").lower()
    if not filename.endswith(ALLOWED_IMPORT_EXTENSIONS):
        raise ValueError("Unsupported file type. Please upload a CSV or Excel (.xlsx) file.")
    content = await file.read()
    if not content:
        raise ValueError("The uploaded file is empty.")
    try:
        if filename.endswith(".csv"):
            # dtype=str keeps zips/phones intact (no 400001 -> 400001.0)
            df = pd.read_csv(BytesIO(content), dtype=str, keep_default_na=False)
        else:
            df = pd.read_excel(BytesIO(content))
    except Exception:
        raise ValueError("Could not parse the file. Please check it matches the downloaded sample.")
    df.columns = [col.strip() if isinstance(col, str) else col for col in df.columns]
    if len(df) == 0:
        raise ValueError("The file has no data rows.")
    if len(df) > MAX_IMPORT_ROWS:
        raise ValueError(f"Too many rows ({len(df)}). Maximum {MAX_IMPORT_ROWS} rows per file — please split the file.")
    return df


async def _tenant_industry(tenant_id: ObjectId) -> Optional[str]:
    from app.models.tenant import Tenant
    tenant = await Tenant.get(tenant_id)
    return tenant.industry if tenant else None


async def _picklist_name_map(model, tenant_id: ObjectId, tenant_industry: Optional[str], picklist_type: str) -> Dict[str, ObjectId]:
    """lowercased name -> id map over platform defaults + tenant overrides."""
    from app.core.picklist_query import build_picklist_query, dedup_picklist_items
    items = dedup_picklist_items(
        await model.find(
            build_picklist_query(tenant_id, industry=tenant_industry, active_only=False, picklist_type=picklist_type)
        ).to_list()
    )
    return {item.name.lower(): item.id for item in items}


async def _picklist_id_map(model, ids: List[ObjectId], tenant_id: ObjectId) -> Dict[ObjectId, str]:
    """id -> name map, tenant-scoped (platform defaults included)."""
    if not ids:
        return {}
    items = await model.find(
        {"_id": {"$in": list(set(ids))}, "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}]}
    ).to_list()
    return {item.id: item.name for item in items}


async def _owner_name_map(owner_ids: List[ObjectId], tenant_id: ObjectId) -> Dict[ObjectId, str]:
    from app.models.user import User
    if not owner_ids:
        return {}
    users = await User.find({"_id": {"$in": list(set(owner_ids))}, "tenant_id": tenant_id}).to_list()
    return {u.id: u.name for u in users}


def _df_to_bytes(df: pd.DataFrame, fmt: str) -> bytes:
    output = BytesIO()
    if fmt == "xlsx":
        df.to_excel(output, index=False, engine="openpyxl")
    else:
        df.to_csv(output, index=False)
    output.seek(0)
    return output.getvalue()


def _fmt_dt(value: Optional[datetime]) -> str:
    return value.strftime("%Y-%m-%d %H:%M:%S") if value else ""


class ImportExportService:
    """Service for importing and exporting data"""

    # ================= Accounts (company + person) =================

    async def export_accounts_to_file(
        self,
        accounts: List[Account],
        format: str = "xlsx",
        tenant_id: Optional[ObjectId] = None,
        is_person_account: bool = False,
        tenant_industry: Optional[str] = None,
    ) -> bytes:
        """Export company or person accounts to Excel/CSV."""
        if tenant_id is None and accounts:
            tenant_id = accounts[0].tenant_id

        # Batch-resolve picklists / owners (tenant-scoped + platform defaults)
        type_names = await _picklist_id_map(AccountType, [a.acc_type_id for a in accounts if a.acc_type_id], tenant_id)
        industry_names = await _picklist_id_map(Industry, [a.industry_id for a in accounts if a.industry_id], tenant_id)
        owner_names = await _owner_name_map([a.owner_id for a in accounts if a.owner_id], tenant_id)

        entity = "personal_account" if is_person_account else "account"
        headers = [c["header"] for c in columns_for_entity(entity, tenant_industry)]

        data = []
        for account in accounts:
            ind = account.industry_data or {}
            row: Dict[str, Any] = {
                "Email": account.email or "",
                "Phone": account.phone or "",
                "Segment": account.segment or "",
                "Description": account.description or "",
                "Billing Street": account.billing_street or "",
                "Billing City": account.billing_city or "",
                "Billing State": account.billing_state or "",
                "Billing Zip": account.billing_zip or "",
                "Billing Country": account.billing_country or "",
                "Shipping Street": account.shipping_street or "",
                "Shipping City": account.shipping_city or "",
                "Shipping State": account.shipping_state or "",
                "Shipping Zip": account.shipping_zip or "",
                "Shipping Country": account.shipping_country or "",
            }
            if is_person_account:
                row.update({
                    "Salutation": account.salutation or "",
                    "First Name": account.first_name or "",
                    "Last Name": account.last_name or "",
                    "Mobile": account.mobile or "",
                })
            else:
                row.update({
                    "Name": account.name,
                    "Website": account.website or "",
                    "Account Type": type_names.get(account.acc_type_id, ""),
                    "Industry": industry_names.get(account.industry_id, ""),
                })
            if tenant_industry == "travel":
                row.update({
                    "Travel Frequency": ind.get("travel_frequency", "") or "",
                    "Membership Tier": ind.get("membership_tier", "") or "",
                    "Membership Number": ind.get("membership_number", "") or "",
                    "Preferred Destinations": ", ".join(ind.get("preferred_destinations", []) or []),
                    "Preferred Experience Types": ", ".join(ind.get("preferred_experience_types", []) or []),
                })
            # Keep only spec columns + appended metadata
            row = {h: row.get(h, "") for h in headers}
            row["Owner"] = owner_names.get(account.owner_id, "")
            row["Created At"] = _fmt_dt(account.created_at)
            row["Updated At"] = _fmt_dt(account.updated_at)
            data.append(row)

        df = pd.DataFrame(data, columns=headers + ["Owner", "Created At", "Updated At"])
        return _df_to_bytes(df, format)

    # Backwards-compatible alias (old endpoint name)
    async def export_accounts_to_excel(self, accounts: List[Account], format: str = "xlsx") -> bytes:
        return await self.export_accounts_to_file(accounts, format)

    async def import_accounts_from_file(
        self,
        file: UploadFile,
        tenant_id: ObjectId,
        user_id: ObjectId,
        is_person_account: bool = False,
    ) -> Dict:
        """Import company or person accounts from Excel/CSV."""
        from app.schemas.industry_data import validate_industry_data

        df = await _read_dataframe(file)
        tenant_industry = await _tenant_industry(tenant_id)

        account_types = await _picklist_name_map(AccountType, tenant_id, tenant_industry, "account_type")
        industries = await _picklist_name_map(Industry, tenant_id, tenant_industry, "industry")

        imported = 0
        skipped = 0
        errors: List[str] = []

        for index, row in df.iterrows():
            row_num = index + 2  # header is row 1
            try:
                # --- Identity -------------------------------------------------
                salutation = first_name = last_name = None
                if is_person_account:
                    first_name = _get_val(row, "First Name", "first_name")
                    last_name = _get_val(row, "Last Name", "last_name")
                    if not first_name or not last_name:
                        errors.append(f"Row {row_num}: Missing required field 'First Name' or 'Last Name'")
                        continue
                    salutation = _get_val(row, "Salutation")
                    name = f"{first_name} {last_name}"
                else:
                    name = _get_val(row, "Name", "Account Name", "name")
                    if not name:
                        errors.append(f"Row {row_num}: Missing required field 'Name'")
                        continue

                email = _get_val(row, "Email")
                phone = _validate_phone(_get_val(row, "Phone"), "Phone")
                mobile = _validate_phone(_get_val(row, "Mobile"), "Mobile") if is_person_account else None

                # --- Picklists (company accounts only) -------------------------
                acc_type_id = industry_id = None
                if not is_person_account:
                    type_val = _get_val(row, "Account Type")
                    if type_val:
                        acc_type_id = account_types.get(str(type_val).lower())
                        if not acc_type_id:
                            errors.append(f"Row {row_num}: Invalid Account Type '{type_val}'")
                            continue
                    ind_val = _get_val(row, "Industry")
                    if ind_val:
                        industry_id = industries.get(str(ind_val).lower())
                        if not industry_id:
                            errors.append(f"Row {row_num}: Invalid Industry '{ind_val}'")
                            continue

                # --- Industry-specific data ------------------------------------
                industry_data: Dict[str, Any] = {}
                if tenant_industry == "travel":
                    freq = _get_val(row, "Travel Frequency")
                    if freq:
                        industry_data["travel_frequency"] = str(freq)
                    tier = _get_val(row, "Membership Tier")
                    if tier:
                        industry_data["membership_tier"] = str(tier)
                    number = _get_val(row, "Membership Number")
                    if number:
                        industry_data["membership_number"] = str(number)
                    dests = _split_list(_get_val(row, "Preferred Destinations"))
                    if dests:
                        industry_data["preferred_destinations"] = dests
                    exps = _split_list(_get_val(row, "Preferred Experience Types"))
                    if exps:
                        industry_data["preferred_experience_types"] = exps
                if industry_data:
                    industry_data = validate_industry_data(
                        industry=tenant_industry, data=industry_data, mode="account"
                    )

                # Duplicate-skipping is intentionally NOT performed on import:
                # the same name/email/mobile can legitimately recur, and every
                # row must be imported as its own account.

                segment = _normalize_segment(_get_val(row, "Segment"), "B2C" if is_person_account else "B2B")

                account = Account(
                    name=name,
                    is_person_account=is_person_account,
                    salutation=salutation,
                    first_name=first_name,
                    last_name=last_name,
                    email=str(email) if email else None,
                    phone=phone,
                    mobile=mobile,
                    website=_get_val(row, "Website") if not is_person_account else None,
                    description=_get_val(row, "Description"),
                    segment=str(segment) if segment else None,
                    acc_type_id=acc_type_id,
                    industry_id=industry_id,
                    billing_street=_get_val(row, "Billing Street"),
                    billing_city=_get_val(row, "Billing City"),
                    billing_state=_get_val(row, "Billing State"),
                    billing_zip=str(_get_val(row, "Billing Zip")) if _get_val(row, "Billing Zip") is not None else None,
                    billing_country=_get_val(row, "Billing Country"),
                    shipping_street=_get_val(row, "Shipping Street"),
                    shipping_city=_get_val(row, "Shipping City"),
                    shipping_state=_get_val(row, "Shipping State"),
                    shipping_zip=str(_get_val(row, "Shipping Zip")) if _get_val(row, "Shipping Zip") is not None else None,
                    shipping_country=_get_val(row, "Shipping Country"),
                    industry_data=industry_data,
                    tenant_id=tenant_id,
                    owner_id=user_id,
                    created_by=user_id,
                )
                await account.insert()
                imported += 1

            except ValueError as ve:
                errors.append(f"Row {row_num}: {str(ve)}")
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        return {"imported": imported, "skipped": skipped, "total": len(df), "errors": errors}

    # ================= Contacts =================

    async def export_contacts_to_file(
        self,
        contacts: List,
        format: str = "xlsx",
        tenant_id: Optional[ObjectId] = None,
        tenant_industry: Optional[str] = None,
    ) -> bytes:
        """Export contacts to Excel/CSV."""
        if tenant_id is None and contacts:
            tenant_id = contacts[0].tenant_id

        # Batch-resolve linked account names + owners (tenant-scoped)
        account_ids = list({c.account_id for c in contacts if c.account_id})
        account_names: Dict[ObjectId, str] = {}
        if account_ids:
            linked = await Account.find(
                {"_id": {"$in": account_ids}, "tenant_id": tenant_id}
            ).to_list()
            account_names = {a.id: a.name for a in linked}
        owner_names = await _owner_name_map([c.owner_id for c in contacts if c.owner_id], tenant_id)

        headers = [c["header"] for c in columns_for_entity("contact", tenant_industry)]

        data = []
        for contact in contacts:
            ind = contact.industry_data or {}
            row = {
                "Salutation": contact.salutation or "",
                "First Name": contact.first_name,
                "Last Name": contact.last_name,
                "Email": contact.email or "",
                "Phone": contact.phone or "",
                "Mobile": contact.mobile or "",
                "Title": contact.title or "",
                "Department": contact.department or "",
                "Account Name": account_names.get(contact.account_id, ""),
                "Description": contact.description or "",
                "Mailing Street": contact.mailing_street or "",
                "Mailing City": contact.mailing_city or "",
                "Mailing State": contact.mailing_state or "",
                "Mailing Zip": contact.mailing_zip or "",
                "Mailing Country": contact.mailing_country or "",
                "Other Street": contact.other_street or "",
                "Other City": contact.other_city or "",
                "Other State": contact.other_state or "",
                "Other Zip": contact.other_zip or "",
                "Other Country": contact.other_country or "",
            }
            if tenant_industry == "travel":
                row.update({
                    "Passport Number": ind.get("passport_number", "") or "",
                    "Passport Expiry": ind.get("passport_expiry", "") or "",
                    "Nationality": ind.get("nationality", "") or "",
                    "Date of Birth": ind.get("date_of_birth", "") or "",
                    "Frequent Flyer Number": ind.get("frequent_flyer_number", "") or "",
                    "Dietary Preferences": ", ".join(ind.get("dietary_preferences", []) or []),
                })
            row = {h: row.get(h, "") for h in headers}
            row["Owner"] = owner_names.get(contact.owner_id, "")
            row["Created At"] = _fmt_dt(contact.created_at)
            row["Updated At"] = _fmt_dt(contact.updated_at)
            data.append(row)

        df = pd.DataFrame(data, columns=headers + ["Owner", "Created At", "Updated At"])
        return _df_to_bytes(df, format)

    # Backwards-compatible alias (old endpoint name)
    async def export_contacts_to_excel(self, contacts: List, format: str = "xlsx") -> bytes:
        return await self.export_contacts_to_file(contacts, format)

    async def import_contacts_from_file(
        self,
        file: UploadFile,
        tenant_id: ObjectId,
        user_id: ObjectId,
    ) -> Dict:
        """Import contacts from Excel or CSV."""
        import re as _re
        from app.models.contact import Contact
        from app.models.account_contact import AccountContact
        from app.schemas.industry_data import validate_industry_data

        df = await _read_dataframe(file)
        tenant_industry = await _tenant_industry(tenant_id)

        imported = 0
        skipped = 0
        errors: List[str] = []

        for index, row in df.iterrows():
            row_num = index + 2
            try:
                first_name = _get_val(row, "First Name", "first_name")
                last_name = _get_val(row, "Last Name", "last_name")
                if not first_name or not last_name:
                    errors.append(f"Row {row_num}: Missing required field 'First Name' or 'Last Name'")
                    continue

                email = _get_val(row, "Email")
                phone = _validate_phone(_get_val(row, "Phone"), "Phone")
                mobile = _validate_phone(_get_val(row, "Mobile"), "Mobile")

                # Resolve linked account by name — tenant-scoped. A missing
                # account is an error so migrations import accounts first.
                account = None
                account_name = _get_val(row, "Account Name")
                if account_name:
                    account = await Account.find_one({
                        "tenant_id": tenant_id,
                        "deleted_at": None,
                        "name": {"$regex": f"^{_re.escape(str(account_name))}$", "$options": "i"},
                    })
                    if not account:
                        errors.append(
                            f"Row {row_num}: Account '{account_name}' not found — import accounts first or fix the name"
                        )
                        continue

                # Industry-specific data
                industry_data: Dict[str, Any] = {}
                if tenant_industry == "travel":
                    passport = _get_val(row, "Passport Number")
                    if passport:
                        industry_data["passport_number"] = str(passport)
                    expiry = _get_val(row, "Passport Expiry")
                    if expiry:
                        industry_data["passport_expiry"] = _normalize_date(expiry)
                    nationality = _get_val(row, "Nationality")
                    if nationality:
                        industry_data["nationality"] = str(nationality)
                    dob = _get_val(row, "Date of Birth")
                    if dob:
                        industry_data["date_of_birth"] = _normalize_date(dob)
                    ff = _get_val(row, "Frequent Flyer Number")
                    if ff:
                        industry_data["frequent_flyer_number"] = str(ff)
                    diet = _split_list(_get_val(row, "Dietary Preferences"))
                    if diet:
                        industry_data["dietary_preferences"] = diet
                if industry_data:
                    industry_data = validate_industry_data(
                        industry=tenant_industry, data=industry_data, mode="contact"
                    )

                # Duplicate-skipping is intentionally NOT performed on import:
                # the same email/mobile can legitimately recur, and every row
                # must be imported as its own contact.

                contact = Contact(
                    salutation=_get_val(row, "Salutation"),
                    first_name=str(first_name),
                    middle_name=_get_val(row, "Middle Name"),
                    last_name=str(last_name),
                    email=str(email) if email else None,
                    phone=phone,
                    mobile=mobile,
                    title=_get_val(row, "Title"),
                    department=_get_val(row, "Department"),
                    description=_get_val(row, "Description"),
                    mailing_street=_get_val(row, "Mailing Street"),
                    mailing_city=_get_val(row, "Mailing City"),
                    mailing_state=_get_val(row, "Mailing State"),
                    mailing_zip=str(_get_val(row, "Mailing Zip")) if _get_val(row, "Mailing Zip") is not None else None,
                    mailing_country=_get_val(row, "Mailing Country"),
                    other_street=_get_val(row, "Other Street"),
                    other_city=_get_val(row, "Other City"),
                    other_state=_get_val(row, "Other State"),
                    other_zip=str(_get_val(row, "Other Zip")) if _get_val(row, "Other Zip") is not None else None,
                    other_country=_get_val(row, "Other Country"),
                    account_id=account.id if account else None,
                    industry_data=industry_data,
                    tenant_id=tenant_id,
                    owner_id=user_id,
                    created_by=user_id,
                )
                await contact.insert()

                # Maintain the account-contact pivot like ContactService does
                if account:
                    await AccountContact(
                        account_id=account.id,
                        contact_id=contact.id,
                        tenant_id=tenant_id,
                    ).insert()

                imported += 1

            except ValueError as ve:
                errors.append(f"Row {row_num}: {str(ve)}")
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        return {"imported": imported, "skipped": skipped, "total": len(df), "errors": errors}

    # ================= Leads =================

    async def export_leads_to_file(
        self,
        leads: List,
        format: str = "xlsx",
        tenant_id: Optional[ObjectId] = None,
        tenant_industry: Optional[str] = None,
    ) -> bytes:
        """Export leads to Excel/CSV with picklist names resolved."""
        from app.models.consolidated_picklists import LeadStatus, Source, SourceMedium

        if tenant_id is None and leads:
            tenant_id = leads[0].tenant_id

        status_names = await _picklist_id_map(LeadStatus, [l.lead_status_id for l in leads if l.lead_status_id], tenant_id)
        source_names = await _picklist_id_map(Source, [l.source_id for l in leads if l.source_id], tenant_id)
        medium_names = await _picklist_id_map(SourceMedium, [l.source_medium_id for l in leads if l.source_medium_id], tenant_id)
        industry_names = await _picklist_id_map(Industry, [l.industry_id for l in leads if l.industry_id], tenant_id)
        owner_names = await _owner_name_map([l.owner_id for l in leads if l.owner_id], tenant_id)

        headers = [c["header"] for c in columns_for_entity("lead", tenant_industry)]

        data = []
        for lead in leads:
            ind = lead.industry_data or {}
            row = {
                "Salutation": lead.salutation or "",
                "First Name": lead.first_name,
                "Last Name": lead.last_name,
                "Email": lead.email or "",
                "Phone": lead.phone or "",
                "Mobile": lead.mobile or "",
                "Company": lead.company or "",
                "Title": lead.title or "",
                "No of Employees": lead.no_employees if lead.no_employees is not None else "",
                "Website": lead.website or "",
                "Street": lead.street or "",
                "City": lead.city or "",
                "State": lead.state or "",
                "Zip": lead.zip or "",
                "Country": lead.country or "",
                "Lead Status": status_names.get(lead.lead_status_id, ""),
                "Source": source_names.get(lead.source_id, ""),
                "Source Medium": medium_names.get(lead.source_medium_id, ""),
                "Industry": industry_names.get(lead.industry_id, ""),
                "Segment": lead.segment or "",
                "Campaign Name": lead.campaign_name or "",
            }
            if tenant_industry == "travel":
                destinations = ind.get("destinations") or []
                row.update({
                    "Travel Date": ind.get("travel_date", "") or "",
                    "No of Pax": ind.get("no_of_pax", "") if ind.get("no_of_pax") is not None else "",
                    "Destinations": ", ".join(destinations),
                })
            row = {h: row.get(h, "") for h in headers}
            row["Owner"] = owner_names.get(lead.owner_id, "")
            row["Converted"] = "Yes" if lead.is_converted else "No"
            row["Created At"] = _fmt_dt(lead.created_at)
            row["Updated At"] = _fmt_dt(lead.updated_at)
            data.append(row)

        df = pd.DataFrame(data, columns=headers + ["Owner", "Converted", "Created At", "Updated At"])
        return _df_to_bytes(df, format)

    async def import_leads_from_file(
        self,
        file: UploadFile,
        tenant_id: ObjectId,
        user_id: ObjectId,
    ) -> Dict:
        """Import leads from Excel or CSV"""
        from app.models.consolidated_picklists import LeadStatus, Source, SourceMedium, DestinationPicklist
        from app.schemas.lead import LeadCreate
        from app.services.lead_service import LeadService

        df = await _read_dataframe(file)
        tenant_industry = await _tenant_industry(tenant_id)

        # Fetch picklist mappings
        lead_statuses = await _picklist_name_map(LeadStatus, tenant_id, tenant_industry, "lead_status")
        sources = await _picklist_name_map(Source, tenant_id, tenant_industry, "source")
        source_mediums = await _picklist_name_map(SourceMedium, tenant_id, tenant_industry, "source_medium")
        industries = await _picklist_name_map(Industry, tenant_id, tenant_industry, "industry")

        imported = 0
        skipped = 0
        errors: List[str] = []

        lead_service = LeadService()

        for index, row in df.iterrows():
            row_num = index + 2
            try:
                # Require First Name and Last Name
                first_name = _get_val(row, "First Name", "first_name")
                last_name = _get_val(row, "Last Name", "last_name")
                if not first_name or not last_name:
                    errors.append(f"Row {row_num}: Missing required field 'First Name' or 'Last Name'")
                    continue

                # Map picklists safely
                status_val = _get_val(row, "Lead Status", "lead_status", "Status")
                status_id = None
                if status_val:
                    status_id = lead_statuses.get(str(status_val).lower())
                    if not status_id:
                        errors.append(f"Row {row_num}: Invalid Lead Status '{status_val}'")
                        continue

                source_val = _get_val(row, "Source", "source")
                source_id = None
                if source_val:
                    source_id = sources.get(str(source_val).lower())
                    if not source_id:
                        errors.append(f"Row {row_num}: Invalid Source '{source_val}'")
                        continue

                sm_val = _get_val(row, "Source Medium", "source_medium")
                sm_id = None
                if sm_val:
                    sm_id = source_mediums.get(str(sm_val).lower())
                    if not sm_id:
                        errors.append(f"Row {row_num}: Invalid Source Medium '{sm_val}'")
                        continue

                ind_val = _get_val(row, "Industry", "industry")
                ind_id = None
                if ind_val:
                    ind_id = industries.get(str(ind_val).lower())
                    if not ind_id:
                        errors.append(f"Row {row_num}: Invalid Industry '{ind_val}'")
                        continue

                no_employees_raw = _get_val(row, "No of Employees", "No. of Employees", "Employees")
                no_employees = None
                if no_employees_raw is not None:
                    try:
                        no_employees = int(float(no_employees_raw))
                    except Exception:
                        pass

                zip_code = _get_val(row, "Zip", "Postal Code", "Zip/Postal Code")

                # Strict phone validation with a row error — LeadCreate's
                # safe_phone_validator would otherwise silently drop bad
                # phones, hiding data mistakes during migration.
                phone = _validate_phone(_get_val(row, "Phone"), "Phone")
                lead_mobile = _validate_phone(_get_val(row, "Mobile"), "Mobile")

                lead_create_data = {
                    "salutation": _get_val(row, "Salutation"),
                    "first_name": str(first_name),
                    "middle_name": _get_val(row, "Middle Name"),
                    "last_name": str(last_name),
                    "email": _get_val(row, "Email"),
                    "phone": phone,
                    "mobile": lead_mobile,
                    "company": _get_val(row, "Company"),
                    "title": _get_val(row, "Title"),
                    "no_employees": no_employees,
                    "website": _get_val(row, "Website"),
                    "street": _get_val(row, "Street"),
                    "city": _get_val(row, "City"),
                    "state": _get_val(row, "State"),
                    "zip": str(zip_code) if zip_code is not None else None,
                    "country": _get_val(row, "Country"),
                    "lead_status_id": str(status_id) if status_id else None,
                    "source_id": str(source_id) if source_id else None,
                    "source_medium_id": str(sm_id) if sm_id else None,
                    "industry_id": str(ind_id) if ind_id else None,
                    "segment": _normalize_segment(_get_val(row, "Segment"), "B2C"),
                    "campaign_name": _get_val(row, "Campaign Name"),
                    "source_medium": _get_val(row, "Source Medium Text", "source_medium_text"),
                    "creation_type": "import",
                }

                # Travel-specific columns -> industry_data
                industry_data: Dict[str, Any] = {}
                travel_date = _get_val(row, "Travel Date", "travel_date")
                if travel_date:
                    industry_data["travel_date"] = _normalize_date(travel_date)

                no_of_pax = _get_val(row, "No of Pax", "no_of_pax", "Pax")
                if no_of_pax is not None:
                    try:
                        industry_data["no_of_pax"] = int(float(no_of_pax))
                    except Exception:
                        pass

                # Resolve destination names -> picklist ids (tenant or platform)
                dest_val = _get_val(row, "Destinations", "destinations")
                if dest_val:
                    dest_names = _split_list(dest_val)
                    dest_ids = []
                    import re as _re
                    for dname in dest_names:
                        dest_item = await DestinationPicklist.find_one({
                            "name": {"$regex": f"^{_re.escape(dname)}$", "$options": "i"},
                            "picklist_type": "destination",
                            "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}],
                        })
                        if dest_item:
                            dest_ids.append(str(dest_item.id))
                    if dest_ids:
                        industry_data["destination_ids"] = dest_ids
                    if dest_names:
                        industry_data["destinations"] = dest_names

                lead_create_data["industry_data"] = industry_data

                lead_create = LeadCreate(**lead_create_data)

                # Create via LeadService to run the standard pipelines
                # (BD assignment, notifications). Duplicate-skipping is disabled
                # for imports — the same email/mobile may recur across rows and
                # each row must be imported as its own lead.
                await lead_service.create_lead(
                    lead_data=lead_create,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    auto_assign=False,  # the importing user owns the records
                    skip_duplicate_check=True,
                )
                imported += 1

            except ValueError as ve:
                # Validation errors -> skipped
                skipped += 1
                errors.append(f"Row {row_num}: {str(ve)}")
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        return {"imported": imported, "skipped": skipped, "total": len(df), "errors": errors}
