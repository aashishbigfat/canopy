# Completion Plan — Reach 100% Parity

**Current:** 51% effective / 57% critical-feature parity. Backend complete at endpoint level for all 17 phases. Frontend ~70% of high-value pages live.

**Goal:** Close all remaining gaps. 9 sprints, sequential by dependency.

---

## SPRINT A — Backend gap closure (~30 routes)
**Effort:** 1.5 days · **Dependency:** none

### A1. Department incentives (2 routes)
- `GET /api/v1/admin/department-incentives` — aggregate incentive across departments
- `POST /api/v1/admin/department-incentives/by-month` — monthly drill-down
- File: extend [admin_settings.py](Tutterfly-main/apps/backend/app/api/v1/admin_settings.py)
- Service: [incentive_service.py](Tutterfly-main/apps/backend/app/services/incentive_service.py) → add `aggregate_by_department(year, month)`

### A2. Itinerary day-level mutations (3 routes)
- `POST /api/v1/itineraries/{id}/days/{day_id}/destinations`
- `POST /api/v1/itineraries/{id}/days/{day_id}/descriptions`
- `POST /api/v1/itineraries/{id}/days/{day_id}/inclusions`
- File: extend [itineraries_extra.py](Tutterfly-main/apps/backend/app/api/v1/itineraries_extra.py)

### A3. Itinerary publish-html + tour deep paths (5 routes)
- `GET /api/v1/itineraries/{id}/publish-html?template_id=X&template_type_id=Y`
- `POST /api/v1/itineraries/tour/{id}/inclusions-exclusions`
- `POST /api/v1/itineraries/tour/{id}/settings`
- `GET /api/v1/itineraries/tour/{id}/flights/details`
- `POST /api/v1/itineraries/tour/{id}/email`
- File: same router

### A4. Email image upload + editor (2 routes)
- `POST /api/v1/messaging/email/image-upload` (multipart)
- `POST /api/v1/messaging/email/image-editor` (rich-text image insertion)
- File: extend [messaging.py](Tutterfly-main/apps/backend/app/api/v1/messaging.py)

### A5. AI email reader (1 public route)
- `GET /api/v1/misc/ai-email-report` — gated by `X-Api-Key` header
- File: extend [misc.py](Tutterfly-main/apps/backend/app/api/v1/misc.py)
- Middleware: add `app/middleware/api_key.py` for header validation

### A6. Lead capture cleanup (5 routes)
- `POST /api/v1/opportunities/external-leads/check-duplicate`
- `POST /api/v1/opportunities/external-leads/check-by-ref-id`
- `POST /api/v1/opportunities/external-leads/save-fb`
- `GET /api/v1/opportunities/external-leads/check-fb-tenant`
- `GET /api/v1/opportunities/external-leads/pull-fb`
- File: extend [opportunity_workflow.py](Tutterfly-main/apps/backend/app/api/v1/opportunity_workflow.py)

### A7. Misc utility (5 routes)
- `GET /api/v1/misc/operators` — operator picklist for filter UI
- `GET /api/v1/misc/email-client/seen` — IMAP seen flag
- `POST /api/v1/misc/email-setup` — SMTP config store
- `GET /api/v1/misc/check-pdf-status` — Azure PDF poll
- `GET /api/v1/misc/get-tenant-user-details` — public tenant probe

### A8. Standard reports drill-downs (4 routes)
- `POST /api/v1/reports/standard/team-by-month` — team rollup grouped by month
- `POST /api/v1/reports/standard/lead-source-funnel`
- `POST /api/v1/reports/standard/owner-conversion`
- `POST /api/v1/reports/standard/agent-bookings`
- File: extend [reports_extra.py](Tutterfly-main/apps/backend/app/api/v1/reports_extra.py)

### Exit gate
- [ ] `python docs/parity/extract_routes.py && python docs/parity/build_migration.py` shows ≥ 700 new routes
- [ ] All 30 routes return 200/401 (no 404) via TestClient probe

---

## SPRINT B — Phase 4 list-page wiring (7 entity list pages)
**Effort:** 2 days · **Dependency:** Sprint A backend

For each of `/accounts`, `/contacts`, `/leads`, `/opportunities`, `/person-accounts`, `/suppliers`, `/tasks`:

1. Import `<ViewBar/>`, `<ColumnConfig/>` from `features/views/`
2. Wire above the data table:
   ```tsx
   <div className="flex items-center justify-between">
     <ViewBar entity="lead" onViewChange={setActiveFilters} currentFilters={filters} />
     <ColumnConfig entity="lead" />
   </div>
   ```
3. Pass `activeFilters` into the existing data-fetch call
4. Use `entityViewsService.listColumns(entity)` to drive table columns
5. Render custom-field columns when `is_additional=true` by reading `customFieldsService.readValues(entity, recordId)` per row (debounced)

### Exit gate
- [ ] All 7 list pages render saved views + column toggles
- [ ] Custom fields appear as columns when activated
- [ ] E2E: create view → reload → view persists

---

## SPRINT C — Phase 5 itinerary builder UI (largest piece)
**Effort:** 4 days · **Dependency:** Sprint A itinerary backend complete

