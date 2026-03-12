import { apiClient } from "@/lib/api/client";

export interface Destination {
    id: string;
    name: string;
    country_id?: string;
    country_name?: string;
    is_active: boolean;
    is_popular: boolean;
    image_url?: string;
}

export interface DestinationListResponse {
    destinations: Destination[];
    total: number;
}

export const destinationsService = {
    getDestinations: async (params?: { search?: string; limit?: number }, signal?: AbortSignal) => {
        const response = await apiClient.get<DestinationListResponse>(
            "/destinations",
            { params, signal }
        );
        return response.data;
    }
};
