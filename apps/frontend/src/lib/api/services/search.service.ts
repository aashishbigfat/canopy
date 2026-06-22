import { apiClient } from "@/lib/api/client";

const BASE_URL = "/search";

export interface SearchResultItem {
    id: string;
    title: string;
    subtitle?: string;
    url: string;
}

export interface SearchResultGroup {
    module: string;
    label: string;
    items: SearchResultItem[];
}

export interface SearchResponse {
    query: string;
    results: SearchResultGroup[];
}

// ---------------------------------------------------------------------------
// Module-specific result types
// ---------------------------------------------------------------------------

export interface AccountSearchItem {
    id: string;
    account_name: string;
    phone: string;
    billing_street: string;
    billing_city: string;
    owner: string;
    account_id: string;
    url: string;
    updated_at: string | null;
}

export interface ContactSearchItem {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    mobile: string;
    owner: string;
    contact_id: string;
    url: string;
    updated_at: string | null;
}

export interface FileSearchItem {
    id: string;
    title: string;
    owner: string;
    last_modified_date: string | null;
    url: string;
    updated_at: string | null;
}

export interface LeadSearchItem {
    id: string;
    lead_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    city_of_origin: string;
    source: string;
    create_date: string | null;
    is_converted: boolean;
    url: string;
    updated_at: string | null;
}

export interface OpportunitySearchItem {
    id: string;
    opportunity_name: string;
    experience: string;
    account_name: string;
    sales_stage: string;
    travel_date: string | null;
    close_date: string | null;
    owner: string;
    create_date: string | null;
    industry_data: Record<string, any>;
    url: string;
    updated_at: string | null;
}

export interface PersonAccountSearchItem {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    mobile: string;
    owner: string;
    p_account_id: string;
    url: string;
    updated_at: string | null;
}

export interface SupplierSearchItem {
    id: string;
    supplier_name: string;
    supplier_type: string;
    phone: string;
    email: string;
    supplier_id: string;
    url: string;
    updated_at: string | null;
}

export type AnySearchItem =
    | AccountSearchItem
    | ContactSearchItem
    | FileSearchItem
    | LeadSearchItem
    | OpportunitySearchItem
    | PersonAccountSearchItem
    | SupplierSearchItem;

export interface ModuleSearchResponse<T = AnySearchItem> {
    module: string;
    label: string;
    query: string;
    items: T[];
    skip: number;
    limit: number;
}

import type { IndustryType, IndustryLabelMap } from "@/lib/industry-labels";

export const SEARCH_MODULES = [
    { value: "accounts", label: "Accounts" },
    { value: "contacts", label: "Contacts" },
    { value: "files", label: "Files" },
    { value: "leads", label: "Leads" },
    { value: "opportunities", label: "Opportunities" },
    { value: "person_accounts", label: "Person Accounts" },
    { value: "suppliers", label: "Suppliers" },
] as const;

/**
 * Returns search modules with labels adapted to the tenant's industry.
 * e.g. Healthcare shows "Providers" instead of "Suppliers".
 */
export function getSearchModulesForIndustry(labels: IndustryLabelMap) {
    return [
        { value: "accounts", label: labels.accounts },
        { value: "contacts", label: "Contacts" },
        { value: "files", label: "Files" },
        { value: "leads", label: labels.leads },
        { value: "opportunities", label: labels.opportunities },
        { value: "person_accounts", label: "Person Accounts" },
        { value: "suppliers", label: labels.suppliers },
    ];
}

export type SearchModuleValue = typeof SEARCH_MODULES[number]["value"];

export const searchService = {
    // Legacy — used by CommandPalette (Ctrl+K)
    search: async (query: string, limit?: number): Promise<SearchResponse> => {
        const response = await apiClient.get<SearchResponse>(BASE_URL, {
            params: { q: query, limit }
        });
        return response.data;
    },

    // New — used by GlobalSearchBar results page
    searchByModule: async (
        module: SearchModuleValue,
        query: string,
        skip = 0,
        limit = 50
    ): Promise<ModuleSearchResponse> => {
        const response = await apiClient.get<ModuleSearchResponse>(`${BASE_URL}/by-module`, {
            params: { module, q: query, skip, limit }
        });
        return response.data;
    },
};
