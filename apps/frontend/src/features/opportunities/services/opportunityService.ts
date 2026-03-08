import { apiClient } from "@/lib/api/client";
import { Opportunity, OpportunityCreateData, OpportunityFilters, OpportunityResponse } from "../types";

const BASE_URL = "/opportunities";

export const opportunityService = {
    getOpportunities: async (params?: OpportunityFilters, config?: any) => {
        const { data } = await apiClient.get<any>(BASE_URL, { params, ...config });
        return data; // Return data directly - backend provides correct format
    },

    getOpportunity: async (id: string, config?: any) => {
        const { data } = await apiClient.get<Opportunity>(`${BASE_URL}/${id}`, config);
        return data;
    },

    createOpportunity: async (opportunityData: OpportunityCreateData) => {
        const { data } = await apiClient.post<Opportunity>(BASE_URL, opportunityData);
        return data;
    },

    updateOpportunity: async (id: string, opportunityData: Partial<OpportunityCreateData>) => {
        const { data } = await apiClient.put<Opportunity>(`${BASE_URL}/${id}`, opportunityData);
        return data;
    },

    deleteOpportunity: async (id: string) => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    lockOpportunity: async (id: string) => {
        const { data } = await apiClient.post(`${BASE_URL}/${id}/lock`);
        return data;
    },

    unlockOpportunity: async (id: string) => {
        const { data } = await apiClient.post(`${BASE_URL}/${id}/unlock`);
        return data;
    },

    changeOwner: async (id: string, newOwnerId: string) => {
        const { data } = await apiClient.post(`${BASE_URL}/${id}/change-owner`, {
            new_owner_id: newOwnerId
        });
        return data;
    },

    getMyPipeline: async () => {
        const { data } = await apiClient.get(`${BASE_URL}/my-pipeline`);
        return data;
    },

    getSalesStages: async () => {
        const { data } = await apiClient.get(`${BASE_URL}/sales-stages`);
        return data;
    },
};
