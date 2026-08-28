# Tutterfly Parity Migration — Phase-by-Phase Execution Plan

Source of truth: [old_routes.csv](old_routes.csv) (1050 rows) and [diff.md](diff.md) (739 missing).
Target: every old route either ported, renamed-mapped, or marked `decommissioned` in `apps/backend/MIGRATION.md`.

Each phase carries:
- **Scope** (exact old routes covered)
- **Backend deliverables** (files to create/edit)
- **Frontend deliverables** (Next.js pages/features)
- **Models / migrations** needed
- **Tests** (parity + smoke)
- **Exit checklist** (must all be ✅ to close phase)

A route is **closed** only when it appears in `new_routes.csv` AND a parity test asserts equivalence.

---

## Phase 0 — Bootstrap & Tooling

**Scope**: Lock the inventory; nothing else moves until this is frozen.

### Backend
- [x] `docs/parity/extract_routes.py` (done)
- [x] `docs/parity/old_routes.csv` (1050 rows, frozen)
- [x] `docs/parity/new_routes.csv` (353 rows, regenerate after each phase)
- [x] `docs/parity/diff.md` (regenerate after each phase)
- [ ] `apps/backend/MIGRATION.md` — running ledger: `old_path | new_path | status (ported|renamed|decommissioned) | phase | notes`
- [ ] `apps/backend/tests/parity/` skeleton with `conftest.py` that loads `old_routes.csv`
- [ ] `apps/backend/tests/parity/test_route_inventory.py` — fails the build if a phase regresses

### Frontend
- [ ] `apps/frontend/src/lib/api/parity.ts` — typed client wrapper consumed by every new page
- [ ] Storybook or Vitest harness for new admin pages

### Exit checklist
- [ ] CI runs `python docs/parity/extract_routes.py && pytest tests/parity` green
- [ ] `MIGRATION.md` committed with all 1050 rows pre-populated `status=missing`
- [ ] PR template includes "phase / parity rows closed" field

---

## Phase 1 — Custom Fields + Standard Fields + Picklists (Settings backbone)

User flagged this explicitly ("pothr field", "Settings"). Highest leverage — many entities depend on it.

### Old routes covered (110+ rows)

**Additional fields (custom fields)** — one set per entity in `{account, contact, lead, opportunity, personal_account, supplier}`:
```
GET    /rest_addfield_{entity}                     index
POST   /rest_addfield_{entity}                     store
GET    /rest_addfield_{entity}/{id}                show
PUT    /rest_addfield_{entity}/{id}                update
DELETE /rest_addfield_{entity}/{id}                destroy
GET    /rest_addfield_{entity}_active              showActiveFields
GET    /admin_addfield_{entity}_active             showAdminActiveFields
POST   /sort_{entity}_fields                       sort_fields
POST   /status_update_additional_field             status_update
POST   /mandatory_update_additional_field          mandatory_update
```
Plus aliases: `rest_addfield_pa_a`, `admin_addfield_pa_a`, `rest_addfield_o_a`, `admin_addfield_o_a`.

**Standard fields** — one set per entity (account, contact, lead, opportunity, personal_account, supplier):
```
GET    /rest_standard_fields_{entity}              restStandardFields{Entity}
GET    /rest_standard_fields_{entity}_admin        restStandardFields{Entity}Admin
GET    /edit_{entity}_standard_fields/{id}         edit{Entity}StandardField
POST   /update_{entity}_standard_fields/{id}       update{Entity}StandardField
POST   /update_{entity}_standard_fields_status/{id}      ...ActivationStatus
POST   /update_{entity}_standard_fields_mandatory/{id}   ...Mandatory
POST   /sort_{entity}_st_fields                    sort_fields
```

**Picklists** (admin-managed master data, all `Route::resource`):
```
/admin/rest_salutations
/admin/rest_lead_statuses
/admin/rest_task_priorities
/admin/rest_sales_stages
/admin/rest_experiences
/admin/rest_opportunity_tags
/admin/rest_itinerary_inclusions
/admin/rest_task_statuses
/admin/rest_inclusions
/admin/rest_source
/admin/rest_source_medium
/admin/rest_destinations
/admin/supplier_rest_ratings
/admin/supplier_rest_types
/admin/supplier_rest_services
/admin/rest_industries
/admin/rest_ratings
/admin/rest_categories
```
Plus all `sort_*_fields` admin endpoints (15 total).

### Backend deliverables
- `apps/backend/app/api/v1/custom_fields.py` — generic router, polymorphic on `entity_type`
- `apps/backend/app/api/v1/standard_fields.py` — same
- `apps/backend/app/api/v1/picklists.py` — single router serving all 18 picklists via `/picklists/{type}` path
- `apps/backend/app/services/custom_field_service.py` (new)
- `apps/backend/app/services/standard_field_service.py` (new)
- `apps/backend/app/services/picklist_service.py` (new)
- Schemas: `app/schemas/custom_field.py`, `standard_field.py`, `picklist.py`
- DB migrations:
  - `custom_fields` table (entity_type, name, label, type, options, sort_order, is_active, is_mandatory, tenant_id)
  - `standard_fields` table (entity_type, field_key, is_active, is_mandatory, sort_order, tenant_id)
  - `picklists` table (type enum, value, label, sort_order, is_active, tenant_id) + per-type tables already in `app/models/picklists.py`
- Reuse existing models: `app/models/custom_fields.py`, `lead_custom_fields.py`, `opportunity_custom_fields.py`, `lead_picklists.py`, `opportunity_picklists.py`, `picklists.py`

### Frontend deliverables
- `apps/frontend/src/app/settings/layout.tsx` — settings hub shell with sidebar
- `apps/frontend/src/app/settings/page.tsx` — landing
- `apps/frontend/src/app/settings/custom-fields/[entity]/page.tsx` — CRUD + drag-sort + activate/mandatory toggles
- `apps/frontend/src/app/settings/standard-fields/[entity]/page.tsx`
- `apps/frontend/src/app/settings/picklists/[type]/page.tsx`
- `apps/frontend/src/features/settings/` module (hooks, types, API client)

