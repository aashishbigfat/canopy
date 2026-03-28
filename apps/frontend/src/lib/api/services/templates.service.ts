import { apiClient } from "@/lib/api/client";

export interface Template {
    id: string;
    name: string;
    description?: string;
    type: string;
    category?: string;
    subject?: string;
    body: string;
    variables: string[];
    is_active: boolean;
    is_default: boolean;
}

export interface TemplateListResponse {
    templates: Template[];
    total: number;
}

const BASE_URL = "/templates";

export const templatesService = {
    getTemplates: async (params?: { type?: string; category?: string; skip?: number; limit?: number }): Promise<TemplateListResponse> => {
        const response = await apiClient.get<TemplateListResponse>(BASE_URL, { params });
        return response.data;
    },

    getTemplate: async (id: string): Promise<Template> => {
        const response = await apiClient.get<Template>(`${BASE_URL}/${id}`);
        return response.data;
    },

    renderTemplate: async (id: string, data: Record<string, any>): Promise<{ rendered_subject: string; rendered_body: string }> => {
        const response = await apiClient.post(`${BASE_URL}/${id}/render`, { data });
        return response.data;
    }
};
