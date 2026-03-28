import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesService } from "@/lib/api/services/invoices.service";
import { InvoiceFilters, InvoiceCreateData, Payment } from "../types";

export const useInvoices = (filters: InvoiceFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["invoices", filters],
        queryFn: () => invoicesService.getInvoices(filters),
        staleTime: 30_000, // 30 seconds
    });
};

export const useInvoice = (id: string) => {
    return useQuery({
        queryKey: ["invoices", id],
        queryFn: () => invoicesService.getInvoice(id),
        enabled: !!id,
    });
};

export const useCreateInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: InvoiceCreateData) => invoicesService.createInvoice(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
        },
    });
};

export const useUpdateInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<InvoiceCreateData> }) =>
            invoicesService.updateInvoice(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices", data.id] });
        },
    });
};

export const useRecordPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Payment> }) =>
            invoicesService.recordPayment(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] }); // Refresh list to show status change
            queryClient.invalidateQueries({ queryKey: ["invoices", data.invoice_id] });
        },
    });
};
