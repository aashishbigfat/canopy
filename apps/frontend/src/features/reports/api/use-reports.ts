import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Report, ReportInput, ReportResponse, ReportsResponse } from '../types';

export const useGetReports = (params?: { entity_type?: string }) => {
    return useQuery({
        queryKey: ['reports', params],
        queryFn: async () => {
            const response = await apiClient.get<any>('/reports', { params });
            return response.data.reports || [];
        },
    });
};

export const useGetReport = (id: string) => {
    return useQuery({
        queryKey: ['reports', id],
        queryFn: async () => {
            const response = await apiClient.get<Report>(`/reports/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
};

export const useCreateReport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: ReportInput) => {
            const response = await apiClient.post<Report>('/reports', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        },
    });
};

export const useUpdateReport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: ReportInput }) => {
            const response = await apiClient.put<Report>(`/reports/${id}`, data);
            return response.data;
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['reports', data.id || data._id] });
        },
    });
};

export const useDeleteReport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/reports/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        },
    });
};

// Hook to run the report and get data
export const useRunReport = (id: string) => {
    return useQuery({
        queryKey: ['report-run', id],
        queryFn: async () => {
            const response = await apiClient.post<any>(`/reports/${id}/run`);
            return response.data;
        },
        enabled: false, // Don't run automatically, trigger manually usually
    })
}