### Tests
- `tests/parity/test_phase1_custom_fields.py` — every old `rest_addfield_*` resolves on new
- `tests/parity/test_phase1_standard_fields.py`
- `tests/parity/test_phase1_picklists.py`
- Integration: create→list→update→sort→toggle active→toggle mandatory round-trip per entity
- Frontend e2e: `apps/frontend/src/__tests__/settings/custom-fields.spec.ts`

### Exit checklist
- [ ] All 110+ Phase-1 rows in `MIGRATION.md` flipped to `ported`
- [ ] `pytest tests/parity/test_phase1_*` green
- [ ] Settings hub renders for {account, contact, lead, opportunity, personal_account, supplier}
- [ ] Drag-and-drop sort persists
- [ ] Active/mandatory toggles round-trip
- [ ] Re-run `extract_routes.py`; missing count drops by ≥110

### Phase 1 — CROSS-CUTTING field propagation (must be done together; no shipping the CRUD without these)

When the field subsystem ships, every service that handles those entities must respect the new field registry. Old Laravel got this wrong (orphaned custom fields, ignored mandatory flag, lost custom fields on lead→opportunity conversion). Don't replicate the bugs. Concrete diff list:

#### A. SERVICES — extend in same PR as the CRUD

| Service | Current state | Required change |
|---|---|---|
| `app/services/lead_service.py` (lines 73, 118–130) | `create_lead()` already inserts `LeadCustomField` records | Wire `update_lead()` (currently silent on custom fields), enforce mandatory flag from `standard_fields` registry |
| `app/services/opportunity_service.py` (line 30) | accepts `custom_fields` param but **does nothing** | Add insertion logic mirroring `lead_service` lines 118–130; wire update path |
| `app/services/account_service.py` | no custom-field code | Add create + update + delete cascade for `account_custom_fields` table |
| `app/services/account_service_with_activity.py` | no custom-field code | Same as above + diff custom fields into activity log |
| `app/services/contact_service.py` | no custom-field code | Add create + update + delete cascade for `contact_custom_fields` |
| `app/services/supplier_service.py` | no custom-field code | Add same for `supplier_custom_fields` |
| `app/services/activity_log_service.py` + `enhanced_activity_log_service.py` | only diffs standard fields | Diff custom-field changes by joining `*_custom_fields` rows by `*_additional_field_id` and comparing `field_value` |
| `app/services/import_export_service.py` (line 11) | only maps `AccountType, Industry, Rating` picklists | Extend `export_accounts_to_excel()` and `import_accounts_from_file()` to pull dynamic columns from `additional_field_accounts` registry; same per entity |
| `app/services/report_service.py` | hardcoded to standard fields | Add dynamic column builder reading from `additional_field_*` tables; column picker UI must surface custom fields |
| `app/services/email_service.py` + `template_service.py` | static template tokens | Add `{{custom.<field_name>}}` resolver that reads from `*_custom_fields` at send time |
| `app/services/notification_service.py` | static payloads | Add custom-field payload support for entity-change notifications |
| `app/services/dashboard_service.py` | standard-field aggregations | Allow groupings/filters by custom fields if surfaced in pipeline / kanban |
| `app/services/visibility_scope.py` + `opportunity_hierarchy_scope.py` | row-level scoping | Add field-level access control hook (per-field visibility per role) — old system lacked this; do not regress |

#### B. LEAD → OPPORTUNITY CONVERSION (critical bug fix carry-over)

`app/services/lead_service.py::convert_lead()` (line 446–950) currently **does NOT copy** `LeadCustomField` rows into `OpportunityCustomField`. Old Laravel had this bug too (web path orphaned, only the unused `ConvertLeadToOpportunityCommand` CLI mapped fields).

Fix in Phase 1, in same PR as the new field CRUD:

- Right after the opportunity insert (around line 914 of `lead_service.py`), query `LeadCustomField.where(lead_id=lead.id)`.
- For each row, look up the corresponding `OpportunityAdditionalField` by `field_name` (or by an admin-managed mapping table `lead_to_opportunity_field_map` — recommended).
- Insert `OpportunityCustomField` rows with the resolved opportunity_additional_field_id and original field_value.
- Same for lead → personal_account conversion (B2C path).
- Test: round-trip a lead with 5 custom fields → convert → assert opportunity has 5 corresponding `OpportunityCustomField` rows.

#### C. SCHEMAS — extend in same PR

Response schemas currently strip custom fields (per audit). Fix:

| Schema | Current | Required |
|---|---|---|
| `app/schemas/lead.py::LeadResponse` | no `custom_fields` | add `custom_fields: Dict[str, Any]` populated from join |
| `app/schemas/opportunity.py::OpportunityResponse` | no `custom_fields` | same |
| `app/schemas/account.py::AccountResponse` | no `custom_fields` | same |
| `app/schemas/contact.py::ContactResponse` | no `custom_fields` | same |
| `app/schemas/supplier.py::SupplierResponse` | no `custom_fields` | same |
| All `*ListResponse` schemas (paginated list wrappers) | strip custom fields | preserve them (frontend grid needs them for column display) |

#### D. ENDPOINTS — wire payload through

These currently accept `custom_fields` in input schema but **drop the value** before reaching the DB:

- `POST /api/v1/accounts`, `PUT /api/v1/accounts/{id}`
- `POST /api/v1/contacts`, `PUT /api/v1/contacts/{id}`
- `POST /api/v1/opportunities`, `PUT /api/v1/opportunities/{id}`
- `PUT /api/v1/leads/{id}` (create works, update silently drops)
- All list/search endpoints (`GET /accounts`, `/contacts`, `/leads`, `/opportunities`, `/suppliers`) — must include custom fields in response when requested via `?include=custom_fields`

#### E. PICKLIST PROPAGATION (avoid old hardcoded-stage-ID bug)

Old Laravel hardcoded `sales_stage_id = 4` in `RestIncentiveCalculateController` for "Close Won". When stages got reordered, incentive calc broke. New must:

