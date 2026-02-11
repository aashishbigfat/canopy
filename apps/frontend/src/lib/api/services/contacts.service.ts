import { apiClient } from "@/lib/api/client";
import { Contact, ContactCreateData, ContactFilters, ContactResponse } from "@/features/contacts/types";

const BASE_URL = "/contacts";

export const contactsService = {
    getContacts: async (params: ContactFilters, config?: any): Promise<ContactResponse> => {
        const response = await apiClient.get<ContactResponse>(BASE_URL, { params, ...config });
        return response.data;
    },

    getContact: async (id: string): Promise<Contact> => {
        const response = await apiClient.get<Contact>(`${BASE_URL}/${id}`);
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

    // Linked endpoints
    getAccountContacts: async (accountId: string): Promise<Contact[]> => {
        const response = await apiClient.get<Contact[]>(`${BASE_URL}/account/${accountId}`);
        return response.data;
    }
};
