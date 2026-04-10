import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Role, RoleInput, RoleResponse, PermissionListResponse, getRoleId } from '../types/roles';

// Queries
export const useGetRoles = (params?: { skip?: number; limit?: number }) => {
    return useQuery({
        queryKey: ['roles', params],
        queryFn: async () => {
            const response = await apiClient.get<{ roles: Role[]; total: number }>('/roles', { params });
            return response.data.roles;
        },
    });
};

export const useGetRole = (id: string) => {
    return useQuery({
        queryKey: ['roles', id],
        queryFn: async () => {
            const response = await apiClient.get<Role>(`/roles/${id}`);
            return response.data;
        },
        enabled: !!id && id !== 'undefined',
    });
};

export const useGetAllPermissions = () => {
    return useQuery({
        queryKey: ['permissions'],
        queryFn: async () => {
            const response = await apiClient.get<PermissionListResponse>('/roles/permissions/all');
            return response.data.permissions;
        }
    })
}

// Mutations
export const useCreateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: RoleInput) => {
            const response = await apiClient.post<Role>('/roles', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
};

export const useUpdateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: RoleInput }) => {
            const response = await apiClient.put<Role>(`/roles/${id}`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['roles', getRoleId(data)] });
        },
    });
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/roles/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
};