- Replace hardcoded picklist IDs with **slugs** or **system_key** lookups (`SalesStage.where(system_key='close_won')`).
- Audit these new files for hardcoded picklist IDs and refactor:
  - `app/services/incentive_service.py`
  - `app/services/dashboard_service.py`
  - `app/services/opportunity_service.py` + `_enhanced.py`
  - `app/services/report_service.py`
  - `app/services/lead_service.py` (lead status filtering)
- Add migration: `alter picklist tables add column system_key varchar unique` and seed with stable keys.
- Stage history (`OpportunityHistory`): currently stores stage **name**; switch to `sales_stage_id` + dereferenced label at read time so renames don't corrupt history.

#### F. STANDARD FIELD MANDATORY FLAG (close the validation gap)

Old Laravel stored `mandatory` on `standard_field_*` but never validated. New **must enforce**:

- Add a request validator that loads active standard fields for the entity and rejects payloads missing any `is_mandatory=true` field.
- Apply on: `create`, `update`, `import`, `lead_capture` (public), `mobile_*` endpoints.
- Same enforcement for `additional_fields.is_mandatory`.
- Test: create endpoint with mandatory field set → POST without it → expect 422.

#### G. VIEWS / COLUMNS / FILTERS (Phase 4 dependency)

Phase 4 ports the views/columns subsystem. **Before** Phase 4 ships, Phase 1 must:

- Define a stable `field_id` (UUID, not auto-int) for every additional/standard field so saved views/filters survive field re-creation.
- Emit a webhook/event when a field is deleted so saved views can self-clean.
- Expose `GET /api/v1/custom_fields/{entity}/active` returning the canonical list — Phase 4 column-config UI will consume this.

#### H. EMAIL TEMPLATE DYNAMIC COLUMNS (Phase 7 dependency)

Old `rest_dynamic_email_template_column` reads `AdditionalField{Entity}::get()` at runtime. Phase 7 will reuse this. Phase 1 must:

- Expose `GET /api/v1/custom_fields/{entity}/template-tokens` returning `[{token: "{{custom.mobile_alt}}", label: "Alt Mobile"}, …]`.
- Validate template body at save time → reject if it references a deleted field.

#### I. WEBHOOKS / LEAD CAPTURE / FB CAPTURE (Phase 6 + 7 dependency)

Old captured only standard fields from external sources, leaving custom fields blank. Phase 1 must:

- Define mapping config table `external_source_field_map` (source_id → external_key → internal_field_id).
- Phase 6's `lead_capture_service.py` will look up this map on payload arrival and insert into `*_custom_fields`.

#### J. MOBILE ENDPOINTS (Phase 16 dependency)

Mobile shims must respect the same field registry. When Phase 16 lands, the mobile entity responses use the **same** `*Response` schemas extended in step C — no separate field handling. Phase 1 enforces this by making the response schema the single source.

#### K. ACTIVITY LOG (must NOT be deferred)

Audit trail for field changes is a Phase 1 deliverable, not a backlog item:

- Extend `ActivityMixin.log_entity_updated()` to accept `custom_field_changes: Dict[field_id, (old, new)]`.
- All entity update services pass this dict.
- Frontend timeline component shows custom-field diffs.

#### L. INDUSTRY DATA INTERACTION

`industry_data` JSON (travel/healthcare/manufacturing/education) is a separate concept from custom fields. Phase 1 must:

- Document the boundary: `industry_data` = vertical-specific structured fields validated by `app/schemas/industry_data/*`. Custom fields = tenant-defined ad-hoc fields.
- Custom-field create endpoint must reject names that collide with industry_data keys for the active industry.

#### M. REPOSITORIES

`app/repositories/base_repository.py` is field-agnostic. Add helper:
- `BaseRepository.with_custom_fields()` that eager-loads the join, used by every list endpoint.

#### N. MERGE / CHANGE-OWNER FLOWS

When Phase 6 implements account/contact/lead merge and change-owner, custom fields must be preserved. Old Laravel `RestAccountMergeController` did **not** propagate custom fields. New must:

- In merge: prefer the surviving record's custom fields; for fields populated only on the merged record, copy over.
- In change-owner: keep custom fields, only mutate `owner_id`. Test.

### Phase 1 expanded exit checklist (supersedes the basic one above)

- [ ] All Phase 1 routes in `MIGRATION.md` `ported`
- [ ] Every service in section A updated and unit-tested
- [ ] Lead → opportunity conversion copies custom fields (round-trip test green)
- [ ] All response schemas in section C include custom_fields
- [ ] All endpoints in section D persist custom_fields end-to-end (integration test)
- [ ] No hardcoded picklist IDs remain in services (grep `sales_stage_id\s*=\s*\d`, `lead_status_id\s*=\s*\d` returns 0)
- [ ] Mandatory-flag validator enforced on create + update + import + lead_capture (test asserts 422 on omission)
- [ ] Activity log diff includes custom-field changes (visible in timeline UI)
- [ ] Email template tokens endpoint live (`/template-tokens`)
- [ ] Field-deletion webhook fires; saved views self-clean (test)
- [ ] Frontend grids show custom-field columns when configured (e2e screenshot diff)

---

## Phase 2 — Settings Hub (Company / Leaderboard / Auto-Assignment / Email Footer / Bank / Logo / Department)

### Old routes covered (~45 rows, all under `/admin` group)

**Company / branding**
- `GET /admin/opp_settings` `RestCompanySettingsController@oppSettings`
- `POST /admin/opp_settings_change`
- `Route::resource /admin/rest_company_settings`
- `POST /admin/bank_update`
- `POST /admin/logo_update`

**Email footers**
- `Route::resource /admin/rest_email_footers`
- `POST /rest_email_footer_user` (per-user override)

**Leaderboard**
- `GET /admin/leaderBoardSettings`
- `POST /admin/saveParameter`
- `POST /admin/saveAccolade`
- `POST /admin/savePerformance`

