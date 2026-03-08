import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { User, UserInput, UserResponse } from '../types';

export const useGetUsers = (params?: { page?: number; limit?: number; search?: string }) => {
    return useQuery({
        queryKey: ['users', params],
        queryFn: async () => {
            const response = await apiClient.get<UserResponse>('/users', { params });
            return response.data;
        },
    });
};

export const useGetUser = (id: string) => {
    return useQuery({
        queryKey: ['users', id],
        queryFn: async () => {
            const response = await apiClient.get<User>(`/users/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: UserInput) => {
            const response = await apiClient.post<User>('/users', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UserInput }) => {
            const response = await apiClient.put<User>(`/users/${id}`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users', data._id] });
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};
