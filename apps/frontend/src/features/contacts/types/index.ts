import { PaginatedResponse } from "@/lib/api/types";

export interface Contact {
    id: string;
    salutation?: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    full_name: string; // Calculated field from backend

    email?: string;
    phone?: string;
    mobile?: string;
    fax?: string;

    title?: string;
    department?: string;

    // Addresses
    mailing_street?: string;
    mailing_city?: string;
    mailing_state?: string;
    mailing_zip?: string;
    mailing_country?: string;

    other_street?: string;
    other_city?: string;
    other_state?: string;
    other_zip?: string;
    other_country?: string;

    description?: string;
    assistant?: string;
    assistant_phone?: string;

    // Relations
    account_id?: string;
    account_name?: string;
    owner_id: string;
    owner_name?: string;
    tenant_id: string;
    created_by: string;
    created_by_name?: string;
    last_modified_by_name?: string;

    // Metadata
    view_count: number;
    created_at: string;
    updated_at: string;
}

export interface ContactCreateData {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    mobile?: string;
    title?: string;
    account_id?: string;
    // ... other optional fields
}

export interface ContactFilters {
    page?: number;
    per_page?: number;
    search?: string;
    account_id?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export interface ContactResponse {
    contacts: Contact[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    users?: any[];
}