**Auto-assignment scheduler** (`SchedulerSettingController`)
- `GET  /admin/get-auto-assignment-setting`
- `POST /admin/store-auto-assignment-settings`
- `POST /admin/store-user-wise-assignment-settings`
- `GET  /admin/get-user-wise-assignment-settings`
- `POST /admin/update-user-wise-assignment-settings`
- `POST /admin/delete-user-wise-assignment-settings`
- `GET  /admin/get-country-wise-user`
- `POST /admin/store-country-wise-user`
- `POST /admin/update-country-wise-user`
- `POST /admin/delete-country-wise-user`

**Department settings** (`RestDepartmentSetting`)
- `GET  /admin/department_settings`
- `POST /admin/department_settings`
- `GET  /admin/department_users/{id}`
- `POST /admin/department_users`

**Agent connect**
- `GET  /admin/get_agent`
- `POST /admin/agent_connect`

### Backend deliverables
- `app/api/v1/settings.py` (extend) — sub-routers `/settings/company`, `/settings/leaderboard`, `/settings/email-footer`, `/settings/agent`
- `app/api/v1/auto_assignment.py` (new) — scheduler + user-wise + country-wise
- `app/api/v1/department_settings.py` (new) — or extend `departments.py`
- Services: extend `settings_service.py`; new `auto_assignment_service.py`
- Models: `company_settings`, `leaderboard_config`, `email_footer`, `auto_assignment_rule`, `country_user_assignment`, `department_product_destination`
- Migration: add tables above

### Frontend deliverables
- `apps/frontend/src/app/settings/company/page.tsx` (profile + bank + logo upload)
- `apps/frontend/src/app/settings/leaderboard/page.tsx`
- `apps/frontend/src/app/settings/email-footer/page.tsx`
- `apps/frontend/src/app/settings/auto-assignment/page.tsx` (rules + user-wise + country-wise tabs)
- `apps/frontend/src/app/settings/departments/page.tsx`

### Tests
- `tests/parity/test_phase2_settings.py`
- `tests/parity/test_phase2_auto_assignment.py`
- File upload (logo) integration test

### Exit checklist
- [ ] All ~45 Phase-2 rows `ported`
- [ ] Logo upload + bank update + leaderboard config persist
- [ ] Auto-assignment scheduler triggers cron correctly (Celery/APScheduler)

---

## Phase 3 — Territory + Region

### Old routes (~10)

```
Route::resource /admin/rest_territories
GET   /admin/get_destinations
GET   /admin/rest_bd_report_list
POST  /admin/rest_bd_report_list
GET   /admin/get_regions                  RestRegionController
GET   /admin/get_countries
GET   /admin/get_region_by_countries/{id}
GET   /admin/get_country_by_destinations/{id}
GET   /get_update_admin_opportunity_region (incentive)
```

### Backend
- `app/api/v1/territories.py` (extend) — add BD report list + region tree
- `app/api/v1/regions.py` (new)
- Service: `territory_service.py` (extend), `region_service.py` (new)
- Models: ensure `region`, `country`, `destination` linkage exists

### Frontend
- `apps/frontend/src/app/settings/territory/page.tsx`
- `apps/frontend/src/app/settings/territory/[id]/page.tsx`
- `apps/frontend/src/app/settings/regions/page.tsx`
- BD report drill-down

### Tests
- `tests/parity/test_phase3_territory.py`
- Region tree depth + assignment test

### Exit checklist
- [ ] Region → country → destination tree renders
- [ ] Territory CRUD + assignment + report list all work
- [ ] Bulk opportunity-region update (`/get_update_admin_opportunity_region`) ported

---

## Phase 4 — Views / Columns / Filters / Pinned Views (per entity)

### Old routes (~85)

For each entity in `{account, contact, lead, opportunity, personal_account, supplier, task}`:
```
Route::resource /rest_{entity}_views
Route::resource /rest_{entity}_columns
POST /rest_{entity}_filters
POST /rest_pin_views_{entity}
POST /rest_unpin_views_{entity}
POST /rest_{entity}_additional_columns
```

### Backend
- `app/api/v1/views.py` — polymorphic CRUD on `entity_views`
- `app/api/v1/columns.py` — polymorphic column config
- `app/api/v1/pinned_views.py`
- Service: `view_service.py`, `column_service.py`
- Models: extend `account_views`, `contact_views`, add `lead_views`, `opportunity_views`, `supplier_views`, `task_views`, `pinned_view`

### Frontend
- `apps/frontend/src/features/views/` — `<ViewBar/>`, `<ColumnConfig/>`, `<PinnedViews/>`, `useEntityView` hook
- Wire into every list page (`/accounts`, `/contacts`, `/leads`, `/opportunities`, `/person-accounts`, `/suppliers`, `/tasks`)

### Tests
- `tests/parity/test_phase4_views.py` (parameterized over 7 entities)

### Exit checklist
- [ ] Saved views work per entity
- [ ] Column config persists
- [ ] Filters POST round-trips
- [ ] Pin/unpin updates user state

---

## Phase 5 — Itinerary Engine (Travel Vertical Core)

Largest phase — old has 3 itinerary engines (Legacy, ItinerariesNew, TourItinerary).

### Old routes (~80)

**Legacy itinerary**
```
Route::resource /rest_itineraries
POST /rest_itineraries_copy
POST /delete_itinerary
Route::resource /rest_itinerary_days
Route::resource /rest_itinerary_schedule_new
Route::resource /rest_itinerary_categories
Route::resource /rest_itinerary_sub_categories
Route::resource /rest_itinerary_hotels
Route::resource /rest_itinerary_flights
Route::resource /rest_itinerary_flights_new
POST /rest_itinerary_flights_modify
GET  /hotel_list/{id}
POST /image_to_b64
POST /search_flight
GET  /itinerary_flights_details/{id}
GET  /testing_purpose/{id}
```

**Tour itinerary**
```
GET  /get_tour_create
GET  /get_tour_name
Route::resource /rest_itineraries_tour
Route::resource /rest_itinerary_hotels_tour
Route::resource /rest_itinerary_schedule_tour
POST /updateTransfer
POST /copyTourItinerary
POST /add_inclision_exclusion_tour
POST /add_itinerary_setting_tour
GET  /itinerary_flights_details_tour/{id}
POST /search_hotel_tour
POST /search_flight_tour
POST /send_itinerary_email_tour
GET  /get_itineraries_price/{id}
POST /update_itineraries_price/{id}
```

