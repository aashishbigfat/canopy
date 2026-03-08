import { ApiResponse } from "@/lib/api/types";

export interface FileRecord {
    _id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    file_path: string;

    // Storage
    storage_type: string;
    s3_bucket?: string;
    s3_key?: string;

    // Associations
    fileable_type?: string;
    fileable_id?: string;
    category?: string;

    // Metadata
    is_public: boolean;
    download_count: number;
    created_by: string;
    tenant_id: string;
    created_at: string;
    updated_at?: string;
}

export interface FileUploadResponse extends ApiResponse<FileRecord> { }
export interface FileListResponse extends ApiResponse<FileRecord[]> { }

export interface FileUploadParams {
    file: File;
    fileable_type?: string;
    fileable_id?: string;
    category?: string;
}
