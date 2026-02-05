import { ApiResponse } from "@/lib/api/types";

export interface Report {
    _id: string;
    name: string;
    description?: string;
    report_type: 'custom' | 'sales' | 'leads' | 'opportunities' | 'activities';
    entity_type: string; // 'accounts', 'contacts', etc.

    // Configuration
    columns: string[];
    filters: Record<string, any>;
    group_by?: string;
    order_by?: string;
    order_direction: 'asc' | 'desc';
    limit?: number;

    // Charting
    chart_type?: 'bar' | 'line' | 'pie' | 'donut' | 'funnel';
    chart_config: Record<string, any>;

    // Metadata
    is_public: boolean;
    is_favorite: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface ReportInput {
    name: string;
    description?: string;
    report_type?: string;
    entity_type: string;
    columns: string[];
    filters?: Record<string, any>;
    group_by?: string;
    order_by?: string;
    order_direction?: 'asc' | 'desc';
    limit?: number;
    chart_type?: string;
    chart_config?: Record<string, any>;
    is_public?: boolean;
}

export interface ReportResponse extends ApiResponse<Report> { }
export interface ReportsResponse extends ApiResponse<Report[]> { }
