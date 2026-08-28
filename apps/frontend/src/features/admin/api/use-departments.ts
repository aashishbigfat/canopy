import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Department, DepartmentDetail, DepartmentInput, DepartmentListResponse } from "../types/departments";

export const useGetDepartments = (params?: { skip?: number; limit?: number }) => {
    return useQuery({
        queryKey: ["departments", params],
        queryFn: async () => {
            const response = await apiClient.get<DepartmentListResponse>("/departments", { params });
            return response.data;
        },
    });
};

export const useGetDepartment = (id: string) => {
    return useQuery({
        queryKey: ["departments", id],
        queryFn: async () => {
            const response = await apiClient.get<DepartmentDetail>(`/departments/${id}`);
            return response.data;
        },
        enabled: !!id && id !== "undefined",
    });
};

export const useGetDepartmentUsers = (id: string) => {
    return useQuery({
        queryKey: ["departments", id, "users"],
        queryFn: async () => {
            const response = await apiClient.get<{ users: any[]; total: number }>(`/departments/${id}/users`);
            return response.data;
        },
        enabled: !!id && id !== "undefined",
    });
};

export const useCreateDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: DepartmentInput) => {
            const response = await apiClient.post<Department>("/departments", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });
};

export const useUpdateDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: DepartmentInput }) => {
            const response = await apiClient.put<Department>(`/departments/${id}`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["departments", data.id] });
        },
    });
};

export const useDeleteDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/departments/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });
};