**ItinerariesNew (current engine)**
```
Route::resource /rest_itineraries_new
GET  /get_all_inclusions
POST /update_day_inclusions
POST /update_day_destinations
POST /update_day_descriptions
GET  /search_itinerary
GET  /search_itinerary_new
POST /send_itinerary_email
Route::resource /rest_user_itinerary_inclusions
GET  /rest_itinerary_destinations
GET  /rest_itinerary_timezones
Route::resource /rest_header_footers
POST /header_footer_type
POST /itinerary_banner_image
GET  /rest_opp_itinerary_create
POST /rest_opp_itinerary_attach
```

**PDF pipeline**
```
GET  /pdf_response
GET  /pdf_response_app
GET  /itinerary_pdf/{id}
GET  /itinerary_pdf_new/{itinerary_type}/{id}/{template_id}/{template_type_id}
GET  /call_pdf
GET  /check_pdf_status
GET  /itinerary_publish_html/{id}/{template_id}/{template_type_id}
```

**Proforma invoice**
```
Route::resource /rest_proforma_invoices
GET  /gen_proforma_invoices/{id}
GET  /rest_profinvoice_download
POST /rest_profinvoice_email
```

### Backend
- `app/api/v1/itineraries.py` (rewrite) — sub-routers: `tour`, `legacy`, `new`, `days`, `schedule`, `categories`, `hotels`, `flights`, `inclusions`, `header_footer`
- `app/api/v1/itinerary_pdf.py` — Azure callbacks + status polling
- `app/api/v1/proforma_invoices.py`
- Services: `itinerary_service.py` (rewrite), `pdf_service.py`, `proforma_service.py`
- Models: extend `itinerary.py`, add `itinerary_day`, `itinerary_schedule`, `itinerary_hotel`, `itinerary_flight`, `itinerary_category`, `itinerary_subcategory`, `itinerary_inclusion`, `header_footer`, `proforma_invoice`
- Background job: PDF render queue (Celery)

### Frontend
- `apps/frontend/src/app/itineraries/[id]/edit/page.tsx` — full builder
- `apps/frontend/src/app/itineraries/[id]/preview/page.tsx`
- `apps/frontend/src/app/itineraries/tour/**`
- `apps/frontend/src/features/itineraries/builder/` — day editor, schedule grid, hotel picker, flight picker
- `apps/frontend/src/features/itineraries/pdf/` — PDF status poll + download

### Tests
- `tests/parity/test_phase5_itinerary_legacy.py`
- `tests/parity/test_phase5_itinerary_tour.py`
- `tests/parity/test_phase5_itinerary_new.py`
- `tests/parity/test_phase5_pdf.py`
- E2E: build → save → generate PDF → download

### Exit checklist
- [ ] All 3 engines reachable
- [ ] PDF roundtrips via Azure
- [ ] Proforma invoice email send works
- [ ] All ~80 rows `ported`

---

## Phase 6 — Opportunity Workflow (Departures, Vouchers, Locks, Claims, Handover, Lead Capture)

### Old routes (~50)

**Locks**
```
GET  /automatic_lock
GET  /opportunity_lock/{id}
POST /user_opportunity_unlock
```

**Stage / support**
```
POST /opportunities_shifed
GET  /rest_opportunities_support
```

**BD pipeline**
```
Route::resource /rest_bd_opportunities
Route::resource /bd_opportunities
GET  /bd_opportunities_view
GET  /bd_opportunities_columns/{id}
```

**Inclusions / suppliers**
```
POST /opportunities_inclusions/{id}
POST /opp_incl_supp_amt
```

**Flags / teams**
```
POST /change_key_deals
POST /checked_opportunity
POST /opportunity_teams
```

**Departures**
```
POST /departure_details
POST /departure_hold
POST /departure_hold_book
POST /agent_departures
POST /departure_book
GET  /agent_departure_booked/{id}
```

**Operations**
```
POST /operation_owner_change
POST /operation_assessment
POST /send_rfq
```

**Schedules**
```
POST /save_opp_schedule
POST /save_opp_schedule_received
```

**Vouchers**
```
POST /save_voucher/{id}
POST /update_voucher/{id}
GET  /generate_voucher/{id}
GET  /delete_voucher/{id}
```

**Ledger**
```
POST /rest_ledger_account
POST /rest_ledger_account_edit
```

**Claims / handover**
```
POST /opportunities-claimed
POST /claimed-opportunities-reports
POST /hand-over-opportunity
```

**Lead capture (public + auth)**
```
POST /capture_lead                       (public)
POST /check_capture_leads                (public)
POST /check_capture_leads_ref_id         (public)
POST /capture_lead_facebook              (public)
POST /get_facebook_token                 (public)
GET  /get_tenant_user_details            (public)
POST /automatic_capture                  (public)
GET  /pull_leads_fb
GET  /delete_external_lead/{id}
POST /save_fb_leads
GET  /check_tenant_fb
GET  /get_fb_leads
```

**My pipeline**
```
GET  /get_user_today_pipeline/{user_id}
GET  /rest_opps_mypipeline
```

### Backend
- `app/api/v1/opportunities.py` (extend) — locks, support, key deals, teams, schedules
- `app/api/v1/bd_opportunities.py` (new) or sub-router
- `app/api/v1/departures.py` (new)
- `app/api/v1/vouchers.py` (new)
- `app/api/v1/ledger.py` (new)
- `app/api/v1/opportunity_claims.py` (new)
- `app/api/v1/handover.py` (new)
- `app/api/v1/lead_capture.py` (new, mounted as public router)
- `app/tasks/opportunity_locks.py` — Celery cron for `automatic_lock`
- Services: extend `opportunity_service.py`, new `voucher_service.py`, `ledger_service.py`, `lead_capture_service.py`
- Models: `voucher`, `ledger_account`, `departure`, `opportunity_team`, `opportunity_schedule`, `opportunity_claim`, `handover_request`, `external_lead`

