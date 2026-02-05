import { apiClient } from "@/lib/api/client";
import { Account, AccountCreateData, AccountFilters, AccountResponse } from "../types";

const BASE_URL = "/accounts";

export const accountService = {
    getAccounts: async (params?: AccountFilters, config?: any): Promise<AccountResponse> => {
        const response = await apiClient.get<AccountResponse>(BASE_URL, { params, ...config });
        return response.data;
    },

    getAccount: async (id: string) => {
        const { data } = await apiClient.get<Account>(`${BASE_URL}/${id}`);
        return data;
    },

    createAccount: async (accountData: AccountCreateData) => {
        const { data } = await apiClient.post<Account>(BASE_URL, accountData);
        return data;
    },

    updateAccount: async (id: string, accountData: Partial<AccountCreateData>) => {
        const { data } = await apiClient.put<Account>(`${BASE_URL}/${id}`, accountData);
        return data;
    },

    deleteAccount: async (id: string) => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    searchAccounts: async (search: string) => {
        const { data } = await apiClient.get<Account[]>(`${BASE_URL}/search`, { 
            params: { search } 
        });
        return data;
    },

    changeOwner: async (id: string, newOwnerId: string) => {
        const { data } = await apiClient.post(`${BASE_URL}/${id}/change-owner`, {
            new_owner_id: newOwnerId
        });
        return data;
    },

    getFormData: async () => {
        const { data } = await apiClient.get(`${BASE_URL}/form-data`);
        return data;
    },
};
