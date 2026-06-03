# Tutterfly CRM — Engineering Guide for Claude Code

Tutterfly is a **multi-tenant, multi-industry** Travel CRM.
- Backend: FastAPI + Beanie/MongoDB — `apps/backend`
- Frontend: Next.js (App Router) + React Query + Tailwind/shadcn — `apps/frontend`

These rules are non-negotiable. Read them before touching any query, model, schema, or list endpoint.

---

## 1. Multi-tenant isolation (NON-NEGOTIABLE)

Every record belongs to a tenant. One tenant's data must **never** be readable or writable by another.

- Every domain model extends `BaseDocument` (`app/models/base.py`) and carries `tenant_id` plus a soft-delete `deleted_at`.
- **Every query must be tenant-scoped**: `{"tenant_id": current_user.tenant_id, "deleted_at": None, ...}`. Never query a domain collection without `tenant_id`.
- On writes, set `tenant_id = current_user.tenant_id`. **Never trust a `tenant_id` (or owner/foreign id) coming from the request body.**
- **Cross-reference lookups are tenant-scoped too.** When resolving owner / created_by / parent / related ids, fetch with `{"_id": {"$in": ids}, "tenant_id": current_user.tenant_id}`. A stale or forged foreign id must not leak another tenant's data.
- Reassigning ownership (change-owner) must validate the new owner is an active user **in the same tenant**.
- Within a tenant, record visibility is further scoped by ownership/hierarchy. Use `get_visible_owner_ids(current_user)` and `is_record_visible(...)` from `app/services/visibility_scope.py` on list / detail / update / delete.
- New endpoints depend on `current_user = Depends(check_permission("..."))` (or `get_current_user`) and scope by `current_user.tenant_id`. Add/extend a tenant-isolation test under `apps/backend/tests/security/`.
- Soft-delete (`deleted_at`) domain records; do not hard-delete.

## 2. Multi-industry (NON-NEGOTIABLE)

A tenant has an `industry` (e.g. `travel`, `healthcare`). Fields, picklists, and behavior vary by industry.

- Resolve the industry via `tenant.industry` or `get_tenant_industry(tenant_id)` (`app/services/industry_service.py`).
- Industry-specific fields live in the `industry_data` dict on Account / Opportunity / Lead and **must** pass through `validate_industry_data(industry=..., data=..., mode=...)` (`app/schemas/industry_data.py`) on create/update. Never store unvalidated `industry_data`.
- **Picklists** (Industry, AccountType, AccountSource, SalesStage, …) are shared as platform defaults (`tenant_id = None`) **plus** per-tenant overrides. Always query with `build_picklist_query(tenant_id, industry=<tenant industry>, picklist_type="...")` and de-dupe with `dedup_picklist_items(...)` (`app/core/picklist_query.py`). Never hardcode picklist values; never return another tenant's overrides.
- Frontend renders industry-specific inputs via `IndustryLeadFields` / `IndustryOpportunityFields`; gate industry UI on the tenant's industry.

## 3. Saved list views

- **Generic per-entity views**: `EntityView` + `/api/v1/entity_views/...`, `entity_type ∈ {account, personal_account, contact, lead, opportunity, supplier, task}`. Tenant-scoped, with `is_public` (visible to the whole tenant) vs private (creator only).
- **Accounts / Person Accounts** currently use `AccountView` + `/accounts/views`, scoped by `tenant_id` + `is_person_account` + `public_view`; the saved filters are applied server-side in `get_accounts`.
- Any saved-view feature MUST be **tenant-scoped** and **module-scoped** — one module's views never appear in another. Honor the public/private ("who sees this list view") flag on both write and read.

## 4. Conventions

- Backend layout: routes `app/api/v1`, services `app/services`, models `app/models`, schemas `app/schemas`.
- Frontend layout: feature folders `src/features/<feature>`; data access via services (`src/lib/api/...` or feature `services/`) + React Query.
- Phone numbers use `PhoneInput`; format is `+<code> <10 digits>` (see `PHONE_REGEX` in `app/core/validators.py`). `mobile` is a person-account-only field (B2C); B2B/company accounts have phone only.
- Verify before claiming done: backend `python -m py_compile <files>` and `python -c "from app.main import app"`; frontend `npx tsc --noEmit` (ignore pre-existing errors in generated `.next/` and unrelated files).
