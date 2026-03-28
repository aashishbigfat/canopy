import { apiClient } from "@/lib/api/client";
import { Supplier, SupplierCreateData, SupplierFilters, SupplierResponse } from "@/features/suppliers/types";

const BASE_URL = "/suppliers";

export const suppliersService = {
    getSuppliers: async (params: SupplierFilters): Promise<SupplierResponse> => {
        const response = await apiClient.get<SupplierResponse>(BASE_URL, { params });
        return response.data;
    },

    getSupplier: async (id: string): Promise<Supplier> => {
        const response = await apiClient.get<Supplier>(`${BASE_URL}/${id}`);
        return response.data;
    },

    createSupplier: async (data: SupplierCreateData): Promise<Supplier> => {
        const response = await apiClient.post<Supplier>(BASE_URL, data);
        return response.data;
    },

    updateSupplier: async (id: string, data: Partial<SupplierCreateData>): Promise<Supplier> => {
        const response = await apiClient.put<Supplier>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteSupplier: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    getFormData: async () => {
        const response = await apiClient.get(`${BASE_URL}/form-data`);
        return response.data;
    },

    linkToOpportunity: async (opportunityId: string, data: { supplierId: string; emailSubject?: string; emailBody?: string }): Promise<void> => {
        await apiClient.post(`${BASE_URL}/opportunity/${opportunityId}/link`, null, {
            params: {
                supplier_id: data.supplierId,
                email_subject: data.emailSubject,
                email_body: data.emailBody
            }
        });
    },

    getOpportunitySuppliers: async (opportunityId: string): Promise<{ suppliers: { supplier: Supplier; email_subject?: string; email_body?: string }[] }> => {
        const response = await apiClient.get(`${BASE_URL}/opportunity/${opportunityId}`);
        return response.data;
    }
};
