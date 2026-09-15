# Website enquiry → Tutterfly: data points

Every enquiry form on the Dook website (dookwebsite `InquiryController::store`) sends one lead JSON to the **old Tutterfly CRM** (`/tfc/api/capture_lead`). The same JSON, unchanged, is also sent to **this CRM** at `POST /api/v1/website-leads/capture`. This document lists every data point in that JSON and how each CRM stores it. It also records the extra values this CRM works out itself, and what is still on hold.

**Goal:** both CRMs hold the same data. The old CRM's behaviour is copied rule by rule, including its quirks. Where this CRM's own rules need a different shape (phone format, a valid email), the original typed value is kept in a custom field.

**Two deliberate exceptions**, where this CRM follows its own way instead of copying the old CRM:
- **Source:** this CRM decides it.
- **Segment (B2B/B2C):** the user decides it.

See [Decided the new CRM's way](#decided-the-new-crms-way).

| Where | File |
|---|---|
| Mapping rules (no database) | [`apps/backend/app/services/website_lead_mapper.py`](../apps/backend/app/services/website_lead_mapper.py) |
| Lookups + lead creation | [`apps/backend/app/services/website_lead_capture_service.py`](../apps/backend/app/services/website_lead_capture_service.py) |
| Endpoint | [`apps/backend/app/api/v1/website_leads.py`](../apps/backend/app/api/v1/website_leads.py) |
| Custom-field setup script | [`apps/backend/scripts/setup_website_capture_fields.py`](../apps/backend/scripts/setup_website_capture_fields.py) |
| Website sender | dookwebsite `app/Http/Controllers/Frontend/InquiryController.php` → `mirrorLeadToNewTutterfly()` |
| Old CRM logic copied | old `RestHomeController::captureLead` + `UserHelper::getDataString / getDataFound / getDataAttached / leadType` |

## How it works

1. The website saves the enquiry and sends it to the old CRM, exactly as before.
2. After the visitor has received the response, the website sends the **same JSON** to this CRM. It adds two headers: `X-Api-Key` and `X-Old-Tfc-Lead-Id`, the lead id the old CRM just returned.
3. This CRM applies the rules below and creates a normal lead through `LeadService`, so every standard check still applies.
4. It replies with `{"error": false, "message": "Lead created succesfully!", "lead_id": "..."}`, the same shape as the old CRM. The website logs it, and saves the id into `dook_enquiries.tfc_new_lead_id` once that column exists.

If this CRM is down or refuses the lead, the website only writes a log line. The old CRM, the enquiry email and the thank-you page are not affected.

**Applied to every value first:** leading/trailing spaces are trimmed and empty strings become "no value". This matches the old CRM's Laravel `TrimStrings` + `ConvertEmptyStringsToNull` middleware.

### Legend for "How it is saved"

| Method | Meaning |
|---|---|
| **Direct** | Stored as received, in a built-in field |
| **Transformed** | Changed by a rule copied from the old CRM (or noted otherwise) before storing |
| **Lookup** | Name matched against this tenant's picklist or records, case-insensitive; the matched id is stored |
| **New CRM rule** | Decided by this CRM or its users, deliberately not copied from the old CRM |
| **Custom field** | Stored in a lead custom field of that name. As in the old CRM, it is only saved if the field exists; create the fields with the setup script |
| **Kept original** | This CRM needed a different shape, so the typed value is also kept in a `*_raw` custom field |
| **Not saved** | Received but not stored, in either CRM |

---

## 1. Data points in the website's payload

### Person and contact

| Data point (JSON key) | What the website sends | Old CRM stores | This CRM stores | How it is saved | Notes |
|---|---|---|---|---|---|
| `first_name` | Always empty | Nothing; an empty first name triggers the name split | Same | Transformed | Old `title` is only set from a sent first name, so `title` stays empty in both |
| `last_name` | Full name typed in the form | Split on spaces: 1st word → first name, 2nd word → last name, **3rd+ words dropped**; one word → last name only | `first_name`, `last_name` | Transformed | Same split, so "Asha Rani Rao" → "Asha" / "Rani" in both CRMs |
| `email` | Email typed (optional on the popup) | `email` as typed | `email` | Direct / Kept original | Must be a valid email here. If not, `email` is left empty and the typed value goes to custom field `email_raw` (the old CRM keeps it as-is). The validator lower-cases the domain part |
| `mobile` | Number as typed | `mobile` as typed | `mobile` | Transformed / Kept original | This CRM's form requires `+<code> <10 digits>`. An Indian visitor's 10-digit (or `91`-prefixed) number becomes `+91 XXXXXXXXXX`; a value already in that shape is kept; anything else stays as typed. When changed, the typed value goes to `mobile_raw` |
| `phone` | Same number as `mobile` | `phone` as typed | `phone` | Transformed / Kept original | Same rule as `mobile`; original in `phone_raw` |
| `company` | Company / agency (B2B form only) | `company` | `company` | Direct | |
| `website` | Always empty | `website` | `website` | Direct | |

### Visitor location and tracking

| Data point (JSON key) | What the website sends | Old CRM stores | This CRM stores | How it is saved | Notes |
|---|---|---|---|---|---|
| `city` | Visitor city from IP lookup (ip-api.com) | `city` | `city` | Direct | Required here; the website sends "Unknown" when the lookup fails |
| `region` | Visitor region from IP lookup | `state`, with "National Capital Territory of Delhi" → "Delhi" | `state` | Transformed | Same rename. Required here |
| `country` | Visitor country from IP lookup | `country` and `country_of_origin` | `country` + custom field `country_of_origin` | Direct + Custom field | Required here |
| `ip` | Visitor IP | `ip_address` | `ip_address` | Direct | |
| `url` | Page the form was on | Not saved (the same value arrives as `custom_fields.campaign_url`) | Not saved | Not saved | See `campaign_url` |
| `campaign_name` | e.g. "Almaty Explorer-DOOK123", "Dook Country - Georgia", plus " - utm_source" | `campaign_name` | `campaign_name` | Direct | |
| `source` | Always "web" | `source`, plus a fixed `source_id` #1 for every website lead | Custom field `source` ("web") | Custom field | This CRM has no free-text source field. The old CRM's fixed source #1 is **not copied**; the lead's source is decided by this CRM (next row) |
| `source_medium` | Form name (e.g. "B2B Partnership Form", "visa") or empty | `source_medium` (empty → "Organic") and `source_medium_id` looked up by that name, falling back to #6 | `source_medium` (empty → "Organic"), `source_id`, `source_medium_id` | Direct + New CRM rule | **This CRM decides the source.** Form name matched against the Source picklist → `source_id`, and against the Source Medium picklist → `source_medium_id`; if nothing matches, source = "Organic". The old CRM's #1 / #6 are not used, so source labels can differ between the two CRMs by design |
| `form_type` | Form name | Not read (same value arrives as `source_medium`) | Not read | Not saved | |
| `ref_id` | Website enquiry reference, e.g. `DOOK-12345` | `form_id` | Custom field `form_id` | Custom field | Links a lead in either CRM back to the website enquiry |
| `dook_enquiry_id` | Website enquiry row id | Not saved | Not saved | Not saved | Same information is in `ref_id` |

### Trip

| Data point (JSON key) | What the website sends | Old CRM stores | This CRM stores | How it is saved | Notes |
|---|---|---|---|---|---|
| `travel_date` | `YYYY-MM-DD` from the forms' date pickers (today if empty); `YYYY-MM` from the B2B form's month picker | `travel_date` via PHP `date('Y-m-d', strtotime())` | `industry_data.travel_date` | Transformed | What the website sends converts identically (`2027-05` → 2027-05-01). Text PHP cannot read (seen only from spam bots) becomes 1970-01-01 in both CRMs. Required here |
| `no_of_pax` | Number of travellers | `no_of_pax` | `industry_data.no_of_pax` | Transformed | Stored as a whole number; non-numbers become empty |
| `no_of_nights` | Package nights (package pages only) | `no_of_nights` | `industry_data.no_of_nights` | Transformed | Whole number; empty when not a package page |
| `destinations_name` | Destination chosen in the form, e.g. "Almaty, Kazakhstan" | `destination` (wins over `custom_fields.destination`), plus `destination_id` from matching the comma-separated names to the destination list | `industry_data.destinations` = [text]; `industry_data.destination_ids` + `destination_names`; custom fields `destination`, `destination_id` | Direct + Lookup + Custom field | Names split on commas and matched against this tenant's Destination picklist (platform defaults + tenant's own, never another tenant's). A destination (or a match) is required here |
| `fixed_departure` | "yes" / "no" | `is_fixed` (1/0) and `lead_qhb` ("F" fixed / "O" open) | `industry_data.is_fixed` (true/false) + custom field `lead_qhb` | Transformed + Custom field | |
| `departure_id` | Always empty | `departure_id` | Custom field `departure_id` | Custom field | Leads have no built-in departure field here |
| `destination_json` | Comma list of destinations (Contact Us page only) | Not saved | Not saved | Not saved | |
| `min_country_data` | Package country/price JSON (package pages) | Not saved | Not saved | Not saved | |
| `experience` (top level) | Always empty | Not read (old reads `custom_fields.experience`) | Not read | Not saved | |

### `custom_fields` object inside the payload

| Data point (JSON key) | What the website sends | Old CRM stores | This CRM stores | How it is saved | Notes |
|---|---|---|---|---|---|
| `custom_fields.destination` | Page destination, or "General" | Used only when `destinations_name` is empty | Same | Transformed | See `destinations_name` |
| `custom_fields.segment` | Always empty | Custom field `segment` | Custom field `segment` | Custom field | Different from the lead's built-in segment (section 2) |
| `custom_fields.description` | Always empty | `description` + custom field `description` | Custom field `description` | Custom field | |
| `custom_fields.bnpl` | "Yes" / "No" (always "No" today) | Column `bnpl` = "Y"/"N" and custom field `bnpl` = "Yes"/"No" | Custom field `bnpl_flag` = "Y"/"N" and custom field `bnpl` = "Yes"/"No" | Transformed + Custom field | |
| `custom_fields.campaign_url` | Page URL | `campaign_url` + custom field `campaign_url` | Custom field `campaign_url` | Custom field | |
| `custom_fields.experience` | Always empty today | `experience` + custom field `experience` | `industry_data.experience_id` + custom field `experience` | Lookup + Custom field | Name matched against the Experience picklist. The old CRM called it "Adventures"; this CRM's picklist says "Adventure", so add an alias if that value is ever sent |
| `custom_fields.no_of_passengers` | Traveller count | Not read (uses `no_of_pax`) | Not read | Not saved | |
| `custom_fields.date_of_travel` | Travel date | Not read (uses `travel_date`) | Not read | Not saved | |

### Request data

| Data point | What it carries | Old CRM | This CRM | How it is saved | Notes |
|---|---|---|---|---|---|
| `token` (JSON) | Old CRM's tenant id | Picks the tenant | Ignored | Not saved | Tenant comes from the `WEBSITE_CAPTURE_TENANT_ID` server setting, never from the request |
| `X-Api-Key` (header) | Secret shared with the website | — | Checked against `WEBSITE_CAPTURE_API_KEY` | Not saved | Wrong key → 401. Unset on the server → endpoint disabled (503) |
| `X-Old-Tfc-Lead-Id` (header) | Lead id returned by the old CRM | — | Custom fields `old_tfc_lead_id` and `record_id` | Custom field | See section 2 |

---

## 2. Values the CRM works out (not typed by the visitor)

| Value | Old CRM | This CRM stores | How it is saved | Notes |
|---|---|---|---|---|
| Segment (B2B / B2C) | From the email: company account → B2B; contact → B2B; personal account → B2C; otherwise the `email_segment` domain table | `segment`, only when the email matches an account or contact | Lookup + New CRM rule | **The user decides otherwise.** Company account or its contact → B2B, person account → B2C (same order as the old CRM). With no match the segment is left empty for a salesperson to set in the CRM; no domain rule, and the old `email_segment` list is not used |
| Lead type (A / C / P) | Company account with account type id 3 → C, other company account → A, personal account → P | Custom field `lead_type` | Lookup + Custom field | Old id 3 = "Corporate Client" (old `AccountTypeTableSeeder` order), matched by name here |
| Lead status | Always id 2 | `lead_status_id` = "Open" | Lookup | Old id 2 = "Open" (old `LeadStatusTableSeeder` order). Falls back to the tenant's default status if "Open" is missing |
| Owner | User 1 | `owner_id` | Server setting | `WEBSITE_CAPTURE_OWNER_USER_ID` (active user in the tenant) |
| Created by | User 506 | `created_by` | Server setting | `WEBSITE_CAPTURE_CREATED_BY_USER_ID`; defaults to the owner |
| Tenant | From `token` | `tenant_id` | Server setting | `WEBSITE_CAPTURE_TENANT_ID`; must be a travel tenant |
| Financial year | Always "25-26" (hard-coded) | Custom field `fyear` = "25-26" | Custom field | Copied as-is, including the fixed year |
| Record number | 10-digit zero-padded lead id, e.g. `0000012345` | Custom field `record_id` | Transformed + Custom field | Built from `X-Old-Tfc-Lead-Id`, so it equals the old CRM's record number. This CRM's own ids differ |
| Old lead id | — | Custom field `old_tfc_lead_id` | Custom field | Cross-reference to the old CRM |
| Creation type | — | `creation_type` = "auto" | Direct | |
| Duplicates | Never checked; every enquiry becomes a lead | Duplicate check skipped | — | Keeps one lead per enquiry, as in the old CRM |

## 3. Stored back on the website

| Value | Where | How it is saved | Notes |
|---|---|---|---|
| This CRM's lead id | `dook_enquiries.tfc_new_lead_id` | Direct | Written only when the column exists; otherwise only logged. `dook_enquiries` is shared with dookadmin, so adding the column needs sign-off (SQL in section 6) |
| Old CRM's lead id | `dook_enquiries.tfc_lead_id` | Direct | Unchanged existing behaviour |
| Send result | Website log (`storage/logs`) | — | "New Tutterfly lead created" / "rejected lead" (with reason) / "send failed", each with `ref_id` |

---

## Decided the new CRM's way

On these two points the old CRM is deliberately **not** copied (decided 2026-09-15), so the two CRMs can differ.

| Value | Old CRM | This CRM | What to expect |
|---|---|---|---|
| **Source** | Every website lead gets fixed source #1; source medium #6 when the form name has no match | Source = the picklist entry matching the form name ("Visa", "B2B Partnership Form"…), otherwise "Organic"; source medium only when a Source Medium entry has that name | Source reports won't line up with the old CRM. Keep the Source picklist tidy: add an entry for each website form name you want reported separately |
| **Segment** | Worked out from the email using the hand-maintained `email_segment` domain list | Set only when the email matches an existing account or contact; otherwise left empty for a salesperson to choose | A lead with no segment shows as **B2C** in the lead list and detail page but is not stored as B2C, so dashboards don't count it until someone sets it. Converting such a lead carries the empty segment onto the account and opportunity. Opening the lead's edit form fills B2B/B2C from the email domain, and the user can change it |

---

## 4. Custom fields used

All are plain `text` fields on **Lead**. Missing fields are skipped silently, and the lead is still created. `python -m scripts.setup_website_capture_fields --apply` creates any that are missing.

| Field name | Label | Holds |
|---|---|---|
| `segment` | Segment (website) | `custom_fields.segment` (old same-named custom field) |
| `destination` | Destination | Destination text |
| `description` | Description | `custom_fields.description` |
| `destination_id` | Destination IDs | Comma-separated matched destination picklist ids |
| `campaign_url` | Campaign URL | Page URL |
| `bnpl` | BNPL | "Yes" / "No" |
| `experience` | Experience | Experience name |
| `fyear` | Financial Year | "25-26" |
| `country_of_origin` | Country of Origin | Visitor country |
| `form_id` | Website Ref ID | `DOOK-…` reference |
| `lead_qhb` | Lead QHB | "F" fixed / "O" open |
| `lead_type` | Lead Type | "A" / "C" / "P" |
| `bnpl_flag` | BNPL Flag | "Y" / "N" |
| `source` | Source (website) | "web" |
| `departure_id` | Departure ID | Departure id (empty today) |
| `record_id` | Old Record Number | Old CRM's 10-digit record number |
| `old_tfc_lead_id` | Old Tutterfly Lead ID | Old CRM's lead id |
| `phone_raw` | Phone (as typed) | Only when `phone` was reformatted |
| `mobile_raw` | Mobile (as typed) | Only when `mobile` was reformatted |
| `email_raw` | Email (as typed) | Only when the email was not valid |

## 5. When this CRM refuses a lead

This CRM requires last name, city, state, country, travel date, at least one destination and a source. The old CRM accepts leads without them. A refused lead is saved **only in the old CRM**. The website logs "New Tutterfly rejected lead" with the `ref_id` and the reason, and nothing else changes.

In practice this is rare: the website always sends location (falling back to "Unknown"), a travel date (falling back to today) and a destination (falling back to "General"). The source only fails if the "Organic" Source picklist entry is missing.

These picklist entries should exist in this CRM:

| Picklist | Entries |
|---|---|
| Source | "Organic", plus any website form names you want as their own source (e.g. "Visa") |
| Lead Status | "Open" |
| Account Type | "Corporate Client" |
| Destination | The names used in the website's forms |
| Experience | The names used on the website |

## 6. Switching it on

1. **This CRM**: set `WEBSITE_CAPTURE_API_KEY` (a long random secret), `WEBSITE_CAPTURE_TENANT_ID`, `WEBSITE_CAPTURE_OWNER_USER_ID` and optionally `WEBSITE_CAPTURE_CREATED_BY_USER_ID` (MongoDB ObjectIds). See `apps/backend/.env.example`.
2. **Custom fields**: `cd apps/backend`, then `python -m scripts.setup_website_capture_fields` (dry run), then add `--apply`.
3. **Website**: set `TUTTERFLY_NEW_CAPTURE_URL=https://<this-crm-host>/api/v1/website-leads/capture`, `TUTTERFLY_NEW_API_KEY` (same secret) and optionally `TUTTERFLY_NEW_TIMEOUT` (seconds, default 10). On the VM these go into the `APP_ENV_FILE` GitHub secret, followed by a redeploy.
4. **Optional, needs sign-off because the table is shared with dookadmin**: `ALTER TABLE dook_enquiries ADD COLUMN tfc_new_lead_id VARCHAR(64) NULL;`

Until step 3 is done the website sends nothing to this CRM.

## 7. Still on hold

| Item | Why it is on hold | What would resolve it |
|---|---|---|
| Old id → name assumptions | Account type 3 = "Corporate Client" and lead status 2 = "Open" come from the old seeders' insert order | Confirm against the old database; if different, change `OLD_CORPORATE_ACCOUNT_TYPE` / `OLD_WEBSITE_LEAD_STATUS` in the capture service |
| Non-Indian numbers without a country code | The country code cannot be guessed safely | Stored as typed; the CRM form asks for a country code when the lead is edited |
| Production settings and the `tfc_new_lead_id` column | Secrets and a shared-database change need your action | Section 6 |

Always different between the two CRMs, by design:
- record ids and picklist ids,
- the email domain being lower-cased,
- source labels,
- segment for leads whose email matches no account or contact.

## 8. Verification done

- **Unit tests** (`tests/test_website_lead_mapper.py`, `tests/test_website_lead_capture_api.py`, 14 tests):
  - name split, Delhi rename, travel-date formats, phone formatting, record number, fixed/BNPL flags, source defaults,
  - API key and request-shape checks.
- **End-to-end on a throwaway MongoDB** (50 checks through the real endpoint):
  - the stored lead, `industry_data` and every custom field for a popup enquiry,
  - B2B/C lead type via company account, A via a contact, B2C/P via a person account,
  - status "Open" chosen by name even when another status is the default,
  - experience id, source matched from the form name ("Visa"), the "Organic" fallback, and no destination from another tenant,
  - a malformed email kept in `email_raw`, a missing destination refused with nothing saved,
  - a wrong key refused (401), a misconfigured tenant refused (503).
- **Website sender** (Laravel booted, local stand-in server, in-memory SQLite):
  - nothing sent when disabled or when the JSON could not be built,
  - identical body plus headers when enabled,
  - `tfc_new_lead_id` saved only when the column exists,
  - a refusal or timeout is only logged, and nothing throws.
