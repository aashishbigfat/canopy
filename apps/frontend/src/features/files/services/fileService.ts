import { apiClient } from "@/lib/api/client";

export interface File {
    id: string;
    name: string;
    original_name: string;
    mime_type: string;
    size: number;
    path: string;
    url?: string;
    thumbnail_url?: string;
    entity_type?: string;
    entity_id?: string;
    uploaded_by: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface FileUploadData {
    file: File;
    entity_type?: string;
    entity_id?: string;
    description?: string;
}

export interface FileFilters {
    page?: number;
    per_page?: number;
    search?: string;
    entity_type?: string;
    entity_id?: string;
    mime_type?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

const BASE_URL = "/files";

export const fileService = {
    getFiles: async (params?: FileFilters, config?: any) => {
        const { data } = await apiClient.get<any>(BASE_URL, { params, ...config });
        return data;
    },

    getFile: async (id: string) => {
        const { data } = await apiClient.get<File>(`${BASE_URL}/${id}`);
        return data;
    },

    uploadFile: async (fileData: FormData) => {
        const { data } = await apiClient.post<File>(`${BASE_URL}/upload`, fileData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },

    deleteFile: async (id: string) => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    getPresignedUrl: async (fileName: string, mimeType: string) => {
        const { data } = await apiClient.post<{ url: string }>(`${BASE_URL}/presigned-url`, {
            file_name: fileName,
            mime_type: mimeType,
        });
        return data;
    },

    downloadFile: async (id: string) => {
        const { data } = await apiClient.get(`${BASE_URL}/${id}/download`, {
            responseType: 'blob',
        });
        return data;
    },

    getPublicUrl: async (encryptedId: string) => {
        const { data } = await apiClient.get<{ url: string }>(`${BASE_URL}/public/${encryptedId}`);
        return data;
    },

    getOwnedByMe: async (params?: FileFilters) => {
        const { data } = await apiClient.get<any>(`${BASE_URL}/owned-by-me`, { params });
        return data;
    },

    getSharedWithMe: async (params?: FileFilters) => {
        const { data } = await apiClient.get<any>(`${BASE_URL}/shared-with-me`, { params });
        return data;
    },

    shareFile: async (id: string, shareData: any) => {
        const { data } = await apiClient.post(`${BASE_URL}/${id}/share`, shareData);
        return data;
    },
};
