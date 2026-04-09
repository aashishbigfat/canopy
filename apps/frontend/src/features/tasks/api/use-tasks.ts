import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Task, TaskCreateData, TasksResponse } from '../types';

export const useGetTasks = (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    priority?: string;
    assigned_user_id?: string;
}) => {
    return useQuery({
        queryKey: ['tasks', params],
        queryFn: async () => {
            const response = await apiClient.get<TasksResponse>('/tasks', { params });
            return response.data;
        },
    });
};

export const useGetTask = (id: string) => {
    return useQuery({
        queryKey: ['tasks', id],
        queryFn: async () => {
            const response = await apiClient.get<Task>(`/tasks/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: TaskCreateData) => {
            const response = await apiClient.post<Task>('/tasks', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
};

export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<TaskCreateData> }) => {
            const response = await apiClient.put<Task>(`/tasks/${id}`, data);
            return response.data;
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks', id] });
        },
    });
};

export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/tasks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
};

export const useCompleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.post(`/tasks/${id}/complete`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
};

export const useCreateFollowUpTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ parentId, data }: { parentId: string; data: TaskCreateData }) => {
            const response = await apiClient.post<Task>(`/tasks/${parentId}/follow-up`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
};

export const useSearchOpportunities = (search: string) => {
    return useQuery({
        queryKey: ['tasks-opportunity-search', search],
        queryFn: async () => {
            if (!search || search.length < 1) return { opportunities: [] };
            const response = await apiClient.get<{ opportunities: { id: string; name: string }[] }>(
                '/tasks/search-opportunity',
                { params: { s: search } }
            );
            return response.data;
        },
        enabled: search.length >= 1,
        staleTime: 10_000,
    });
};

export const useSearchAccounts = (search: string, isPersonAccount?: boolean) => {
    return useQuery({
        queryKey: ['tasks-account-search', search, isPersonAccount],
        queryFn: async () => {
            if (!search || search.length < 1) return { accounts: [] };
            const params: Record<string, any> = { s: search };
            if (isPersonAccount !== undefined) params.is_person_account = isPersonAccount;
            const response = await apiClient.get<{ accounts: { id: string; name: string }[] }>(
                '/accounts/search-account',
                { params }
            );
            return response.data;
        },
        enabled: search.length >= 1,
        staleTime: 10_000,
    });
};

export const useGetContactsByAccount = (accountId: string) => {
    return useQuery({
        queryKey: ['tasks-contacts-by-account', accountId],
        queryFn: async () => {
            const response = await apiClient.get<{ contacts: { id: string; full_name: string; first_name: string; last_name: string }[] }>(
                '/contacts/search',
                { params: { account_id: accountId, per_page: 100 } }
            );
            return response.data.contacts;
        },
        enabled: !!accountId,
        staleTime: 30_000,
    });
};
