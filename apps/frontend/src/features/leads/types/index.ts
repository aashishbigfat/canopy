import { PaginatedResponse } from "@/lib/api/types";

export interface Lead {
    id: string;
    salutation?: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    full_name: string;

    email?: string;
    phone?: string;
    mobile?: string;

    company?: string;
    title?: string;
    no_employees?: number;
    website?: string;

    // Address
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;

    // Dropdowns / FKs
    lead_status_id?: string;
    rating_id?: string;
    industry_id?: string;
    source_id?: string;
    source_medium_id?: string;

    // Conversion Status
    is_converted: boolean;
    opportunity_id?: string;
    converted_at?: string;

    // Metadata
    owner_id: string;
    tenant_id: string;
    created_by: string;
    last_modified_by_id?: string;
    view_count: number;
    is_favorite: boolean;
    destination_ids?: string[];
    custom_fields?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface LeadCreateData {
    first_name: string;
    last_name: string;
    salutation?: string;
    middle_name?: string;
    full_name?: string; // Optional as backend generates it
    email?: string;
    phone?: string;
    mobile?: string;
    company?: string;
    title?: string;
    no_employees?: number;
    website?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    lead_status_id?: string;
    rating_id?: string;
    industry_id?: string;
    source_id?: string;
    source_medium_id?: string;
    destination_ids?: string[];
    custom_fields?: Record<string, unknown>;
}

export interface LeadConvertData {
    lead_id: string;
    account_id?: string;
    account_name?: string;
    contact_id?: string;
    contact_create?: boolean;
    create_opportunity?: boolean;
    opportunity_name?: string;
    opportunity_amount?: number;
    opportunity_close_date?: string;
}

export interface ConversionSuggestion {
    id: string;
    name: string;
    email?: string;
    match_type: string;
}

export interface ConversionSuggestions {
    accounts: ConversionSuggestion[];
    contacts: ConversionSuggestion[];
}


export interface LeadStatus {
    id: string;
    name: string;
    color: string;
}

export interface Source {
    id: string;
    name: string;
}

export interface Industry {
    id: string;
    name: string;
}

export interface Rating {
    id: string;
    name: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface ConvertResponse {
    account?: {
        id: string;
        name: string;
    };
    contact?: {
        id: string;
        name: string;
    };
    opportunity?: {
        id: string;
        name: string;
        amount?: number;
    };
}

export interface OwnerChangeResponse {
    id: string;
    new_owner_id: string;
    previous_owner_id: string;
}

export interface LeadFilters {
    page?: number;
    per_page?: number;
    search?: string;
    lead_status_id?: string;
    source_id?: string;
    owner_id?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    // Predefined backend view: today, yesterday, last_week, recent, whatsapp, all, etc.
    view?: string;
}

export interface LeadResponse {
    leads: Lead[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    lead_statuses: LeadStatus[];
    sources: Source[];
    users: User[];
    industries: Industry[];
    ratings: Rating[];
}