### Frontend
- `apps/frontend/src/app/opportunities/[id]/departures/page.tsx`
- `apps/frontend/src/app/opportunities/[id]/vouchers/page.tsx`
- `apps/frontend/src/app/opportunities/[id]/ledger/page.tsx`
- `apps/frontend/src/app/bd-opportunities/page.tsx`
- `apps/frontend/src/app/handover/page.tsx`
- `apps/frontend/src/app/lead-capture/[token]/page.tsx` (public)

### Tests
- `tests/parity/test_phase6_locks.py`
- `tests/parity/test_phase6_departures.py`
- `tests/parity/test_phase6_vouchers.py`
- `tests/parity/test_phase6_lead_capture.py` (incl. public endpoints)

### Exit checklist
- [ ] All ~50 rows `ported`
- [ ] Auto-lock cron runs in dev
- [ ] FB lead capture round-trips with sample webhook payload

---

## Phase 7 — Email / Gmail / WhatsApp / Chatbot

### Old routes (~30)

**Gmail**
```
GET  /googleAuth
POST /fetch_mail
POST /get_mail
POST /setup_gmail
POST /remove_gmail
POST /get_gmail_token
POST /send_mail_gmail
POST /get_attachment
POST /get_singleMail
POST /search_gmail
POST /shync-gmail
POST /gmail-testing
```

**Email client / conversations**
```
GET  /email_client/emails
GET  /email_client_seen
GET  /rest_conversations
POST /rest_email_image
POST /rest_email_image_editor
POST /rest_setup_mail
POST /create_mail_setup
```

**Email templates**
```
Route::resource /rest_email_templates
POST /rest_dynamic_email_template_column
GET  /rest_email_templates (front-list)
```

**WhatsApp / Chatbot (public webhooks + auth)**
```
GET  /config-webhook
POST /chat-bot
POST /chat-bot-test
GET  /get-all-templates
POST /createTemplate
POST /deleteTemplate
POST /send-whatsapp-message
POST /check-valid-whatsapp-user
GET  /get-whatsapp-messages
POST /send-whatsapp-media
POST /get-media
POST /send-whatsapp-template
```

**AI**
```
GET  /ai_email_report (api_key middleware)
```

### Backend
- `app/api/v1/gmail.py` — OAuth + fetch + send
- `app/api/v1/email_client.py` — inbox + conversations
- `app/api/v1/email_templates.py` — extend `templates.py` or new
- `app/api/v1/whatsapp.py` — Meta webhook + send
- `app/api/v1/chatbot.py` — listener
- `app/api/v1/ai_email.py` — gated by API key middleware
- Services: `gmail_service.py`, `whatsapp_service.py`, `email_template_service.py`
- Middleware: `app/middleware/api_key.py`

### Frontend
- `apps/frontend/src/app/email/page.tsx` (inbox + composer)
- `apps/frontend/src/app/whatsapp/page.tsx` (chat)
- `apps/frontend/src/app/settings/email-templates/page.tsx`

### Tests
- `tests/parity/test_phase7_gmail.py`
- `tests/parity/test_phase7_whatsapp.py`
- Webhook signature verification tests

### Exit checklist
- [ ] All ~30 rows `ported`
- [ ] Gmail OAuth round-trip in dev
- [ ] WhatsApp webhook signature verifies

---

## Phase 8 — Reports (Standard Reports + Folders + Preview + Sample Files)

### Old routes (~25)

**Standard reports** (`RestStandardReportController`)
```
POST /rest_st_report
POST /user_st_report
POST /user_st_report_oppo
POST /user_st_report_oppo_d_i
POST /user_st_report_oppo_d_i_pipeline
POST /user_st_report_oppo_country
POST /active_user_report
POST /account_contact_report
POST /leads_report
POST /team_reports
POST /report_lead_conversion
POST /agent_departure_report
```

**Folders**
```
Route::resource /rest_folders
Route::resource /rest_folders_list
GET  /rest_private_reports
GET  /rest_public_reports
GET  /rest_folders_created_by_me
GET  /rest_shared_with_me_folders
POST /rest_share_folders
```

**Preview / clone / created-by-me / export format**
```
POST /rest_report_previews
GET  /rest_reports_created_by_me
POST /report_clone
POST /format_data_export
```

**Sample download (for imports)**
```
GET  /rest_sample_download/{type}
```

**User reports**
```
GET  /get_user_report_performance
GET  /get_user_report
```

### Backend
- `app/api/v1/standard_reports.py` (new)
- `app/api/v1/report_folders.py` (new)
- `app/api/v1/report_preview.py` (new)
- `app/api/v1/user_reports.py` (new)
- `app/api/v1/sample_files.py` (new)
- Service: extend `report_service.py`, new `report_folder_service.py`
- Model: `report_folder`, `report_share`

### Frontend
- `apps/frontend/src/app/reports/folders/page.tsx`
- `apps/frontend/src/app/reports/standard/[type]/page.tsx`
- `apps/frontend/src/app/reports/preview/page.tsx`

### Exit checklist
- [ ] All ~25 rows `ported`
- [ ] Folder CRUD + share works
- [ ] Standard report exports CSV match old format

---

## Phase 9 — Files / Folders / Sharing / Public Links

### Old routes (~25)

```
Route::resource /rest_files
Route::resource /rest_share_files
Route::resource /rest_file_folders
GET  /rest_files_new
GET  /rest_share_files_new
POST /rest_files_new/{id}                 (versioning)
GET  /rest_files_download/{id}
GET  /recent_files_all
GET  /rest_files_display/{encrypted_id}
GET  /rest_files_preview/{id}             (public)
GET  /rest_files_public_link/{id}
GET  /rest_files_public_url/{encrypted_id} (public)
GET  /rest_shared_files_by_admin
POST /rest_share_folder
GET  /rest_share_folder_list
GET  /rest_shared_files_by_admin_new
GET  /file_delete/{id}
GET  /folder_delete/{id}
```

### Backend
- `app/api/v1/files.py` (extend) — versioning, public-link tokens, display
- `app/api/v1/file_folders.py` (new) or sub-router
- `app/api/v1/file_shares.py` (new)
- Service: extend `file_service.py`
- Model: extend `file.py`, add `file_version`, `file_share`, `folder`

