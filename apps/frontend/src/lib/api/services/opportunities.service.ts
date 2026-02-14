import { apiClient } from "@/lib/api/client";
import { Opportunity, OpportunityCreateData, OpportunityFilters, OpportunityResponse } from "@/features/opportunities/types";
import { AxiosRequestConfig } from "axios";

const BASE_URL = "/opportunities";

export const opportunitiesService = {
    getOpportunities: async (params: OpportunityFilters, config?: AxiosRequestConfig): Promise<OpportunityResponse> => {
        const response = await apiClient.get<OpportunityResponse>(BASE_URL, {
            ...config,
            params: { ...params, ...config?.params }
        });
        return response.data;
    },

    getOpportunity: async (id: string, config?: AxiosRequestConfig): Promise<Opportunity> => {
        const response = await apiClient.get<Opportunity>(`${BASE_URL}/${id}`, config);
        return response.data;
    },

    createOpportunity: async (data: OpportunityCreateData): Promise<Opportunity> => {
        const response = await apiClient.post<Opportunity>(BASE_URL, data);
        return response.data;
    },

    updateOpportunity: async (id: string, data: Partial<OpportunityCreateData>): Promise<Opportunity> => {
        const response = await apiClient.put<Opportunity>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteOpportunity: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    // Stage changes
    updateStage: async (id: string, newStageId: string, reason?: string): Promise<Opportunity> => {
        const response = await apiClient.post<Opportunity>(`${BASE_URL}/${id}/change-stage`, {
            new_stage_id: newStageId,
            reason
        });
        return response.data;
    },

    // Get sales stages for kanban
    getSalesStages: async (config?: AxiosRequestConfig): Promise<SalesStage[]> => {
        const response = await apiClient.get<SalesStage[]>(`${BASE_URL}/sales-stages`, config);
        return response.data;
    },

    // Get travel experiences
    getExperiences: async (config?: AxiosRequestConfig): Promise<Experience[]> => {
        const response = await apiClient.get<Experience[]>(`${BASE_URL}/experiences`, config);
        return response.data;
    }
};

export interface SalesStage {
    id: string;
    name: string;
    color?: string;
    probability?: number;
    is_won?: boolean;
    is_lost?: boolean;
    sorting?: number;
}

export interface Experience {
    id: string;
    name: string;
    description?: string;
    sorting?: number;
}
