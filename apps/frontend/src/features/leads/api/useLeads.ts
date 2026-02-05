import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsService } from "@/lib/api/services/leads.service";
import { LeadFilters, LeadCreateData, LeadConvertData } from "../types";
import { ErrorHandler, showSuccessToast } from "@/lib/error-handler";

export const useLeads = (filters: LeadFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["leads", filters],
        queryFn: () => leadsService.getLeads(filters),
        staleTime: 5 * 60 * 1000,
    });
};

export const useLead = (id: string) => {
    return useQuery({
        queryKey: ["leads", id],
        queryFn: () => leadsService.getLead(id),
        enabled: !!id,
    });
};

export const useCreateLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: LeadCreateData) => leadsService.createLead(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            showSuccessToast("Lead created successfully");
        },
        onError: ErrorHandler.getMutationErrorHandler("Failed to create lead"),
    });
};

export const useUpdateLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<LeadCreateData> }) =>
            leadsService.updateLead(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            queryClient.invalidateQueries({ queryKey: ["leads", data.id] });
            showSuccessToast("Lead updated successfully");
        },
        onError: ErrorHandler.getMutationErrorHandler("Failed to update lead"),
    });
};

export const useConvertLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: LeadConvertData) => leadsService.convertLead(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            queryClient.invalidateQueries({ queryKey: ["contacts"] });
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            showSuccessToast("Lead converted successfully");
        },
        onError: ErrorHandler.getMutationErrorHandler("Failed to convert lead"),
    });
};
