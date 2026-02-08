import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { OpportunityFilters, OpportunityCreateData } from "../types";

export const useOpportunities = (filters: OpportunityFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["opportunities", filters],
        queryFn: () => opportunitiesService.getOpportunities(filters),
        staleTime: 0,
    });
};

export const useOpportunity = (id: string) => {
    return useQuery({
        queryKey: ["opportunities", id],
        queryFn: () => opportunitiesService.getOpportunity(id),
        enabled: !!id,
    });
};

export const useCreateOpportunity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: OpportunityCreateData) => opportunitiesService.createOpportunity(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        },
    });
};

export const useUpdateOpportunity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<OpportunityCreateData> }) =>
            opportunitiesService.updateOpportunity(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            queryClient.invalidateQueries({ queryKey: ["opportunities", data.id] });
        },
    });
};

export const useUpdateOpportunityStage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, stageId, reason }: { id: string; stageId: string; reason?: string }) =>
            opportunitiesService.updateStage(id, stageId, reason),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            queryClient.invalidateQueries({ queryKey: ["opportunities", data.id] });
        }
    });
};