### Frontend
- `apps/frontend/src/app/files/folders/[id]/page.tsx`
- `apps/frontend/src/app/files/shared/page.tsx`
- `apps/frontend/src/app/files/[id]/versions/page.tsx`
- `apps/frontend/src/app/public/files/[token]/page.tsx` (public)

### Exit checklist
- [ ] All ~25 rows `ported`
- [ ] Public link expires correctly
- [ ] Versioning round-trips

---

## Phase 10 — User Management (Profile, Targets, Directory, Login Logs, Auto-Assign Users)

### Old routes (~30)

**Profile**
```
Route::resource /rest_profiles
POST /rest_profiles_update_password
POST /rest_avatars/upload
POST /rest_banners/upload
POST /create_mail_setup                   (overlap with Phase 7)
```

**Targets**
```
GET  /admin/users_sales_target
POST /admin/updateCurrentTarget
POST /admin/updateUserTargets
POST /admin/updateUserTargetsEdit
POST /admin/updateAllUserTargets
POST /set_user_target
GET  /team_sales_target
```

**Directory / status / login logs**
```
GET  /get_directory
GET  /get_user_status
POST /update_user_status
GET  /directory_check
GET  /login_logs
```

**BD users**
```
GET  /admin/rest_bd_users
GET  /get_bd_user_detail
```

**Auto-assign users**
```
GET    /rest_auto_users
POST   /rest_auto_users_store
GET    /rest_auto_users_edit/{id}
PUT    /rest_auto_users_update/{id}
DELETE /rest_auto_users_delete/{id}
```

**Admin actions**
```
POST /admin/rest_users_deactivate
POST /admin/rest_users_reactivate
POST /admin/update_user_sales_org
POST /admin/send_reset_pswd
GET  /admin/get_all_users
GET  /admin/get_all_active_users
```

**Role hierarchy**
```
Route::resource /admin/rest_role_hierarchies
GET  /admin/rest_role_hierarchies_assign/{id}
POST /admin/rest_role_hierarchies_assign
```

### Backend
- `app/api/v1/users.py` (extend) — targets, directory, login logs, deactivate
- `app/api/v1/profiles.py` (new) — distinct from `users.py` (legacy split)
- `app/api/v1/auto_assign_users.py` (new)
- `app/api/v1/role_hierarchies.py` — verify `hierarchies.py` already covers; if not extend
- Service: extend `user_service.py`, `role_service.py`
- Model: `user_target`, `user_status`, `auto_assign_user`, `role_hierarchy`

### Frontend
- `apps/frontend/src/app/profile/page.tsx`
- `apps/frontend/src/app/admin/users/targets/page.tsx`
- `apps/frontend/src/app/admin/directory/page.tsx`
- `apps/frontend/src/app/admin/login-logs/page.tsx`
- `apps/frontend/src/app/admin/auto-assign-users/page.tsx`

### Exit checklist
- [ ] All ~30 rows `ported`
- [ ] Avatar/banner upload works
- [ ] Target editor matrix functional

---

## Phase 11 — Dashboard (BD + Standard + Quick Links + Performance Graphs)

### Old routes (~25)

```
GET  /rest_dashboard
GET  /rest_user_activities
GET  /rest_leader_board
GET  /rest_leader_board-user
POST /save_quick_links
POST /delete_quick_links
GET  /get_oppo_dashboard
GET  /get_my_oppo_dashboard
GET  /get_bd_oppo_dashboard
GET  /get_bd_dashboard_today_oppo
GET  /get_bd_dashboard_today_revenue
GET  /get_bd_dashboard_tomorrow_dep
GET  /get_bd_opp_graph_performance
GET  /get_bd_stage_oppo_percentage
GET  /opp_graph_performance
GET  /opp_graph_performance_test
GET  /stage_percentage
GET  /team_performance
POST /rest_monthly_performance
GET  /countries_opportunities_updated
GET  /exp_opp
GET  /exp_opp_state
```

### Backend
- `app/api/v1/dashboards.py` (extend) — BD-specific + graph + leaderboard + quick links
- Service: extend `dashboard_service.py`
- Model: `quick_link`, `monthly_performance`

### Frontend
- `apps/frontend/src/app/dashboard/bd/page.tsx`
- `apps/frontend/src/app/dashboard/page.tsx` (extend with quick links + graphs)

### Exit checklist
- [ ] All ~25 rows `ported`
- [ ] BD dashboard tiles render with live data

---

## Phase 12 — Search Modules / Notes-in-Search / Supplier Templates

### Old routes (~10)

```
GET  /rest_search_modules
POST /rest_search_modules_post
POST /rest_notes_add
POST /rest_notes_get
POST /admin/rest_supplier_template
POST /admin/rest_supplier_template_update
POST /admin/rest_supplier_template_delete
GET  /admin/get_supplier_template
```

### Backend
- `app/api/v1/search.py` (extend) — modules config + notes
- `app/api/v1/supplier_templates.py` (new)

### Frontend
- `apps/frontend/src/app/admin/search-modules/page.tsx`
- `apps/frontend/src/app/admin/supplier-templates/page.tsx`

---

## Phase 13 — Imports / Exports (per entity)

### Old routes (~15)

```
GET  /rest_field_lists
GET  /rest_leads_export/{type}
POST /rest_leads_import
GET  /rest_accounts_export/{type}
POST /rest_accounts_import
GET  /rest_contacts_export/{type}
POST /rest_contacts_import
GET  /rest_personal_accounts_export/{type}
POST /rest_personal_accounts_import
POST /rest_tasks_import
POST /rest_opportunities_import
POST /rest_opportunity_histories_import
GET  /rest_import_lead_sync
```

### Backend
- `app/api/v1/imports.py` (new) — generic per-entity
- `app/api/v1/exports.py` (new)
- Service: `import_export_service.py` (extend)

### Frontend
- `apps/frontend/src/app/imports/page.tsx`
- `apps/frontend/src/app/imports/[entity]/page.tsx`

---

