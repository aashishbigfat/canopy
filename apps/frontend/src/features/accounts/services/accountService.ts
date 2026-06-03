import { apiClient } from "@/lib/api/client";
import { Account, AccountCreateData, AccountFilters, AccountResponse } from "../types";
import { AxiosRequestConfig } from "axios";

const BASE_URL = "/accounts";

export const accountService = {
    getAccounts: async (params?: AccountFilters, config?: AxiosRequestConfig): Promise<AccountResponse> => {
        const response = await apiClient.get<AccountResponse>(BASE_URL, { params, ...config });
        return response.data;
    },

    getAccount: async (id: string, config?: AxiosRequestConfig) => {
        const { data } = await apiClient.get<Account>(`${BASE_URL}/${id}`, config);
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

    // Inline edit of a single field from the listing (phone, acc_type_id, ...)
    updateSingleColumn: async (accountId: string, fieldName: string, fieldValue: string) => {
        const { data } = await apiClient.post(`${BASE_URL}/single-column`, null, {
            params: { account_id: accountId, field_name: fieldName, field_value: fieldValue },
        });
        return data;
    },

    mergeAccounts: async (primaryId: string, duplicateId: string) => {
        const { data } = await apiClient.post(`${BASE_URL}/merge`, {
            primary_id: primaryId,
            duplicate_id: duplicateId,
        });
        return data;
    },

    // Save the current account-list filters as a named list view.
    // `isPersonAccount` scopes the view to the B2C person list vs the B2B company list.
    createView: async (name: string, filters: Record<string, any>, isPersonAccount = false, publicView = false) => {
        const { data } = await apiClient.post(`${BASE_URL}/views`, {
            name,
            filters,
            public_view: publicView,
            is_person_account: isPersonAccount,
        });
        return data as { id: string; name: string; public_view: boolean; created_at: string };
    },

    deleteView: async (viewId: string) => {
        await apiClient.delete(`${BASE_URL}/views/${viewId}`);
    },
};
