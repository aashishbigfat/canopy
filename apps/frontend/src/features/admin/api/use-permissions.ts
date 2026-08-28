import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
    PermissionDef,
    PermissionInput,
    PermissionUpdateInput,
} from "../types/permissions";

export const useGetPermissionCatalog = () => {
    return useQuery({
        queryKey: ["permissions", "catalog"],
        queryFn: async () => {
            const response = await apiClient.get<{
                permissions: PermissionDef[];
                total: number;
            }>("permissions/");
            return response.data.permissions;
        },
    });
};

export const useGetPermission = (id: string) => {
    return useQuery({
        queryKey: ["permissions", "catalog", id],
        queryFn: async () => {
            const response = await apiClient.get<PermissionDef>(`permissions/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
};

const invalidatePermissionQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ["permissions"] });
};

export const useCreatePermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: PermissionInput) => {
            const response = await apiClient.post<PermissionDef>("permissions/", data);
            return response.data;
        },
        onSuccess: () => {
            invalidatePermissionQueries(queryClient);
        },
    });
};

export const useUpdatePermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id: string;
            data: PermissionUpdateInput;
        }) => {
            const response = await apiClient.put<PermissionDef>(`permissions/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            invalidatePermissionQueries(queryClient);
        },
    });
};

export const useDeletePermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`permissions/${id}`);
        },
        onSuccess: () => {
            invalidatePermissionQueries(queryClient);
        },
    });
};

