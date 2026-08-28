import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api/client';
import { Report, ReportInput, ReportResponse, ReportsResponse } from '../types';
import { getApiBaseUrlNoSlash } from '@/lib/env';

export const useGetReports = (params?: { entity_type?: string; report_type?: string }) => {
    const { data: session, status } = useSession();

    return useQuery({
        queryKey: ['reports', params, session?.accessToken],
        queryFn: async () => {
            if (!session?.accessToken) {
                throw new Error("Missing access token");
            }

            const url = new URL(`${getApiBaseUrlNoSlash()}/reports`);
            url.searchParams.set("per_page", "200");
            Object.entries(params || {}).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.set(key, String(value));
                }
            });

            const response = await fetch(url.toString(), {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to load reports (${response.status})`);
            }
            const data = await response.json();
            return data.reports || [];
        },
        enabled: status !== "loading",
    });
};

export type BdReportListItem = {
    id: string;
    name: string | null;
};

export const useGetBdReportList = () => {
    const { data: session, status } = useSession();

    return useQuery({
        queryKey: ['reports', 'bd-list', session?.accessToken],
        queryFn: async () => {
            if (!session?.accessToken) {
                throw new Error("Missing access token");
            }

            const response = await fetch(`${getApiBaseUrlNoSlash()}/reports/bd-list`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to load BD reports (${response.status})`);
            }
            const data = await response.json();
            return (data.list || []) as BdReportListItem[];
        },
        enabled: status !== "loading",
    });
};

export type CustomReportScope =
    | "recent"
    | "created_by_me"
    | "public"
    | "private"
    | "all"
    | "all_folders"
    | "folder";

export type LegacyReportUser = {
    id: string;
    name: string;
    email?: string;
};

export type LegacyReportFolderRef = {
    id: string;
    name: string;
};

export type LegacyReportRow = {
    id: string;
    name: string;
    alias_name?: string;
    description?: string | null;
    folder_id?: LegacyReportFolderRef | null;
    created_by?: string | null;
    owner_id?: string | null;
    last_modified_by_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    folder?: number;
};

export type LegacyCustomReportResponse = {
    error: boolean;
    reports?: LegacyReportRow[];
    folders?: LegacyReportRow[];
    all_folders?: LegacyReportRow[];
    sub_folders?: LegacyReportRow[];
    total_reports?: number;
    total_folders?: number;
    total_sub_folders?: number;
    users?: LegacyReportUser[];
    report_columns?: Array<{ id: number; name: string; alias_name: string }>;
    display_columns?: Array<{ id: number; name: string; alias_name: string }>;
};

const apiErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error && "response" in error) {
        const data = (error as { response?: { data?: { detail?: unknown; message?: unknown } } }).response?.data;
        if (typeof data?.detail === "string") return data.detail;
        if (typeof data?.message === "string") return data.message;
    }
    if (error instanceof Error) return error.message;
    return fallback;
};

const proxyJson = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const message = typeof data?.detail === "string"
            ? data.detail
            : typeof data?.message === "string"
                ? data.message
                : `Request failed with status ${response.status}`;
        throw new Error(message);
    }
    return data as T;
};

export const useGetCustomReportWorkspace = (params: { type: string; scope: CustomReportScope; folderId?: string }) => {
    const { data: session, status } = useSession();

    return useQuery({
        queryKey: ['reports', 'custom-workspace', params, session?.accessToken],
        queryFn: async () => {
            if (params.scope === "folder" && params.folderId) {
                try {
                    return await proxyJson<LegacyCustomReportResponse>(`reports/custom/folders/${params.folderId}?type=${encodeURIComponent(params.type)}`, {
                        headers: { Authorization: `Bearer ${session?.accessToken}` },
                    });
                } catch (error: unknown) {
                    throw new Error(`${apiErrorMessage(error, "Failed to load custom reports")} (${getApiBaseUrlNoSlash()})`);
                }
            }
            try {
                return await proxyJson<LegacyCustomReportResponse>(`reports/custom?type=${encodeURIComponent(params.type)}&scope=${encodeURIComponent(params.scope)}`, {
                    headers: { Authorization: `Bearer ${session?.accessToken}` },
                });
            } catch (error: unknown) {
                throw new Error(`${apiErrorMessage(error, "Failed to load custom reports")} (${getApiBaseUrlNoSlash()})`);
            }
        },
        enabled: status === "authenticated" && !!session?.accessToken,
    });
};

export const useCreateReportFolder = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    return useMutation({
        mutationFn: async (data: { name: string; parent_id?: string | null }) => {
            return proxyJson('/reports/custom/folders', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.accessToken}` },
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports', 'custom-workspace'] });
        },
    });
};

export const useCloneCustomReport = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    return useMutation({
        mutationFn: async (data: { id: string; name: string; description?: string | null; folder_id?: LegacyReportFolderRef | null }) => {
            return proxyJson('/reports/custom/clone', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.accessToken}` },
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
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
