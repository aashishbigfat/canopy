import { PaginatedResponse } from "@/lib/api/types";

export interface Account {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    mobile?: string;
    other_phones?: string[];  // extra numbers besides phone / mobile
    website?: string;
    description?: string;
    is_person_account: boolean;
    segment?: string;  // B2C, B2B, CORPORATE
    salutation?: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string | null;  // person accounts only
    // Display ID carried over from the legacy CRM; read-only.
    account_number?: number | null;

    // Addresses
    billing_street?: string;
    billing_city?: string;
    billing_state?: string;
    billing_zip?: string;
    billing_country?: string;

    shipping_street?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_zip?: string;
    shipping_country?: string;

    // Foreign Keys / Relations
    acc_type_id?: string;
    acc_parent_id?: string;
    industry_id?: string;
    category_id?: string;
    account_source_id?: string;
    owner_id: string;

    // Virtual/Joined Fields
    account_type_name?: string;
    industry_name?: string;
    category_name?: string;
    parent_account_name?: string;
    owner_name?: string;
    created_by_name?: string;
    last_modified_by_name?: string;

    // Metadata
    view_count: number;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
    tenant_id: string;
}

export interface AccountCreateData {
    name: string;
    email?: string;
    phone?: string;
    mobile?: string;
    other_phones?: string[];
    website?: string;
    description?: string;
    salutation?: string;
    first_name?: string;
    last_name?: string;

    // Addresses
    billing_street?: string;
    billing_city?: string;
    billing_state?: string;
    billing_zip?: string;
    billing_country?: string;

    shipping_street?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_zip?: string;
    shipping_country?: string;

    // Classification
    acc_type_id?: string;
    industry_id?: string;
    category_id?: string;
    account_source_id?: string;
    is_person_account?: boolean;
    owner_id?: string;
    date_of_birth?: string | null;
    // additional_field_id -> value (company accounts)
    custom_fields?: Record<string, string>;
}

export interface AccountFilters {
    page?: number;
    per_page?: number;
    search?: string;
    owner_id?: string;
    view_id?: string;
    billing_city?: string;
    industry_id?: string;
    acc_type_id?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    is_person_account?: boolean;
    // Keyset "load more": pass the previous response's next_cursor to fetch the
    // next page in O(1) (skips the COUNT). Mutually exclusive with `page`.
    cursor?: string;
}

export interface AccountResponse {
    accounts: Account[];
    pagination: {
        current_page: number;
        total: number | null;
        per_page: number;
        pages: number | null;
    };
    // Keyset pagination: opaque cursor for the next page (null = no more rows).
    next_cursor?: string | null;
    has_more?: boolean;
    account_views?: any[];
    display_columns?: any[];
    users?: any[];
    industries?: any[];
}
