import { PaginatedResponse } from "@/lib/api/types";

export interface Opportunity {
    id: string;
    name: string;
    amount?: number;
    description?: string;

    // Pipeline
    close_date?: string;
    sales_stage_id: string;
    probability?: number;
    is_locked: boolean;
    locked_by?: string;

    // Relations
    account_id?: string;
    contact_id?: string;
    opportunity_type_id?: string;

    // Source
    source_id?: string;
    source_medium_id?: string;
    source_url?: string;

    key_deal: boolean;

    // Metadata
    owner_id: string;
    owner_name?: string;
    account_name?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    segment?: string;
    creation_type?: string;
    type?: string;
    is_person_account?: boolean;
    sales_stage_name?: string;
    opportunity_type_name?: string;
    created_by_name?: string;
    last_modified_by_name?: string;
    tenant_id: string;
    created_by: string;
    view_count: number;
    created_at: string;
    updated_at: string;
    close_lost_reason?: string;

    // All industry-specific data (travel_date, no_of_pax, destinations, inclusions, etc.)
    industry_data?: Record<string, any>;
}

export interface OpportunityCreateData {
    name: string;
    sales_stage_id: string;
    amount?: number;
    description?: string;
    close_date?: string;

    // Pipeline
    probability?: number;

    // Relations
    account_id?: string;
    contact_id?: string;
    opportunity_type_id?: string;
    team_member_ids?: string[];

    // Source
    source_id?: string;
    source_medium_id?: string;
    source_url?: string;

    key_deal?: boolean;
    close_lost_reason?: string;

    // All industry-specific fields go here
    industry_data?: Record<string, any>;
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