### C1. Builder page shell
- `/itineraries/[id]/edit/page.tsx` — full builder
- Left rail: day list (drag-reorder)
- Center: selected-day editor
- Right rail: preview pane

### C2. Day editor sub-components
- `<DayHeader/>` — title, city, destination picker
- `<ScheduleTimeline/>` — drag-drop schedule items by hour
- `<HotelPicker/>` — search + select hotels (uses `itineraryExtrasService.searchHotels`)
- `<FlightPicker/>` — search flights (uses `searchFlights`)
- `<MealsToggle/>` — breakfast/lunch/dinner switches
- `<TransportRow/>` — transport mode + details
- `<InclusionsList/>` — toggle which inclusions apply

### C3. Header/footer/banner picker
- `/itineraries/[id]/branding/page.tsx`
- Reuses `itineraryExtrasService.listHeaderFooters('header'|'footer'|'banner')`

### C4. PDF preview tab
- `/itineraries/[id]/pdf/page.tsx`
- Fires `requestPdf` → polls `pdfStatus` every 2s → shows iframe of `pdf_url` when done

### C5. Hotels + flights tabs (browse all linked)
- `/itineraries/[id]/hotels/page.tsx`
- `/itineraries/[id]/flights/page.tsx`

### Components to add
- `features/itineraries/Builder.tsx`
- `features/itineraries/DayEditor.tsx`
- `features/itineraries/ScheduleTimeline.tsx`
- `features/itineraries/HotelPicker.tsx`
- `features/itineraries/FlightPicker.tsx`
- `features/itineraries/PDFPoller.tsx`

### Exit gate
- [ ] Build a 5-day itinerary end-to-end
- [ ] Generate PDF, download succeeds
- [ ] Email proforma works
- [ ] Tour and Legacy engines reachable from `/itineraries`

---

## SPRINT D — Custom-field response join (cross-cutting)
**Effort:** 1 day · **Dependency:** none

### D1. Backend service-layer join
For each entity service (`account_service`, `contact_service`, `lead_service`, `opportunity_service`, `supplier_service`):
- After fetching the entity, call `field_registry_service.read_custom_field_values(entity_type, entity_id, tenant_id)`
- Attach result to `entity.custom_fields` before returning
- For list endpoints: batch-fetch all values for visible entities in one query, key by entity_id

Helper to add: `field_registry_service.bulk_read_custom_field_values(entity_type, entity_ids, tenant_id)` returning `Dict[entity_id_str, ValueMap]`.

### D2. Activity log diff
Extend `ActivityMixin.log_entity_updated()` to accept `custom_field_changes: Dict[field_id, (old, new)]`. Compute diff in each entity's update path:
1. Before `await write_custom_field_values(...)`, fetch existing values
2. After write, compute diff
3. Pass into log call

### D3. Frontend rendering
- `features/custom-fields/CustomFieldDisplay.tsx` — pretty-prints a `CustomFieldValueRead` map
- Drop into entity detail pages (`/leads/[id]`, `/opportunities/[id]`, etc.)
- Drop into entity list pages (rendered via `<ColumnConfig/>` toggles)

### Exit gate
- [ ] GET `/api/v1/leads/{id}` returns `custom_fields: {field_id: {value, name, label}}`
- [ ] Detail page shows custom fields in info panel
- [ ] Activity timeline shows `field_x: "old" → "new"` for custom field changes

---

## SPRINT E — Phase 12 search modules + Phase 17 utilities
**Effort:** 1 day · **Dependency:** none

### E1. Search modules admin
- `/admin/search-modules/page.tsx` — checklist of which entities are searchable + per-entity weight slider
- Uses `searchExtrasService.getModules` / `saveModules`

### E2. Supplier email templates admin
- `/admin/supplier-templates/page.tsx`
- Uses `searchExtrasService.listSupplierTemplates`

### E3. Misc utility pages
- `/admin/integrations/facebook/page.tsx` — paste long-lived token, page id; uses `miscService.storeFbToken` + `fbHealth`
- `/admin/integrations/s3/page.tsx` — quick S3 upload helper using `miscService.getS3Url`
- Email verification landing: `app/(auth)/verify-email/[token]/page.tsx` — calls `miscService.verifyEmail(token)`

### Exit gate
- [ ] Search module weights save and reload
- [ ] FB token stores successfully
- [ ] Email verification flow round-trips

---

## SPRINT F — Phase 11 dashboard widgets + Phase 14 push UI
**Effort:** 1 day · **Dependency:** Sprint A

### F1. Dashboard quick-links widget
- `<QuickLinksWidget/>` — drag-add links, used on `/dashboard/page.tsx`
- Uses `dashboardsExtraService.listQuickLinks` + `saveQuickLink`

### F2. Stage-percentage chart on main dashboard
- Drop `dashboardsExtraService.stagePercentage` into bar/donut chart on `/dashboard`
- Add team-performance card

### F3. FCM permission UI
- `features/notifications/EnablePushButton.tsx`
- Calls `Notification.requestPermission()` → `serviceWorker.register()` → `getToken()` from Firebase SDK → `fcmService.registerToken(...)`
- Mount on `/profile` page footer

