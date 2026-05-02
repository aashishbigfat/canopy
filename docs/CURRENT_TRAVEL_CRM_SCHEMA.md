# Complete Travel CRM Backend Schema Overvew

This document provides a comprehensive, deep dive into the active backend schema used within the Tutterfly Travel CRM. It details all major modules running in production, highlighting which fields execute core CRM logic versus strict travel-related specifications.

---

## 1. Opportunity (Deal) Schema
**File:** `app/models/opportunity.py`
**Purpose:** Represents a potential sales deal, incorporating heavy travel package details.

| Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :---: |
| `name` / `amount` | `str` / `float` | Title & monetary value of the deal | ❌ |
| `sales_stage_id` | `ObjectId` | Current status in the sales pipeline | ❌ |
| `probability` / `close_date` | `int` / `datetime` | Forecasting parameters | ❌ |
| `account_id` / `contact_id` | `ObjectId` | Relationships to core entities | ❌ |
| `travel_date` | `datetime` | Anticipated departure date | ✅ |
| `no_of_nights` | `int` | Duration of the trip | ✅ |
| `no_of_pax` | `int` | Total passengers | ✅ |
| `no_of_adults`/`childs`/`infants` | `int` | Demographic breakdown of travelers | ✅ |
| `destination_ids` / `origin_ids` | `List[ObjectId]`| Travel routing | ✅ |
| `country_of_origin` | `str` | Passenger's native country | ✅ |
| `inclusions` | `List[str]` | Elements included (e.g. "Air Ticket") | ✅ |
| `departure_id` | `ObjectId` | Specifies flight/travel departures | ✅ |

---

## 2. Lead Schema
**File:** `app/models/lead.py`
**Purpose:** Prospective customers from travel inquiries or campaigns.

| Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :---: |
| `first_name` / `email` / `phone`| `str` | Lead personal details | ❌ |
| `company` / `industry_id` | `str` / `ObjectId` | B2B Firmographics | ❌ |
| `lead_status_id` | `ObjectId` | Current pipeline stance | ❌ |
| `travel_date` | `str` | Stated date the lead intends to travel | ✅ |
| `no_of_nights` / `no_of_pax` | `int` | Stated trip duration and size | ✅ |
| `destinations` | `List[str]` | The locations inquired about | ✅ |
| `experience_id` | `ObjectId` | Type of travel (e.g., Honeymoon, Adv.) | ✅ |
| `is_converted` | `bool` | Conversion tracking status | ❌ |

---

## 3. Supplier (Vendor) Schema
**File:** `app/models/supplier.py`
**Purpose:** The backbone of travel curation (Hotels, Airlines, DMCs). Includes pivot tables to link Suppliers directly to Opportunities.

| Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :---: |
| `name` / `company_name` | `str` | Vendor title | ❌ |
| `supplier_type` | `str` | Category (Hotel, Airline, Tour Operator) | ✅ |
| `services` | `List[str]` | List of amenities or transport offered | ✅ |
| `destinations` / `service_cities`| `List[str]` | Areas the vendor commands/services | ✅ |
| `payment_terms` / `credit_limit` | `str` / `float`| B2B payment constraints | ❌ |
| `is_preferred` | `bool` | Highlights top-tier vendor relationships | ❌ |

**Pivot:** `OpportunitySupplier` connects deals natively to explicit vendors, storing individual `cost` per vendor within a travel quote.

---

## 4. Destination Schema
**File:** `app/models/destination.py`
**Purpose:** Master database of global endpoints sold by the CRM.

| Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :---: |
| `name` / `description` | `str` | Destination marketing title | ✅ |
| `country_id` | `str` | ISO-3 standard geographic routing | ✅ |
| `state_id` / `city_id` | `ObjectId` | Drilled-down micro destinations | ✅ |
| `destination_type` | `str` | Vibe classification (Beach, Mountain, City) | ✅ |
| `best_time_to_visit` | `str` | Seasonal recommendation logic | ✅ |

**Pivots:** `DestinationOpportunity` & `DestinationLead` allow many-to-many geographic tracking.

---

## 5. Itinerary & Packages Schema
**Files:** `app/models/itinerary.py`, `app/models/package.py`
**Purpose:** Day-by-day routing definitions and pre-priced commercial packages.

