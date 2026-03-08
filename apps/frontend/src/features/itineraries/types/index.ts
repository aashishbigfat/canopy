import { PaginatedResponse } from "@/lib/api/types";

export interface ItineraryDay {
    id: string;
    day_number: number;
    title: string;
    description?: string;

    city?: string;
    destination_id?: string;

    activities: any[]; // Defined as List[Dict] in python

    hotel_name?: string;
    hotel_type?: string;

    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;

    transport_mode?: string;
    transport_details?: string;

    itinerary_id: string;
}

export interface Itinerary {
    id: string;
    name: string;
    description?: string;

    total_days: number;
    total_nights: number;

    start_date?: string;
    end_date?: string;

    destination_ids: string[];

    is_template: boolean;
    is_active: boolean;
    notes?: string;

    owner_id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface ItineraryDetail extends Itinerary {
    days: ItineraryDay[];
}

export interface ItineraryCreateData {
    name: string;
    total_days: number;
    total_nights: number;
    days: Partial<ItineraryDay>[];
    // ... other optional
}

export interface ItineraryFilters {
    page?: number;
    per_page?: number;
    search?: string;
    is_template?: boolean;
}

export type ItineraryResponse = PaginatedResponse<Itinerary>;
