import { apiClient } from "@/lib/api/client";
import { Quote, QuoteDetail, QuoteCreateData, QuoteFilters, QuoteResponse } from "@/features/quotes/types";

const BASE_URL = "/quotes";

export const quotesService = {
    getQuotes: async (params: QuoteFilters): Promise<QuoteResponse> => {
        const response = await apiClient.get<QuoteResponse>(BASE_URL, { params });
        return response.data;
    },

    getQuote: async (id: string): Promise<QuoteDetail> => {
        const response = await apiClient.get<QuoteDetail>(`${BASE_URL}/${id}`);
        return response.data;
    },

    createQuote: async (data: QuoteCreateData): Promise<QuoteDetail> => {
        const response = await apiClient.post<QuoteDetail>(BASE_URL, data);
        return response.data;
    },

    updateQuote: async (id: string, data: Partial<QuoteCreateData>): Promise<QuoteDetail> => {
        const response = await apiClient.put<QuoteDetail>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteQuote: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    generatePdf: async (id: string): Promise<Blob> => {
        const response = await apiClient.get(`${BASE_URL}/${id}/pdf`, { responseType: 'blob' });
        return response.data;
    }
};
