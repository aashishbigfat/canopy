import { apiClient } from "@/lib/api/client";
import { Contact, ContactCreateData, ContactFilters, ContactResponse } from "@/features/contacts/types";
import { AxiosRequestConfig } from "axios";

const BASE_URL = "/contacts";

export const contactsService = {
    getContacts: async (params: ContactFilters, config?: AxiosRequestConfig): Promise<ContactResponse> => {
        const response = await apiClient.get<ContactResponse>(BASE_URL, { params, ...config });
        return response.data;
    },

    getContact: async (id: string, config?: AxiosRequestConfig): Promise<Contact> => {
        const response = await apiClient.get<Contact>(`${BASE_URL}/${id}`, config);
        return response.data;
    },

    createContact: async (data: ContactCreateData): Promise<Contact> => {
        const response = await apiClient.post<Contact>(BASE_URL, data);
        return response.data;
    },

    updateContact: async (id: string, data: Partial<ContactCreateData>): Promise<Contact> => {
        const response = await apiClient.put<Contact>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteContact: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    changeOwner: async (id: string, newOwnerId: string): Promise<void> => {
        await apiClient.post(`${BASE_URL}/${id}/change-owner`, { new_owner_id: newOwnerId });
    },

    getAccountContacts: async (accountId: string): Promise<Contact[]> => {
        const response = await apiClient.get<Contact[]>(`${BASE_URL}/account/${accountId}`);
        return response.data;
    },

    getFormData: async (): Promise<any> => {
        const response = await apiClient.get(`${BASE_URL}/form-data`);
        return response.data;
    },

    getContactsByAccount: async (accountId: string, signal?: AbortSignal): Promise<Contact[]> => {
        const response = await apiClient.get<{ contacts: any[]; total: number }>(`${BASE_URL}/search`, {
            params: { account_id: accountId, per_page: 100 },
            signal,
        });
        // The search endpoint returns ContactResponse objects, map to Contact
        return response.data.contacts.map((c: any) => ({
            ...c,
            full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        }));
    }
};
