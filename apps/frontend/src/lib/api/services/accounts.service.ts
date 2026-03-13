import { apiClient } from "@/lib/api/client";
import { Account, AccountCreateData, AccountFilters, AccountResponse } from "@/features/accounts/types";
import { AxiosRequestConfig } from "axios";

const BASE_URL = "/accounts";

export const accountsService = {
    getAccounts: async (params: AccountFilters, config?: AxiosRequestConfig): Promise<AccountResponse> => {
        const response = await apiClient.get<AccountResponse>(BASE_URL, { params, ...config });
        return response.data;
    },

    getAccount: async (id: string, config?: AxiosRequestConfig): Promise<Account> => {
        const response = await apiClient.get<Account>(`${BASE_URL}/${id}`, config);
        return response.data;
    },

    createAccount: async (data: AccountCreateData): Promise<Account> => {
        const response = await apiClient.post<Account>(BASE_URL, data);
        return response.data;
    },

    updateAccount: async (id: string, data: Partial<AccountCreateData>): Promise<Account> => {
        const response = await apiClient.put<Account>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteAccount: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    // Derived endpoints based on Python backend features
    searchAccounts: async (query: string): Promise<Account[]> => {
        const response = await apiClient.get<Account[]>(`${BASE_URL}/search`, {
            params: { query }
        });
        return response.data;
    },

    searchAccountAutocomplete: async (query: string, signal?: AbortSignal): Promise<{ id: string; name: string; is_person_account: boolean }[]> => {
        const response = await apiClient.get<{ error: boolean; accounts: { id: string; name: string; is_person_account: boolean }[] }>(`${BASE_URL}/search-account`, {
            params: { s: query },
            signal,
        });
        return response.data.accounts;
    }
};
