# Tutterfly CRM: Multi-Industry Architecture Strategy

## 🎯 The Goal
Tutterfly currently operates as a highly specialized **Travel CRM**. The goal is to transform the system into a **True Multi-Industry CRM** (capable of serving Real Estate, IT, Finance, etc.) *without* building an entirely new application from scratch, *without* breaking our existing travel customers, and *without* duplicating our core code.

---

## 🏗️ The Approach: "Metadata-Driven Hybrid Architecture"

We evaluated several enterprise architecture models. The absolute best choice for our current database (MongoDB) and backend (FastAPI) is the **Hybrid Approach**. It hits the "sweet spot"—giving us 90% of the flexibility of a heavily customized behemoth like Salesforce, but only taking a fraction of the engineering time.

Here is how the Hybrid Architecture fundamentally works:

### 1. The Core Stays Unified (No Code Duplication)
We will **not** create separate APIs or database collections for different industries (e.g., we will not have `/api/travel/leads` vs. `/api/it/leads`). 

A "Lead" or an "Opportunity" is 90% the same across every industry (they all have a Name, Email, Pipeline Stage, and Owner). We keep one unified Core system to prevent massive code duplication and maintenance nightmares.

### 2. Flexible "Context Schema" (The Secret Sauce)
Currently, travel-specific fields (like `no_of_pax` or `travel_date`) are hardcoded into the base Lead and Opportunity models. This breaks if the user is a Real Estate agent.

Instead, we cleanly extract all industry-specific fields into a flexible `industry_data` JSON block. 
- **Travel Lead:** The backend saves `{ name: "John", industry_data: { travel: { no_of_pax: 2 } } }`
- **IT Lead:** The backend saves `{ name: "Jane", industry_data: { it: { software_budget: 50000 } } }`

The core database schemas stay pristine, but any industry can infinitely extend those records.

### 3. Tenant-Level Feature Flags
Every customer (Tenant) gets a configuration file dictating what industry they are in and what modules they are allowed to see.
```json
modules: {
  "itineraries": true,  // On for Travel, Off for IT
  "properties": false,   // Off for Travel, On for Real Estate
  "vendors": true       // On for everyone
}
```
The React frontend reads these flags on login and instantly hides or shows buttons, sidebar links, and specific form inputs like magic.

### 4. Isolated APIs for Industry-Specific Modules
For features that are *wholly unique* to an industry (like Travel "Itineraries" or Real Estate "Listings"), we will build completely isolated API endpoints. These will sit behind a security gateway that blocks access unless the Tenant's config explicitly allows it. 

---

## 🔄 The Rollout Plan

We can execute this transition in four safe phases:

### Phase 1: Core Backend Abstraction (1-2 Weeks)
- Add the `industry` and `modules` configuration to the multi-tenancy model.
- Remove hardcoded travel fields (`no_of_pax`, `destinations`) from the core Pydantic schemas.
- Build a MongoDB script to safely migrate all existing client data into the new flexible `industry_data` block (Zero data loss).
- Rename uniquely travel-sounding concepts in our codebase to generic terms (e.g., `Supplier` becomes `Vendor`).

### Phase 2: Dynamic Frontend Forms (1 Week)
- Update the Lead, Opportunity, and Quote UI forms to read the Tenant's `industry` setting.
- If the industry is "Travel", the form injects the Travel Date and Pax fields. If not, they remain hidden.
- Sidebar menu links for 'Destinations' and 'Itineraries' are hidden for non-travel tenants.

### Phase 3: Picklists & Seed Data (3 Days)
- Our dropdown menus (like "Experience Type") are currently seeded with travel terms (e.g., "Safari").
- We will replace these with universal B2B sales concepts (e.g., "New Business", "Cross-sell") or allow them to be grouped dynamically by industry.

### Phase 4: Seamless Onboarding (1 Week)
- Update the signup flow: "What industry is your company in?"
- Based on their answer, the system automatically sets their feature flags and provisions the perfect, tailor-made CRM environment for them. Existing travel clients experience zero disruption.

---

## ✅ Summary of Benefits
1. **Speed to Market:** We can launch into new industry verticals in weeks, not months.
2. **Zero Data Loss:** Existing travel agencies are completely unaffected.
3. **High Engineering Velocity:** We maintain one codebase instead of splitting the team to maintain five different CRM versions.
4. **Future-Proof:** Want to enter the Insurance market next year? Just add `"insurance"` to the JSON schema map and toggle the flags.
