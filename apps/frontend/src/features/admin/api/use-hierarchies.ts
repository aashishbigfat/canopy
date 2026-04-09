import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Hierarchy, HierarchyInput, HierarchyResponse } from "../types/hierarchies";

export const useGetHierarchies = (params?: { page?: number; limit?: number; search?: string }) => {
    return useQuery({
        queryKey: ["hierarchies", params],
        queryFn: async () => {
            const response = await apiClient.get<HierarchyResponse>("/hierarchies", { params });
            return response.data;
        },
    });
};

export const useGetHierarchy = (id: string) => {
    return useQuery({
        queryKey: ["hierarchies", id],
        queryFn: async () => {
            const response = await apiClient.get<Hierarchy>(`/hierarchies/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
};

export const useCreateHierarchy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: HierarchyInput) => {
            const response = await apiClient.post<Hierarchy>("/hierarchies", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["hierarchies"] });
        },
    });
};

export const useUpdateHierarchy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: HierarchyInput }) => {
            const response = await apiClient.put<Hierarchy>(`/hierarchies/${id}`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["hierarchies"] });
            queryClient.invalidateQueries({ queryKey: ["hierarchies", data._id || data.id] });
        },
    });
};

export const useDeleteHierarchy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hierarchies/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["hierarchies"] });
        },
    });
};
