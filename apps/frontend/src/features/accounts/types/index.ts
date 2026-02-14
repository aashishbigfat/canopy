import { PaginatedResponse } from "@/lib/api/types";

export interface Account {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    description?: string;

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
    website?: string;
    description?: string;
    billing_street?: string;
    billing_city?: string;
    billing_state?: string;
    billing_zip?: string;
    billing_country?: string;
    acc_type_id?: string;
    industry_id?: string;
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
