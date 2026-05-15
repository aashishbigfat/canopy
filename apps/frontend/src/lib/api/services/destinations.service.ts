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
        // Fetch from picklists instead of legacy destinations endpoint
        const response = await apiClient.get<any[]>(
            "/picklists/destination",
            { params: { active_only: false }, signal }
        );
        
        let data = response.data;
        
        // Apply frontend search filtering
        if (params?.search) {
            const query = params.search.toLowerCase();
            data = data.filter((d: any) => d.name.toLowerCase().includes(query));
        }
        
        // Apply limit
        if (params?.limit) {
            data = data.slice(0, params.limit);
        }
        
        return {
            destinations: data.map(d => ({
                id: d.id,
                name: d.name,
                is_active: d.is_active,
                is_popular: false
            })),
            total: data.length
        };
    }
};
