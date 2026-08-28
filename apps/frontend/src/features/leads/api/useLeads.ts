import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { leadsService } from "@/lib/api/services/leads.service";
import { LeadFilters, LeadCreateData, LeadConvertData } from "../types";
import { ErrorHandler, showSuccessToast, showWarningToast, showErrorToast } from "@/lib/error-handler";

export const useLeads = (filters: LeadFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["leads", filters],
        queryFn: () => leadsService.getLeads(filters),
        staleTime: 30_000, // 30 seconds
        placeholderData: keepPreviousData,
    });
};

/**
 * Keyset "load more" leads. Page 1 fetches offset (with total + cursor); each
 * subsequent page uses the cursor (O(1), COUNT skipped). next_cursor/has_more
 * travel inside `pagination`.
 */
export const useInfiniteLeads = (filters: LeadFilters = {}) => {
    return useInfiniteQuery({
        queryKey: ["leads", "infinite", filters],
        queryFn: ({ pageParam }) =>
            leadsService.getLeads({ ...filters, cursor: pageParam as string | undefined }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) =>
            lastPage?.pagination?.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
        staleTime: 30_000,
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
        onError: (error: any) => {
            // Enhanced error handling for duplicate detection
            if (error?.message?.includes("Potential duplicate")) {
                // Show duplicate warning with more details
                const duplicateMessage = error.message;
                showWarningToast("Duplicate Detection", duplicateMessage);
            } else if (error?.message?.includes("Specified account not found")) {
                showErrorToast("Account Not Found", "The selected account was not found. Please select a valid account.");
            } else if (error?.message?.includes("Specified contact not found")) {
                showErrorToast("Contact Not Found", "The selected contact was not found. Please select a valid contact.");
            } else {
                // Default error handling
                ErrorHandler.getMutationErrorHandler("Failed to convert lead")(error);
            }
        },
    });
};

export const useConversionSuggestions = (id: string) => {
    return useQuery({
        queryKey: ["leads", id, "suggestions"],
        queryFn: () => leadsService.getConversionSuggestions(id),
        enabled: !!id,
    });
};
