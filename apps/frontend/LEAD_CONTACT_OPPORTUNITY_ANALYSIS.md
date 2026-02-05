# Lead, Contact & Opportunity – Deep Analysis

**Tutterfly CRM · Next.js Frontend**  
This document provides a full analysis of how **Lead**, **Contact**, and **Opportunity** are defined, linked, and used across the codebase and API.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Entity Relationship Overview](#2-entity-relationship-overview)
3. [Data Models](#3-data-models)
4. [API Contracts](#4-api-contracts)
5. [Conversion Flow (Lead → Contact + Opportunity)](#5-conversion-flow-lead--contact--opportunity)
6. [Contact–Account Linking](#6-contactaccount-linking)
7. [Opportunity–Account–Contact Linking](#7-opportunityaccountcontact-linking)
8. [Downstream Entities](#8-downstream-entities)
9. [Frontend Implementation](#9-frontend-implementation)
10. [Gaps & Inconsistencies](#10-gaps--inconsistencies)
11. [Recommendations](#11-recommendations)

---

## 1. Executive Summary

| Entity | Purpose | Primary Relations |
|--------|---------|--------------------|
| **Lead** | Prospect; not yet qualified. | After convert → **Opportunity** (and optionally **Contact** + **Account**). |
| **Contact** | Person at an account. | Linked to **Account** via `account_id`; can be primary contact on **Opportunity**. |
| **Opportunity** | Sales deal. | Linked to **Account** (`account_id`) and **Contact** (`contact_id`). |
| **Account** | Company/organization. | Has many **Contacts** (by `account_id`); has many **Opportunities** (by `account_id`). |

**Linkage in one sentence:**  
A **Lead** is converted into an **Opportunity** (and optionally a **Contact** and **Account**); **Contact** is linked to **Account**; **Opportunity** references **Account** and **Contact**.

---

## 2. Entity Relationship Overview

```
                         ┌─────────────┐
                         │    LEAD     │
                         │ (prospect)  │
                         └──────┬──────┘
                                │
                    POST /leads/:id/convert
                    (contact_create?, account_name?, opportunity_name, ...)
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
       │  ACCOUNT    │   │  CONTACT    │   │  OPPORTUNITY    │
       │ (optional   │   │ (optional   │   │ (always created)│
       │  from lead) │   │  from lead) │   │                 │
       └──────┬──────┘   └──────┬──────┘   └────────┬────────┘
              │                 │                    │
              │   link-account  │                    │
              │◄────────────────┤                    │
              │                 │  contact_id ───────┤
              │  account_id ────┼────────────────────┤
              │                 │  account_id ────────┤
              └─────────────────┴────────────────────┘

   Downstream: Tasks, Events, Quotes, Invoices can reference
   account_id, contact_id, opportunity_id (and polymorphic eventable/taskable).
```

**Direction of links:**

- **Lead → Opportunity:** `Lead.opportunity_id` is set after convert (Lead points to Opportunity).
- **Contact → Account:** `Contact.account_id`; managed via `link-account` / `unlink-account`.
- **Opportunity → Account, Contact:** `Opportunity.account_id`, `Opportunity.contact_id`.

There is **no** `lead_id` on Contact or Opportunity; the only reverse link from Lead is to Opportunity.

---

## 3. Data Models

### 3.1 Lead

**Source:** `src/features/leads/types/index.ts`

| Field | Type | Relation / Notes |
|-------|------|-------------------|
| id | string | — |
| first_name, last_name, full_name | string | — |
| salutation, middle_name | string? | — |
| email, phone, mobile | string? | — |
| company, title, no_employees, website | — | Prospect info |
| street, city, state, zip, country | string? | Address |
| lead_status_id, rating_id, industry_id | string? | Lookups |
| source_id, source_medium_id | string? | Source |
| **is_converted** | boolean | Set true after convert |
| **opportunity_id** | string? | Set to new Opportunity after convert |
| **converted_at** | string? | Timestamp of conversion |
| owner_id, tenant_id, created_by | string | — |
| view_count, is_favorite, custom_fields | — | — |
| created_at, updated_at | string | — |

**Relation summary:** Lead has **no** `contact_id` or `account_id`. After conversion it only stores `opportunity_id` (and `is_converted`, `converted_at`).

---

### 3.2 Contact

**Source:** `src/features/contacts/types/index.ts`

| Field | Type | Relation / Notes |
|-------|------|-------------------|
| id | string | — |
| first_name, last_name, full_name | string | — |
| salutation, middle_name | string? | — |
| email, phone, mobile, fax | string? | — |
| title, department | string? | — |
| mailing_* / other_* | string? | Addresses |
| description, assistant, assistant_phone | string? | — |
| **account_id** | string? | **Link to Account** (set via link-account) |
| owner_id, tenant_id, created_by | string | — |
| view_count, created_at, updated_at | — | — |

**Relation summary:** Contact relates to **Account** only via `account_id`. No `lead_id` or `opportunity_id`.

---

### 3.3 Opportunity

**Source:** `src/features/opportunities/types/index.ts`

| Field | Type | Relation / Notes |
|-------|------|-------------------|
| id | string | — |
| name | string | — |
| amount, description | number?, string? | — |
| no_of_pax, no_of_nights, no_of_adults | number? | — |
| travel_date, close_date | string? | — |
| sales_stage_id, probability | string, number? | Pipeline |
| is_locked, locked_by | boolean, string? | — |
| **account_id** | string? | **Link to Account** |
| **contact_id** | string? | **Link to Contact** (primary contact) |
| opportunity_type_id, experience_id | string? | — |
| source_id, source_medium_id, source_url | string? | — |
| country_of_origin, key_deal | — | — |
| owner_id, tenant_id, created_by | string | — |
| view_count, created_at, updated_at | — | — |

**Relation summary:** Opportunity relates to **Account** and **Contact** via `account_id` and `contact_id`. No `lead_id`.

---

### 3.4 Account (for context)

**Source:** `src/features/accounts/types/index.ts`

| Field | Type | Relation / Notes |
|-------|------|-------------------|
| id | string | — |
| name, email, phone, website, description | — | — |
| billing_* / shipping_* | string? | Addresses |
| acc_type_id, acc_parent_id, industry_id, rating_id | string? | — |
| owner_id, tenant_id | string | — |
| view_count, is_favorite, created_at, updated_at | — | — |

**Relation summary:** Account has no embedded arrays of contacts/opportunities in the type; the UI expects the API to return `related_contacts`, `related_opportunities`, `related_tasks` when requested (e.g. `GET /accounts/:id?include_related=true`).

---

## 4. API Contracts

Base URL (frontend): `NEXT_PUBLIC_API_URL` = `http://localhost:8000/api/v1`.

### 4.1 Leads

| Method | Path | Purpose |
|--------|------|---------|
| GET | /leads | List (paginated), returns lead_statuses, sources, users |
| GET | /leads/:id | Single lead |
| POST | /leads | Create |
| PUT | /leads/:id | Update |
| DELETE | /leads/:id | Delete |
| **GET** | **/leads/:id/convert** | Get convert options/defaults (frontend: `leadService.getConvertData`) |
| **POST** | **/leads/:id/convert** | **Convert lead** → Opportunity (+ optional Contact, Account) |
| POST | /leads/:id/change-owner | Change owner |
| GET | /leads/statuses | Lead statuses |
| GET | /leads/sources | Sources |
| GET | /leads/search | Search |

**Convert request body (LeadConvertData):**

```json
{
  "lead_id": "string",
  "account_name": "string (optional)",
  "contact_create": "boolean (optional – create Contact from lead)",
  "opportunity_name": "string",
  "opportunity_amount": "number (optional)",
  "opportunity_close_date": "string (optional)"
}
```

Backend is expected to:

1. Create an **Opportunity** (name, amount, close_date from payload).
2. Optionally create **Account** (e.g. from `account_name` or lead company).
3. Optionally create **Contact** from lead data if `contact_create === true`.
4. Set **Lead**: `is_converted = true`, `opportunity_id = <new opportunity id>`, `converted_at = now`.

---

### 4.2 Contacts

| Method | Path | Purpose |
|--------|------|---------|
| GET | /contacts | List (paginated) |
| GET | /contacts/:id | Single contact |
| POST | /contacts | Create |
| PUT | /contacts/:id | Update |
| DELETE | /contacts/:id | Delete |
| **POST** | **/contacts/:id/link-account** | **Link contact to account** (body: `{ "account_id": "..." }`) |
| **DELETE** | **/contacts/:id/unlink-account** | **Unlink contact from account** |
| POST | /contacts/:id/change-owner | Change owner |
| GET | /contacts/search | Search |

---

### 4.3 Opportunities

| Method | Path | Purpose |
|--------|------|---------|
| GET | /opportunities | List (paginated), sales_stages, opportunity_types, users |
| GET | /opportunities/:id | Single opportunity |
| POST | /opportunities | Create (body can include account_id, contact_id) |
| PUT | /opportunities/:id | Update |
| DELETE | /opportunities/:id | Delete |
| POST | /opportunities/:id/lock | Lock |
| POST | /opportunities/:id/unlock | Unlock |
| POST | /opportunities/:id/change-owner | Change owner |
| GET | /opportunities/my-pipeline | Current user’s pipeline |
| GET | /opportunities/sales-stages | Sales stages |

---

### 4.4 Accounts (relevant to Contact/Opportunity)

| Method | Path | Purpose |
|--------|------|---------|
| GET | /accounts | List |
| GET | /accounts/:id | Single account; frontend uses **?include_related=true** for related_contacts, related_opportunities, related_tasks |
| POST | /accounts | Create |
| PUT | /accounts/:id | Update |
| DELETE | /accounts/:id | Delete |
| GET | /accounts/search | Search |
| POST | /accounts/:id/change-owner | Change owner |
| GET | /accounts/form-data | Form metadata |

---

## 5. Conversion Flow (Lead → Contact + Opportunity)

### 5.1 Intended backend behavior

1. User triggers convert from UI (e.g. “Convert Lead” on lead row or convert page).
2. Frontend sends **POST /leads/:id/convert** with `LeadConvertData`:
   - `lead_id`, `opportunity_name` (required)
   - `contact_create`, `account_name`, `opportunity_amount`, `opportunity_close_date` (optional).
3. Backend:
   - Creates **Opportunity** (name, amount, close_date; can set account_id/contact_id if it creates/links Account and Contact).
   - Optionally creates **Account** (e.g. from lead company or `account_name`).
   - Optionally creates **Contact** from lead (name, email, phone, etc.) and links to Account if present.
   - Updates **Lead**: `is_converted = true`, `opportunity_id = <new opportunity id>`, `converted_at = now`.

### 5.2 Frontend services

- **features/leads/services/leadService.ts**
  - `convertLead(convertData: LeadConvertData)` → POST `/leads/${convertData.lead_id}/convert`
  - `getConvertData(id)` → GET `/leads/${id}/convert`
- **lib/api/services/leads.service.ts**
  - `convertLead(data: LeadConvertData)` → same POST (used by hooks, e.g. `useConvertLead`).

### 5.3 Convert page and form (gap)

- **Page:** `src/app/(dashboard)/leads/[id]/convert/page.tsx`
  - Loads lead and metadata (statuses, sources).
  - Renders **LeadForm** with `initialData={lead}`, `leadId={leadId}`.
- **LeadForm** (`src/features/leads/components/LeadForm.tsx`):
  - Used for both **create** and **edit** (and currently for convert page).
  - On submit it always builds `LeadCreateData` and calls either `createLead` or **updateLead(leadId, payload)**.
  - It **does not** call `convertLead(LeadConvertData)` and does not collect `opportunity_name`, `contact_create`, `account_name`, etc.

**Conclusion:** The convert **page** describes conversion and uses LeadForm, but the form on that page only **updates the lead**; it does not perform conversion. The real conversion flow (POST /convert with LeadConvertData) exists in services/hooks but is not wired to any UI form.

---

## 6. Contact–Account Linking

- **Contact** has optional `account_id`.
- Linking: **POST /contacts/:id/link-account** with `{ "account_id": "..." }`.
- Unlinking: **DELETE /contacts/:id/unlink-account**.
- Frontend: `contactService.linkToAccount(contactId, accountId)` and `unlinkFromAccount(contactId)`.
- Account detail page: **GET /accounts/:id?include_related=true** returns `related_contacts`; **RelatedContactsTab** shows them. “Link Contact” / “Unlink” buttons exist but may not be wired to the contact service (implementation not verified in this analysis).

---

## 7. Opportunity–Account–Contact Linking

- **Opportunity** has optional `account_id` and `contact_id`.
- Create/update: **POST/PUT /opportunities** can send `account_id` and `contact_id` in the body (see `OpportunityCreateData`).
- Account detail: **GET /accounts/:id?include_related=true** returns `related_opportunities`; **RelatedOpportunitiesTab** shows them and links to “Create Opportunity” with `?account_id=...`.
- **OpportunityForm** schema includes `accountId`; create opportunity page can pre-fill `account_id` from query (e.g. from account detail). Contact picker on opportunity create/edit is not fully traced here.

---

## 8. Downstream Entities

These entities reference Account, Contact, and/or Opportunity by ID:

| Entity | account_id | contact_id | opportunity_id | Notes |
|--------|------------|------------|----------------|-------|
| **Task** | ✓ (optional) | ✓ (optional) | — | taskable_type / taskable_id for polymorphic link |
| **Event** | ✓ (optional) | ✓ (optional) | — | eventable_type: 'Account' \| 'Contact' \| 'Lead' \| 'Opportunity', eventable_id |
| **Quote** | ✓ (optional) | ✓ (optional) | ✓ (optional) | QuoteCreateData includes opportunity_id, contact_id |
| **Invoice** | ✓ (optional) | ✓ (optional) | ✓ (optional) | quote_id, opportunity_id, contact_id, account_id |

So the “chain” Lead → Contact / Opportunity (and Account) is the same chain used by Tasks, Events, Quotes, and Invoices.

---

## 9. Frontend Implementation

### 9.1 Service layers

Two layers exist:

- **Feature services:** `src/features/{leads|contacts|opportunities}/services/*.ts`  
  Used by pages and feature components; include convert, link-account, change-owner, pipeline, etc.
- **Lib API services:** `src/lib/api/services/{leads|contacts|opportunities}.service.ts`  
  Used by React Query hooks (e.g. `useConvertLead`); lead conversion and contact account-linking are in feature services; lib leads.service has `convertLead` but not all lead/contact helpers.

### 9.2 Key pages and components

| Area | Path / Component | Relation to Lead/Contact/Opportunity |
|------|-------------------|--------------------------------------|
| Leads list | app/(dashboard)/leads/page.tsx | LeadTable with “Convert Lead” → /leads/[id]/convert |
| Lead convert | app/(dashboard)/leads/[id]/convert/page.tsx | Uses LeadForm (currently update-only, not convert) |
| Lead create/edit | LeadForm | Create/update lead only |
| Contacts | app/(dashboard)/contacts/*, ContactTable, ContactForm | contact_id on Opportunity; link-account via contactService |
| Opportunities | app/(dashboard)/opportunities/*, OpportunityForm, OpportunityTable | account_id, contact_id; create from account with ?account_id= |
| Account detail | app/(dashboard)/accounts/[id]/page.tsx | Fetches account with include_related; AccountDetailView, RelatedContactsTab, RelatedOpportunitiesTab |

### 9.3 API client

- **src/lib/api/client.ts:** baseURL = `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000/api/v1`), Bearer token from session, 401 handling.

---

## 10. Gaps & Inconsistencies

1. **Convert page does not convert**
   - Convert page renders LeadForm with leadId; form submits **updateLead**, not **convertLead**.
   - No UI collects `opportunity_name`, `contact_create`, `account_name`, `opportunity_amount`, `opportunity_close_date` or calls `convertLead(LeadConvertData)`.

2. **Duplicate service layers**
   - Leads: both `features/leads/services/leadService.ts` and `lib/api/services/leads.service.ts`; convert exists in both; feature service has getConvertData, changeOwner, getLeadStatuses, getSources; lib service is slimmer.
   - Contacts: linkToAccount/unlinkFromAccount only in feature contactService; lib contacts.service has getAccountContacts only.
   - Opportunities: feature opportunityService has lock, unlock, getMyPipeline, getSalesStages; lib opportunities.service has updateStage only.
   - Risk: inconsistent usage (pages vs hooks) and duplication.

3. **Account detail URL**
   - Account detail page uses `${process.env.NEXT_PUBLIC_API_URL}/api/v1/accounts/${id}?include_related=true`. If `NEXT_PUBLIC_API_URL` is already `http://localhost:8000/api/v1`, this becomes `/api/v1/api/v1/accounts/...`. Should use either base URL without extra `/api/v1` or a single source of base path.

4. **RelatedContactsTab / RelatedOpportunitiesTab**
   - “Link Contact” and “Unlink” may not call contactService.linkToAccount / unlinkFromAccount; needs verification.

5. **OpportunityForm vs API**
   - Form uses `value`, `stage`, `closeDate`, `accountId`; backend types use `amount`, `sales_stage_id`, `close_date`, `account_id`. Mapping may live in the submit handler; ensure consistency with OpportunityCreateData and backend.

6. **No reverse link Contact/Opportunity → Lead**
   - By design only Lead stores `opportunity_id`. Contact and Opportunity do not store `lead_id`; tracing “which lead created this contact/opportunity” would require backend to store that at create time (e.g. on convert) if needed.

---

## 11. Recommendations

1. **Implement a real Convert flow in the UI**
   - Add a dedicated **ConvertLeadForm** (or convert mode in LeadForm) that:
     - Collects: opportunity_name, opportunity_amount, opportunity_close_date, contact_create (checkbox), account_name (optional).
     - On submit calls **convertLead(LeadConvertData)** and redirects to the new opportunity or lead list.
   - Use **getConvertData(leadId)** to pre-fill defaults (e.g. opportunity name from lead company, contact_create true).

2. **Unify or clarify service layers**
   - Prefer one place for each API operation: either feature services only (and have hooks call them) or lib API services only (and have pages use hooks or a single client wrapper). Document which layer is canonical for convert, link-account, etc.

3. **Fix account detail fetch URL**
   - Use `NEXT_PUBLIC_API_URL` as the full base (e.g. `http://localhost:8000/api/v1`) and do not append `/api/v1` again when fetching account by id.

4. **Wire RelatedContactsTab to contact service**
   - “Link Contact” → open flow to select contact and call linkToAccount(contactId, accountId).
   - “Unlink” → call unlinkFromAccount(contactId) and refresh account data.

5. **Backend: optional lead_id on Contact/Opportunity**
   - If you need “contact/opportunity created from lead X”, backend can set `lead_id` (or `source_lead_id`) on Contact and Opportunity when creating them during convert. Frontend types and UI can then show origin lead.

6. **Keep this document updated**
   - When adding new relation fields or endpoints (e.g. contact_id on Lead, or new convert options), update this analysis and the relationship diagram.

---

## Document Info

- **Scope:** Next.js app under `tutterfly-nextjs/`; backend contract as per `BACKEND_ARCHITECTURE.md` and `API_ROUTES_ANALYSIS.md`.
- **Last analysis:** Based on codebase state at time of writing (lead, contact, opportunity, account types; leadService, contactService, opportunityService; convert page and LeadForm; account detail and related tabs).
