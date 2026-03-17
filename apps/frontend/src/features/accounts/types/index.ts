import { PaginatedResponse } from "@/lib/api/types";

export interface Account {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    description?: string;
    is_person_account: boolean;
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

    // Foreign Keys / Relations
    acc_type_id?: string;
    acc_parent_id?: string;
    industry_id?: string;
    rating_id?: string;
    account_source_id?: string;
    owner_id: string;

    // Virtual/Joined Fields
    account_type_name?: string;
    industry_name?: string;
    parent_account_name?: string;
    rating_name?: string;
    owner_name?: string;

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
    rating_id?: string;
    account_source_id?: string;
    is_person_account?: boolean;
    owner_id?: string;
}

export interface AccountFilters {
    page?: number;
    per_page?: number;
    search?: string;
    industry_id?: string;
    acc_type_id?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    is_person_account?: boolean;
}

export interface AccountResponse {
    accounts: Account[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    account_views?: any[];
    display_columns?: any[];
    users?: any[];
    industries?: any[];
    ratings?: any[];
}
