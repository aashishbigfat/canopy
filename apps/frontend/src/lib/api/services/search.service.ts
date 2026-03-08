import { apiClient } from "@/lib/api/client";

const BASE_URL = "/search";

export interface SearchResultItem {
    id: string;
    title: string;
    subtitle?: string;
    url: string;
}

export interface SearchResultGroup {
    module: string;
    label: string;
    items: SearchResultItem[];
}

export interface SearchResponse {
    query: string;
    results: SearchResultGroup[];
}

export const searchService = {
    search: async (query: string, limit?: number): Promise<SearchResponse> => {
        const response = await apiClient.get<SearchResponse>(BASE_URL, {
            params: { q: query, limit }
        });
        return response.data;
    },
};
