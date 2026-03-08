import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Task, TaskCreateData, TaskResponse, TasksResponse } from '../types';

export const useGetTasks = (params?: { page?: number; per_page?: number; status?: string; assigned_user_id?: string }) => {
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
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: TaskCreateData) => {
            const response = await apiClient.post<TaskResponse>('/tasks', data);
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
            const response = await apiClient.put<TaskResponse>(`/tasks/${id}`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            // Invalidate specific task if needed, though list update usually sufficient
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
        }
    })
}
