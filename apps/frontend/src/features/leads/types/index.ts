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
    industry_id?: string;
    source_id?: string;
    source_medium?: string; // Changed from source_medium_id as per requirement (seems to be a string field "Facebook", "Google" etc)
    source_medium_id?: string; // Keep for backward compatibility if needed, or remove if not used. User said "sourceMedium: (optional) Facebook, Google"
    experience_id?: string;

    // Travel Details
    travel_date?: string;
    no_of_nights?: number;
    no_of_adults?: number;
    no_of_pax?: number;
    no_of_childs?: number;
    no_of_infants?: number;
    destinations?: string[]; // User said "destinations: (required)"
    is_fixed?: boolean;
    segment?: string;
    creation_type?: string;

    // Campaign
    campaign_name?: string;

    // Conversion Status
    is_converted: boolean;
    opportunity_id?: string;
    converted_at?: string;

    // Metadata
    owner_id: string;
    tenant_id: string;
    created_by: string;
    created_by_name?: string;
    last_modified_by_id?: string;
    last_modified_by_name?: string;
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
    industry_id?: string;
    source_id?: string;
    source_medium?: string;
    campaign_name?: string;
    travel_date?: string;
    no_of_nights?: number;
    no_of_adults?: number;
    no_of_pax?: number;
    no_of_childs?: number;
    no_of_infants?: number;
    destinations?: string[];
    is_fixed?: boolean;
    segment?: string;
    creation_type?: string;

    source_medium_id?: string;
    experience_id?: string;
    destination_ids?: string[];
    custom_fields?: Record<string, unknown>;
}

export interface LeadConvertData {
    lead_id: string;
    account_id?: string;
    account_name?: string;
    account_type?: string;
    person_salutation?: string;
    person_first_name?: string;
    person_last_name?: string;
    contact_id?: string;
    contact_create?: boolean;
    contact_salutation?: string;
    contact_first_name?: string;
    contact_last_name?: string;
    create_opportunity?: boolean;
    opportunity_name?: string;
    opportunity_amount?: number;
    opportunity_close_date?: string;

    // New Opportunity Fields
    travel_date?: string;
    destination_ids?: string[];
    experience_id?: string;
    no_of_adults?: number;
    no_of_childs?: number;
    no_of_infants?: number;
    no_of_pax?: number;
    sales_stage_id?: string;
    no_of_nights?: number;
    description?: string;
    opportunity_owner_id?: string;
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

export interface User {
    id: string;
    name: string;
    email: string;
    experience_id?: string;
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
    experiences: { id: string; name: string }[];
    sales_stages: { id: string; name: string }[];
}
