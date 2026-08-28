import { apiClient } from "@/lib/api/client";
import { Invoice, InvoiceDetail, InvoiceCreateData, InvoiceFilters, InvoiceResponse, Payment } from "@/features/invoices/types";

const BASE_URL = "/invoices";

export const invoicesService = {
    getInvoices: async (params: InvoiceFilters): Promise<InvoiceResponse> => {
        const response = await apiClient.get<InvoiceResponse>(BASE_URL, { params });
        return response.data;
    },

    getInvoice: async (id: string): Promise<InvoiceDetail> => {
        const response = await apiClient.get<InvoiceDetail>(`${BASE_URL}/${id}`);
        return response.data;
    },

    createInvoice: async (data: InvoiceCreateData): Promise<InvoiceDetail> => {
        const response = await apiClient.post<InvoiceDetail>(BASE_URL, data);
        return response.data;
    },

    updateInvoice: async (id: string, data: Partial<InvoiceCreateData>): Promise<InvoiceDetail> => {
        const response = await apiClient.put<InvoiceDetail>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteInvoice: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    recordPayment: async (id: string, data: Partial<Payment>): Promise<Payment> => {
        const response = await apiClient.post<Payment>(`${BASE_URL}/${id}/payments`, data);
        return response.data;
    }
};
