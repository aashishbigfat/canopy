import { apiClient } from "@/lib/api/client";
import { Itinerary, ItineraryDetail, ItineraryCreateData, ItineraryFilters, ItineraryResponse } from "@/features/itineraries/types";

const BASE_URL = "/itineraries";

export const itinerariesService = {
    getItineraries: async (params: ItineraryFilters): Promise<ItineraryResponse> => {
        const response = await apiClient.get<ItineraryResponse>(BASE_URL, { params });
        return response.data;
    },

    getItinerary: async (id: string): Promise<ItineraryDetail> => {
        const response = await apiClient.get<ItineraryDetail>(`${BASE_URL}/${id}`);
        return response.data;
    },

    createItinerary: async (data: ItineraryCreateData): Promise<ItineraryDetail> => {
        const response = await apiClient.post<ItineraryDetail>(BASE_URL, data);
        return response.data;
    },

    updateItinerary: async (id: string, data: Partial<ItineraryCreateData>): Promise<ItineraryDetail> => {
        const response = await apiClient.put<ItineraryDetail>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteItinerary: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    // Specific Endpoints
    generatePdf: async (id: string): Promise<Blob> => {
        const response = await apiClient.get(`${BASE_URL}/${id}/pdf`, { responseType: 'blob' });
        return response.data;
    }
};
