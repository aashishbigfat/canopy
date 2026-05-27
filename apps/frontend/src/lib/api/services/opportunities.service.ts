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
    },

    // Get History
    getHistory: async (id: string, config?: AxiosRequestConfig): Promise<OpportunityHistoryRecord[]> => {
        const response = await apiClient.get<OpportunityHistoryRecord[]>(`${BASE_URL}/${id}/history`, config);
        return response.data;
    },

    // Get Tasks
    getTasks: async (id: string, config?: AxiosRequestConfig): Promise<OpportunityTask[]> => {
        const response = await apiClient.get<OpportunityTask[]>(`${BASE_URL}/${id}/tasks`, config);
        return response.data;
    },

    // Create Task
    createTask: async (id: string, data: any): Promise<OpportunityTask> => {
        const response = await apiClient.post<OpportunityTask>(`${BASE_URL}/${id}/tasks`, data);
        return response.data;
    },

    // Change Owner
    changeOwner: async (id: string, newOwnerId: string): Promise<Opportunity> => {
        const response = await apiClient.post<Opportunity>(`${BASE_URL}/${id}/change-owner`, {
            new_owner_id: newOwnerId
        });
        return response.data;
    },

    backfillOpportunityNumbers: async (): Promise<{ assigned: number; message: string }> => {
        const response = await apiClient.post(`${BASE_URL}/backfill-opportunity-numbers`);
        return response.data;
    },

    lockOpportunity: async (id: string): Promise<Opportunity> => {
        const response = await apiClient.post<Opportunity>(`${BASE_URL}/${id}/lock`);
        return response.data;
    },

    unlockOpportunity: async (id: string): Promise<Opportunity> => {
        const response = await apiClient.post<Opportunity>(`${BASE_URL}/${id}/unlock`, null, {
            _suppressForbiddenToast: true,
        } as any);
        return response.data;
    },
};

export interface OpportunityHistoryRecord {
    id: string;
    opportunity_id: string;
    field_name: string;
    old_value?: string;
    new_value?: string;
    changed_by: string;
    changed_at: string;
    user_name?: string;
    old_stage_name?: string;
    new_stage_name?: string;
    amount_at_change?: number;
    probability_at_change?: number;
}

export interface OpportunityTask {
    id: string;
    name: string;
    description?: string;
    due_date?: string;
    status: string;
    priority: string;
    assigned_user_id?: string;
    assigned_user_name?: string;
    created_by: string;
    created_by_name?: string;
    completed_at?: string;
    created_at: string;
}

export interface SalesStage {
    id: string;
    name: string;
    color?: string;
    probability?: number;
    is_won?: boolean;
    is_lost?: boolean;
    is_default?: boolean;
    sorting?: number;
}

export interface Experience {
    id: string;
    name: string;
    description?: string;
    sorting?: number;
}
