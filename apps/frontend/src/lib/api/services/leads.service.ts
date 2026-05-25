import { apiClient } from "@/lib/api/client";
import { AxiosResponse, AxiosRequestConfig } from "axios";
import {
    Lead,
    LeadCreateData,
    LeadConvertData,
    LeadFilters,
    LeadResponse,
    ConvertResponse,
    OwnerChangeResponse,
    LeadStatus,
    Source,
    ConversionSuggestions,
    LeadBDReassignPayload,
    LeadBDReassignResponse,
} from "@/features/leads/types";

const BASE_URL = "/leads";

// Standardized API response wrapper
interface ApiResponse<T> {
    data: T;
    message?: string;
    status: number;
}

export const leadsService = {
    getLeads: async (params: LeadFilters, config?: AxiosRequestConfig): Promise<LeadResponse> => {
        const response: AxiosResponse<LeadResponse> = await apiClient.get(BASE_URL, {
            ...config,
            params: { ...params, ...config?.params }
        });
        return response.data;
    },

    getLead: async (id: string, config?: AxiosRequestConfig): Promise<Lead> => {
        const response: AxiosResponse<Lead> = await apiClient.get(`${BASE_URL}/${id}`, config);
        return response.data;
    },

    createLead: async (data: LeadCreateData): Promise<Lead> => {
        const response: AxiosResponse<Lead> = await apiClient.post(BASE_URL, data);
        return response.data;
    },

    updateLead: async (id: string, data: Partial<LeadCreateData>): Promise<Lead> => {
        const response: AxiosResponse<Lead> = await apiClient.put(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteLead: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    convertLead: async (data: LeadConvertData): Promise<ConvertResponse> => {
        const response: AxiosResponse<ConvertResponse> = await apiClient.post(`${BASE_URL}/${data.lead_id}/convert`, data);
        return response.data;
    },

    getConvertData: async (id: string): Promise<ConvertResponse> => {
        const response: AxiosResponse<ConvertResponse> = await apiClient.get(`${BASE_URL}/${id}/convert`);
        return response.data;
    },

    getConversionSuggestions: async (id: string): Promise<ConversionSuggestions> => {
        const response: AxiosResponse<ConversionSuggestions> = await apiClient.get(`${BASE_URL}/${id}/conversion-suggestions`);
        return response.data;
    },

    searchLeads: async (search: string): Promise<Lead[]> => {
        const response: AxiosResponse<Lead[]> = await apiClient.get(`${BASE_URL}/search`, {
            params: { search }
        });
        return response.data;
    },

    changeOwner: async (id: string, newOwnerId: string): Promise<OwnerChangeResponse> => {
        const response: AxiosResponse<OwnerChangeResponse> = await apiClient.post(`${BASE_URL}/${id}/change-owner`, {
            new_owner_id: newOwnerId
        });
        return response.data;
    },

    getLeadStatuses: async (): Promise<LeadStatus[]> => {
        const response: AxiosResponse<LeadStatus[]> = await apiClient.get(`${BASE_URL}/statuses`);
        return response.data;
    },

    getSources: async (): Promise<Source[]> => {
        const response: AxiosResponse<Source[]> = await apiClient.get(`${BASE_URL}/sources`);
        return response.data;
    },

    bulkDelete: async (ids: string[]): Promise<{ deleted: number; total: number }> => {
        const response = await apiClient.post(`${BASE_URL}/bulk-delete`, ids);
        return response.data;
    },

    bulkChangeOwner: async (ids: string[], newOwnerId: string): Promise<{ updated: number; total: number }> => {
        const response = await apiClient.post(`${BASE_URL}/bulk-change-owner`, null, {
            params: { new_owner_id: newOwnerId },
            data: ids
        });
        return response.data;
    },

    reassignBd: async (id: string, payload: LeadBDReassignPayload): Promise<LeadBDReassignResponse> => {
        const response: AxiosResponse<LeadBDReassignResponse> = await apiClient.post(
            `${BASE_URL}/${id}/reassign-bd`,
            payload
        );
        return response.data;
    },

    resolveTerritory: async (id: string): Promise<LeadBDReassignResponse> => {
        const response: AxiosResponse<LeadBDReassignResponse> = await apiClient.post(
            `${BASE_URL}/${id}/resolve-territory`
        );
        return response.data;
    },
};
