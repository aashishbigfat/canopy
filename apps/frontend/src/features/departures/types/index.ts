export interface Departure {
    id: string;
    name: string;
    destination: string | null;
    departure_date: string;
    return_date: string | null;
    departure_city: string | null;
    return_city: string | null;
    total_seats: number;
    booked_seats: number;
    held_seats: number;
    available_seats: number;   // computed by backend
    price_b2b: number | null;
    price_b2c: number | null;
    has_flight: boolean;
    status: string;
    nights: number | null;
    nights_label: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface DepartureStats {
    total_departures: number;
    total_seats: number;
    available_seats: number;
}

export interface DepartureListResponse {
    departures: Departure[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface DepartureFilters {
    destination?: string;
    has_flight?: boolean | null;
    date_from?: string;
    date_to?: string;
    search?: string;
}

export interface DepartureCreatePayload {
    name: string;
    destination?: string;
    departure_date: string;
    return_date?: string;
    departure_city?: string;
    return_city?: string;
    total_seats?: number;
    price_b2b?: number;
    price_b2c?: number;
    has_flight?: boolean;
    status?: string;
    notes?: string;
}
