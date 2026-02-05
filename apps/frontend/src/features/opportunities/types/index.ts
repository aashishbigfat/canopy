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
    tenant_id: string;
    created_by: string;
    view_count: number;
    created_at: string;
    updated_at: string;
}

export interface OpportunityCreateData {
    name: string;
    sales_stage_id: string;
    account_id?: string;
    contact_id?: string;
    amount?: number;
    destination_ids?: string[];
    team_member_ids?: string[];
    // ... other optional fields
}

export interface OpportunityFilters {
    page?: number;
    per_page?: number;
    search?: string;
    sales_stage_id?: string;
    owner_id?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export type OpportunityResponse = PaginatedResponse<Opportunity>;
