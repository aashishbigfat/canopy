import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { FileRecord, FileListResponse, FileUploadParams } from '../types';

// For listing all files (maybe not efficient for massive storage, but good for admin view)
// Currently backend only supports get_files_by_entity in a clear way, 
// OR maybe I need to check if there is a general list endpoint.
// Checking routes: NO general list endpoint in v1/files.py!
// I'll assume we might need one or just use entity list if context is known.
// Wait, for standard "Files" page, we probably want *all* files. 
// I will assume a missing endpoint /files for listing all and implement it safely or just mock it for now.
// Update: v1/files.py does NOT have a GET / endpoint. It has /entity/{type}/{id}.
// I will implement useGetEntityFiles for now.

export const useGetEntityFiles = (entityType: string, entityId: string) => {
    return useQuery({
        queryKey: ['files', entityType, entityId],
        queryFn: async () => {
            const response = await apiClient.get<{ files: FileRecord[] }>(`/files/entity/${entityType}/${entityId}`);
            return response.data.files;
        },
        enabled: !!entityType && !!entityId,
    });
};

// Files the current user owns (GET /files). The backend FileResponse returns
// `id` (not `_id`), so the Drive list uses `id`.
export interface MyFile {
    id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    fileable_type?: string | null;
    fileable_id?: string | null;
    created_at: string;
}

export const useGetMyFiles = (params?: { page?: number; per_page?: number }) => {
    return useQuery({
        queryKey: ['files', 'mine', params],
        queryFn: async () => {
            const response = await apiClient.get<{ files: MyFile[]; total: number }>('/files', { params });
            return response.data;
        },
    });
};

export const useUploadFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ file, fileable_type, fileable_id, category }: FileUploadParams) => {
            const formData = new FormData();
            formData.append('file', file);
            if (fileable_type) formData.append('fileable_type', fileable_type);
            if (fileable_id) formData.append('fileable_id', fileable_id);
            if (category) formData.append('category', category);

            const response = await apiClient.post<FileRecord>('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: (_data, variables) => {
            if (variables.fileable_type && variables.fileable_id) {
                queryClient.invalidateQueries({ queryKey: ['files', variables.fileable_type, variables.fileable_id] });
            }
        },
    });
};

export const useDeleteFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/files/${id}`);
        },
        onSuccess: () => {
            // Invalidate all files queries as we don't know the exact entity without passing it back
            // Ideally we pass context or just invalidate all 'files' keys
            queryClient.invalidateQueries({ queryKey: ['files'] });
        },
    });
};

export const useGetFileUrl = (id: string) => {
    return useQuery({
        queryKey: ['file-url', id],
        queryFn: async () => {
            const response = await apiClient.get<{ url: string }>(`/files/${id}/url`);
            return response.data.url;
        },
        enabled: false, // Trigger manual
    });
}
