import { PaginatedResponse } from "@/lib/api/types";

export interface Opportunity {
    id: string;
    name: string;
    amount?: number; // float in python
    description?: string;

    // Logistics
    no_of_pax?: number;
    no_of_nights?: number;
    no_of_adults?: number;
    no_of_childs?: number;
    no_of_infants?: number;
    travel_date?: string; // Date string
    close_date?: string; // Date string

    // Pipeline
    sales_stage_id: string;
    probability?: number;
    is_locked: boolean;
    locked_by?: string;

    // Relations
    account_id?: string;
    contact_id?: string;
    opportunity_type_id?: string;
    experience_id?: string;

    // Source
    source_id?: string;
    source_medium_id?: string;
    source_url?: string;

    country_of_origin?: string;
    key_deal: boolean;

    // Metadata
    owner_id: string;
    owner_name?: string;
    account_name?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    destination_names?: string[];
    segment?: string;
    creation_type?: string;
    type?: string;
    is_person_account?: boolean;
    experience_name?: string;
    sales_stage_name?: string;
    created_by_name?: string;
    last_modified_by_name?: string;
    tenant_id: string;
    created_by: string;
    view_count: number;
    created_at: string;
    updated_at: string;
}

export interface OpportunityCreateData {
    name: string;
    sales_stage_id: string;
    amount?: number;
    description?: string;

    // Logistics
    no_of_pax?: number;
    no_of_nights?: number;
    no_of_adults?: number;
    no_of_childs?: number;
    no_of_infants?: number;
    travel_date?: string;
    close_date?: string;

    // Pipeline
    probability?: number;

    // Relations
    account_id?: string;
    contact_id?: string;
    opportunity_type_id?: string;
    experience_id?: string;
    destination_ids?: string[];
    origin_ids?: string[];
    team_member_ids?: string[];

    // Source
    source_id?: string;
    source_medium_id?: string;
    source_url?: string;

    key_deal?: boolean;
}

export interface OpportunityFilters {
    page?: number;
    per_page?: number;
    search?: string;
    sales_stage_id?: string;
    owner_id?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    view?: string;
}

export interface OpportunityResponse {
    opportunities: Opportunity[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}
