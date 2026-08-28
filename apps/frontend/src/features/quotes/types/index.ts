import { PaginatedResponse } from "@/lib/api/types";

export interface QuoteItem {
    id: string;
    name: string;
    description?: string;
    product_id?: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    tax_percent: number;
    notes?: string;
    sort_order: number;

    // Calculated
    discount_amount: number;
    tax_amount: number;
    total: number;
    quote_id: string;
}

export interface Quote {
    id: string;
    quote_number: string;
    name: string;

    opportunity_id?: string;
    contact_id?: string;
    account_id?: string;
    valid_until?: string;

    currency: string;
    discount_percent: number;
    tax_percent: number;
    terms_and_conditions?: string;
    notes?: string;

    // Itinerary related
    travel_date?: string;
    return_date?: string;
    num_adults: number;
    num_children: number;
    num_infants: number;
    destinations?: string[];

    // Financials
    status: string;
    quote_date: string;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total: number;

    owner_id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface QuoteDetail extends Quote {
    items: QuoteItem[];
}

export interface QuoteCreateData {
    name: string;
    opportunity_id?: string;
    contact_id?: string;
    items: Partial<QuoteItem>[];
    // ... others
}

export interface QuoteFilters {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    expiry?: 'upcoming' | 'expired';
}

export type QuoteResponse = PaginatedResponse<Quote>;