### Exit gate
- [ ] Quick links persist across reloads
- [ ] Dashboard renders 3 charts
- [ ] FCM token registers on supported browsers

---

## SPRINT G — Mobile API audit + parity test suite
**Effort:** 1 day · **Dependency:** Sprints A-F

### G1. Mobile parity tests
- `apps/backend/tests/parity/test_mobile.py` — assert every `*_m` old route maps to `/api/v1/mobile/*` new
- Compare response shapes against `apps/backend/tests/fixtures/mobile_responses.json`

### G2. Run full parity test
- Generate `tests/parity/test_route_inventory.py` that loads `old_routes.csv`, asserts every row has either:
  - matching new path
  - `status=decommissioned` in `MIGRATION.md`
- CI fails if any row is `missing`

### G3. Update MIGRATION.md ledger
- Run `python docs/parity/build_migration.py` after each sprint
- Tag remaining rows as `decommissioned` with reason or `ported` with new path

### Exit gate
- [ ] `pytest tests/parity/` green for all phases
- [ ] `MIGRATION.md` shows zero `missing` rows
- [ ] `extract_routes.py` reports 0 missing in summary

---

## SPRINT H — Verification & polish
**Effort:** 1 day

### H1. End-to-end smoke
- `tests/e2e/lead_to_won_journey.spec.ts` — capture lead → convert → opportunity workflow → close won → voucher → invoice → handover
- `tests/e2e/admin_setup_flow.spec.ts` — log in as admin → create custom field → set as mandatory → verify enforced on lead create form
- `tests/e2e/territory_routing.spec.ts` — set country routing → public capture → assert correct user assigned

### H2. Backend final smoke
- Spin local Mongo (or compose stack)
- Hit 100 random old endpoints + verify 100 new endpoints; compare shape via JSON-Schema
- Load test top 10 endpoints for 30s @ 100 RPS

### H3. Performance pass
- Add MongoDB indexes for: `tenant_id+entity_id` on every custom field collection, `entity_type+tenant_id` on EntityView/EntityColumn, `tenant_id+received_at` on EmailMessage
- Profile slow endpoints (`/dashboards/summary`, `/leads/?include=custom_fields`)

### H4. Frontend polish
- Replace static "TBD" placeholders in standard-report stubs with real aggregation (use `report_service` aggregator)
- Add toast on Phase 4 view save with "Pin?" call-to-action
- Loading skeletons on all list pages

### Exit gate
- [ ] All e2e specs green
- [ ] No P95 latency > 800ms on top 10 endpoints
- [ ] Lighthouse perf ≥ 80 on `/dashboard`, `/settings`

---

## SPRINT I — Phase 7 deep integrations (optional, post-launch)
**Effort:** 2 days · **Dependency:** OAuth client IDs from product

### I1. Real Gmail OAuth flow
- Backend: implement actual Google OAuth handshake with `google-auth-oauthlib`
- Background sync worker via Celery beat (poll every 5 min using `last_history_id`)
- Replace stub `setupGmail` payload with real token exchange

### I2. WhatsApp Business webhook signing
- Verify Meta webhook signature in `chatbot/webhook` POST handler
- Wire approved-template list pull from Meta API
- Wire send-message to actually call WhatsApp Cloud API

### I3. Razorpay subscription real-call
- Replace stubs in `subscription.py` with `razorpay` SDK calls
- Webhook ingestion endpoint → update `TenantSubscription.status`
- Plan upgrade flow with proration

### Exit gate
- [ ] Real Gmail messages sync into UI
- [ ] WhatsApp send actually delivers
- [ ] Razorpay test-mode subscription completes end-to-end

---

## Timeline

| Sprint | Days | Cumulative |
|---|---|---|
| A — Backend gaps | 1.5 | 1.5 |
| B — Phase 4 list wiring | 2 | 3.5 |
| C — Itinerary builder | 4 | 7.5 |
| D — Custom field join | 1 | 8.5 |
| E — Search/utilities | 1 | 9.5 |
| F — Dashboard/FCM | 1 | 10.5 |
| G — Parity tests | 1 | 11.5 |
| H — Verification | 1 | 12.5 |
| I — Deep integrations (opt) | 2 | 14.5 |

**Total to 100% parity:** ~12.5 working days (~3 weeks at 1 dev). Sprint I optional, externally gated.

## Acceptance — 100% parity declared when

1. `extract_routes.py` reports `Missing: 0` (counting renames + decommissions).
2. `MIGRATION.md` shows zero `missing` rows; every row is `ported|renamed|decommissioned`.
3. `pytest tests/parity/` green.
4. `pytest tests/e2e/` green for the 3 journey specs.
5. All 17 phases have at least one frontend page or component live.
6. Sidebar nav surfaces every settings + admin route.
7. P95 latency < 800ms on top 10 endpoints under 100 RPS load.
8. Lighthouse perf ≥ 80 on dashboard + settings hub.
9. PR with title `parity-100` containing the final score report.
