"""
Create the lead custom fields that website enquiry capture fills in.

Capture saves a value only when a lead custom field with that exact name
exists (same rule as the old CRM), so without these fields the lead is still
created but those values are skipped. Safe to run multiple times: existing
fields are left untouched. Dry run unless --apply is given.

Target DB comes from .env (MONGODB_URL / MONGODB_DB_NAME).

Usage:
  cd apps/backend
  python -m scripts.setup_website_capture_fields                       # tenant = WEBSITE_CAPTURE_TENANT_ID
  python -m scripts.setup_website_capture_fields --apply
  python -m scripts.setup_website_capture_fields --tenant-id <id> --apply
"""
import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from beanie import PydanticObjectId  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.mongodb import init_db  # noqa: E402
from app.models.tenant import Tenant  # noqa: E402
from app.schemas.field_registry import AdditionalFieldCreate  # noqa: E402
from app.services import field_registry_service  # noqa: E402
from app.services.website_lead_mapper import WEBSITE_CAPTURE_CUSTOM_FIELDS  # noqa: E402


async def main(tenant_id: str, apply: bool) -> int:
    await init_db()
    tid = PydanticObjectId(tenant_id)
    tenant = await Tenant.get(tid)
    if not tenant:
        print(f"ABORT: tenant {tenant_id} not found in {settings.MONGODB_DB_NAME}")
        return 1
    print(f"Tenant: {tenant.company_name} ({tenant_id}) in {settings.MONGODB_DB_NAME}")

    existing = {
        (field.name or "").strip().lower()
        for field in await field_registry_service.list_additional_fields("lead", tid)
    }
    missing = [(name, label) for name, label in WEBSITE_CAPTURE_CUSTOM_FIELDS if name.lower() not in existing]
    for name, label in WEBSITE_CAPTURE_CUSTOM_FIELDS:
        state = "exists " if name.lower() not in {m[0].lower() for m in missing} else "missing"
        print(f"  {state}  {name:<18} {label}")

    if not missing:
        print("Nothing to create.")
        return 0
    if not apply:
        print(f"Dry run: {len(missing)} field(s) would be created. Re-run with --apply.")
        return 0

    created_by = (
        PydanticObjectId(settings.WEBSITE_CAPTURE_OWNER_USER_ID)
        if settings.WEBSITE_CAPTURE_OWNER_USER_ID
        else None
    )
    for name, label in missing:
        await field_registry_service.create_additional_field(
            "lead",
            AdditionalFieldCreate(name=name, label=label, field_type="text"),
            tid,
            created_by=created_by,
        )
        print(f"  created  {name}")
    print(f"Created {len(missing)} field(s).")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--tenant-id", default=settings.WEBSITE_CAPTURE_TENANT_ID)
    parser.add_argument("--apply", action="store_true", help="create the missing fields")
    args = parser.parse_args()
    if not args.tenant_id:
        parser.error("--tenant-id is required when WEBSITE_CAPTURE_TENANT_ID is not set")
    sys.exit(asyncio.run(main(args.tenant_id, args.apply)))
