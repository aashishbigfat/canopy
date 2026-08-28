export interface ItineraryDay {
    id?: string;
    day_number: number;
    title: string;
    description?: string;
    city?: string;
    destination_id?: string;
    activities: any[];
    hotel_name?: string;
    hotel_type?: string;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    transport_mode?: string;
    transport_details?: string;
}

export interface Itinerary {
    id: string;
    name: string;
    description?: string;
    total_days: number;
    total_nights: number;
    start_date?: string;
    end_date?: string;
    
    tour_starts_from?: string;
    tour_ends_same: boolean;
    inclusions: string[];
    feature_image?: string;
    overview?: string;

    destination_ids: string[];
    is_template: boolean;
    notes?: string;
    tenant_id: string;
    owner_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    days?: ItineraryDay[];
}

export interface CreateItineraryPayload {
    name: string;
    description?: string;
    total_days: number;
    total_nights: number;
    start_date?: string;
    end_date?: string;
    
    tour_starts_from?: string;
    tour_ends_same: boolean;
    inclusions: string[];
    feature_image?: string;
    overview?: string;

    destination_ids: string[];
    is_template: boolean;
    notes?: string;
    days: Partial<ItineraryDay>[];
}