| Sub-Module | Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :--- | :---: |
| **Itinerary** | `start_date` / `end_date` | `datetime` | Live window | ✅ |
| **Itinerary** | `tour_starts_from` | `str` | Departure / Base camp | ✅ |
| **Itin. Day** | `activities` | `List[Dict]` | Hourly sightseeing breakdown | ✅ |
| **Itin. Day** | `hotel_name` / `hotel_type`| `str` | Nightly sleep routing | ✅ |
| **Itin. Day** | `breakfast`/`lunch`/`dinner`| `bool` | Matrix of included meal plans | ✅ |
| **Package** | `base_price` | `float` | Rack rate of the tour | ❌ |
| **Package** | `valid_from` / `valid_to` | `datetime` | Seasonality pricing controls | ✅ |
| **Package** | `min_pax` / `max_pax` | `int` | Group travel capacity caps | ✅ |

---

## 6. Quote, Invoice & Payment (Financials)
**Files:** `app/models/quote.py`, `app/models/invoice.py`
**Purpose:** Deal maturation and revenue collection.

| Sub-Module | Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :--- | :---: |
| **Quote** | `subtotal` / `tax_percent` | `float` | Proposal aggregates | ❌ |
| **Quote** | `travel_date` | `datetime` | Target travel footprint | ✅ |
| **Invoice** | `invoice_number` | `str` | Immutable financial ledger key | ❌ |
| **Invoice** | `amount_paid` / `balance_due` | `float` | Live receivable trackers | ❌ |
| **Payment** | `payment_method` | `str` | Cash, Wire, Card | ❌ |

---

## 7. Tasks & Events (Core Productivity)
**Files:** `app/models/task.py`, `app/models/event.py`
**Purpose:** The daily actionable engine for travel agents. Highly polymorphic.

| Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :---: |
| `taskable_type` / `eventable_type` | `str` | Polymorphic flag ("Lead", "Account") | ❌ |
| `taskable_id` / `eventable_id` | `ObjectId` | Corresponding parent entity | ❌ |
| `due_date` / `start_datetime` | `datetime` | Timing triggers | ❌ |
| `all_day` / `is_recurring` | `bool` | Calendar block patterns | ❌ |

---

## 8. Accounts & Contacts
**Files:** `app/models/account.py`, `app/models/contact.py`
**Purpose:** Universal CRM backbone identifying 'who' is buying or supplying.

| Module | Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :--- | :---: |
| **Account** | `name` / `website` | `str` | Identifying markers | ❌ |
| **Account** | `is_person_account` | `bool` | Differentiates B2B vs direct traveler | ❌ |
| **Contact** | `salutation` / `title` | `str` | Individual demographics | ❌ |
| **Contact** | `account_id` | `ObjectId` | Hard link to parent firm | ❌ |

---

## 9. System, Security & Auth (Infrastructure)
**Files:** `app/models/user.py`, `app/models/role.py`, `app/models/tenant.py`
**Purpose:** Core B2B SaaS multi-tenancy, authentication, and Role-Based Access Control (RBAC).

| Sub-Module | Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :--- | :---: |
| **User** | `email` / `password` | `str` | Credential hashes | ❌ |
| **User** | `role_ids` | `List[ObjectId]` | Attached RBAC capabilities | ❌ |
| **User** | `assigned_destinations` | `List[ObjectId]` | Travel lead auto-assignment matrix | ✅ |
| **Role** | `permissions` | `List[str]` | String array of access rights | ❌ |
| **Tenant** | `subdomain` | `str` | SaaS routing identifier | ❌ |
| **Tenant** | `plan` | `str` | Subscription limits (Free, Basic, Premium) | ❌ |

---

## 10. Communications, Files & Extensibility
**Files:** `app/models/file.py`, `app/models/note.py`, `app/models/email.py`, `app/models/picklists.py`
**Purpose:** Polymorphic data that attaches to any entity (Lead, Account, Quote).

| Sub-Module | Field Name | Data Type | Description & Usage | Travel Specific? |
| :--- | :--- | :--- | :--- | :---: |
| **File** | `s3_key` / `file_path` | `str` | Amazon S3 routing for attachments | ❌ |
| **File / Note** | `fileable_type` | `str` | Target entity (e.g., "Account") | ❌ |
| **Picklist** | `options` | `List[Dict]` | Configurable dropdown values per Tenant | ❌ |
| **Product** | `category` / `price` | `str` / `float` | Commercial add-ons beyond packages (Tours, Visas) | ✅ |

*(Note: Custom Fields are heavily utilized (`Dict[str, Any]`) across all top-level objects to allow dynamic injection of undocumented agency specifics).*
