import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsService } from "@/lib/api/services/accounts.service";
import { AccountFilters, AccountCreateData } from "../types";

export const useAccounts = (filters: AccountFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["accounts", filters],
        queryFn: () => accountsService.getAccounts(filters),
        staleTime: 0, // 5 minutes
    });
};

export const useAccount = (id: string) => {
    return useQuery({
        queryKey: ["accounts", id],
        queryFn: () => accountsService.getAccount(id),
        enabled: !!id,
    });
};

export const useCreateAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: AccountCreateData) => accountsService.createAccount(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
        },
    });
};

export const useUpdateAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<AccountCreateData> }) =>
            accountsService.updateAccount(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            queryClient.invalidateQueries({ queryKey: ["accounts", data.id] });
        },
    });
};