## Phase 14 — Notifications + FCM + Reminders + Mobile Tokens

### Old routes (~10)

```
POST /fcm_update
GET  /view_notification
GET  /check_notification
GET  /all_notification
GET  /get_all_notification
POST /storeToken (mobile)
GET  /send_reminder (cron)
```

### Backend
- `app/api/v1/notifications.py` (extend) — FCM token registration
- `app/api/v1/fcm.py` or fold in
- `app/tasks/reminders.py` — cron sender
- Service: `notification_service.py` (extend), `fcm_service.py` (new)

### Exit checklist
- [ ] FCM token registration works
- [ ] Reminder cron fires

---

## Phase 15 — Subscription / Billing

### Old routes (~15)

```
POST /create-product
POST /create-plan-byproductid
POST /create-user
POST /create-customer-with-subscription
GET  /get-existing-users
GET  /get-product-list
POST /create-subscription-for-existing-user
POST /getUserCheckoutDetail
GET  /get-product
POST /get-plans
POST /get-single-plan
GET  /subscription_update
GET  /subscription_upgrade
POST /check-user-create
GET  /check-user-exception
GET  /admin/billing
GET  /check_tenant_subscription
GET  /user_plan_modules/{product_id}
```

### Backend
- `app/api/v1/billing.py` (extend) — full Razorpay parity
- `app/api/v1/subscription.py` (new) — products, plans, checkout
- Service: extend `billing_service.py`

### Frontend
- `apps/frontend/src/app/billing/page.tsx`
- `apps/frontend/src/app/billing/checkout/page.tsx`

---

## Phase 16 — Mobile API Suite

### Old routes (~15)

```
GET    /rest_dashboard_m
GET    /rest_user_activities_m
Route::resource /rest_accounts_m
GET    /rest_accounts_search_m
POST   /rest_accounts_change_owner_m
Route::resource /rest_file_folders_m
Route::resource /rest_contacts_m
POST   /rest_contacts_change_owner_m
Route::resource /rest_opportunities_m
POST   /rest_opportunities_change_owner_m
Route::resource /rest_personal_accounts_m
POST   /rest_opportunities_sales_stages_m
Route::resource /rest_leads_m
POST   /rest_leads_change_owner_m
```

### Backend
- `app/api/v1/mobile/` directory — thin shim routers wrapping the main entity services with mobile-shaped responses
- Lighter payloads, optimised for bandwidth

### Frontend
- (out of scope — for native app)

---

## Phase 17 — Misc Endpoints / Cleanup

### Old routes (~30)

**Public utility**
```
GET  /send_reminder                       (cron trigger)
GET  /check_tenant_activity
GET  /pdf_response                         (Phase 5 already)
GET  /pdf_response_app                     (Phase 5 already)
GET  /php_info                             (DECOMMISSION — security risk)
```

**Misc auth**
```
POST /UserPasswordReset                   (already in /auth/password-reset)
POST /verify/normal_email/resend
GET  /verifyemail/{token}
GET  /logout
GET  /login_logs                           (Phase 10)
POST /access_login                         (impersonation)
```

**S3 / lat-long / countries-states-cities**
```
GET  /get_s3_url
POST /get_lat_long
GET  /search_country
GET  /countries
POST /states
POST /cities
GET  /operators
```

**Picklists already covered (Phase 1)**

**Standard fields update (Phase 1)**

**Email setup (Phase 7)**

**Channels (websocket — Pusher)**
- `routes/channels.php` — port to FastAPI WebSocket router

**Console commands** — port each to Celery beat schedule:
- `app/Console/Commands/*.php` (enumerate, port one-by-one)

**Mailables (15)** — port to email template + Celery task pattern

**Jobs (13)** — port to Celery tasks

### Backend
- `app/api/v1/auth.py` (verify aliases)
- `app/api/v1/utils.py` (s3 url, lat-long, search-country)
- `app/api/v1/geo.py` (countries / states / cities) — verify `countries.py` covers
- `app/websocket/` (new) for channels
- `app/tasks/` — port jobs + console commands
- `app/services/email/` — port mailables

### Decommission list (mark in MIGRATION.md)
- `/php_info` — security risk
- `/exp_opp`, `/exp_opp_test`, `/opp_graph_performance_test`, `/gmail-testing` — dev/test endpoints

### Exit checklist
- [ ] All remaining rows either `ported` or `decommissioned` with reason
- [ ] WebSocket channels operational
- [ ] All Celery beat jobs scheduled
- [ ] `extract_routes.py` re-run shows 0 missing
- [ ] `MIGRATION.md` 100% complete
- [ ] Frontend nav has every old menu item

---

## Final Verification Gate

Before declaring parity complete:

1. **Inventory zero-miss**: `python docs/parity/extract_routes.py` reports `Missing: 0` (after accounting for renamed and decommissioned).
2. **Parity test suite**: `pytest tests/parity/` green for all 17 phases.
3. **MIGRATION.md ledger**: every old row has `status ∈ {ported, renamed, decommissioned}` with non-empty new_path or reason.
4. **Frontend coverage**: every old menu item maps to a Next.js route; no `/coming-soon` placeholders for in-scope features.
5. **Smoke test**: docker-compose old + new side-by-side, hit 50 random old endpoints and corresponding new ones, compare response shapes.
6. **Sign-off**: PR title `parity-complete`, link to `MIGRATION.md` proof.

---

## Cross-cutting concerns (apply every phase)

- **Multi-tenant**: every new endpoint filters by `current_user.tenant_id`. Verify in `tests/parity/test_tenant_isolation.py`.
- **Permissions**: every new endpoint gated by `check_permission()` decorator matching old `rest.admin` middleware where applicable.
- **Activity logging**: every mutation logs to `activity_log_service`.
- **Soft delete**: `deleted_at` field, no hard deletes.
- **Industry data**: lead/opportunity routes carry `industry_data` JSON, validated by `app/schemas/industry_data/*`.
- **Rate limiting**: public endpoints (lead capture, webhooks) protected by middleware.
- **Audit**: `MIGRATION.md` updated in same PR as the route port; CI fails if PR adds endpoints without ledger update.
