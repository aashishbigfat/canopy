import { apiClient } from "@/lib/api/client";
import { Contact, ContactCreateData, ContactFilters, ContactResponse } from "../types";

const BASE_URL = "/contacts";

export const contactService = {
    getContacts: async (params?: ContactFilters, config?: any): Promise<ContactResponse> => {
        const response = await apiClient.get<ContactResponse>(BASE_URL, { params, ...config });
        return response.data;
    },

    getContact: async (id: string) => {
        const { data } = await apiClient.get<Contact>(`${BASE_URL}/${id}`);
        return data;
    },

    createContact: async (contactData: ContactCreateData) => {
        const { data } = await apiClient.post<Contact>(BASE_URL, contactData);
        return data;
    },

    updateContact: async (id: string, contactData: Partial<ContactCreateData>) => {
        const { data } = await apiClient.put<Contact>(`${BASE_URL}/${id}`, contactData);
        return data;
    },

    deleteContact: async (id: string) => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    searchContacts: async (search: string) => {
        const { data } = await apiClient.get<Contact[]>(`${BASE_URL}/search`, { 
            params: { search } 
        });
        return data;
    },

    linkToAccount: async (contactId: string, accountId: string) => {
        const { data } = await apiClient.post(`${BASE_URL}/${contactId}/link-account`, {
            account_id: accountId
        });
        return data;
    },

    unlinkFromAccount: async (contactId: string) => {
        const { data } = await apiClient.delete(`${BASE_URL}/${contactId}/unlink-account`);
        return data;
    },

    changeOwner: async (id: string, newOwnerId: string) => {
        const { data } = await apiClient.post(`${BASE_URL}/${id}/change-owner`, {
            new_owner_id: newOwnerId
        });
        return data;
    },
};
