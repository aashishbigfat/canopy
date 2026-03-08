import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

export const useDeleteOpportunity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => opportunitiesService.deleteOpportunity(id),
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
        onMutate: async (newOpportunity) => {
            await queryClient.cancelQueries({ queryKey: ["opportunities"] });
            const previousQueries = queryClient.getQueriesData({ queryKey: ["opportunities"] });

            queryClient.setQueriesData({ queryKey: ["opportunities"] }, (old: any) => {
                if (!old) return old;

                // Handle List Response
                if (old.opportunities && Array.isArray(old.opportunities)) {
                    return {
                        ...old,
                        opportunities: old.opportunities.map((opp: any) =>
                            opp.id === newOpportunity.id ? { ...opp, ...newOpportunity.data } : opp
                        ),
                    };
                }

                // Handle Single Record Response
                if (old.id === newOpportunity.id) {
                    return { ...old, ...newOpportunity.data };
                }

                return old;
            });

            return { previousQueries };
        },
        onError: (err, newOpportunity, context) => {
            context?.previousQueries.forEach(([queryKey, previousData]) => {
                queryClient.setQueryData(queryKey, previousData);
            });
            toast.error("Failed to update opportunity");
        },
        onSettled: (data) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            if (data) {
                queryClient.invalidateQueries({ queryKey: ["opportunities", data.id] });
            }
        },
    });
};

export const useUpdateOpportunityStage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, stageId, reason }: { id: string; stageId: string; reason?: string }) =>
            opportunitiesService.updateStage(id, stageId, reason),
        onMutate: async (newOpportunity) => {
            await queryClient.cancelQueries({ queryKey: ["opportunities"] });
            const previousQueries = queryClient.getQueriesData({ queryKey: ["opportunities"] });

            queryClient.setQueriesData({ queryKey: ["opportunities"] }, (old: any) => {
                if (!old) return old;

                // Handle List Response
                if (old.opportunities && Array.isArray(old.opportunities)) {
                    return {
                        ...old,
                        opportunities: old.opportunities.map((opp: any) =>
                            opp.id === newOpportunity.id
                                ? { ...opp, sales_stage_id: newOpportunity.stageId }
                                : opp
                        ),
                    };
                }

                // Handle Single Record Response
                if (old.id === newOpportunity.id) {
                    return { ...old, sales_stage_id: newOpportunity.stageId };
                }

                return old;
            });

            return { previousQueries };
        },
        onError: (err, newOpportunity, context) => {
            context?.previousQueries.forEach(([queryKey, previousData]) => {
                queryClient.setQueryData(queryKey, previousData);
            });
            toast.error("Failed to update stage — please try again");
        },
        onSettled: (data) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            if (data) {
                queryClient.invalidateQueries({ queryKey: ["opportunities", data.id] });
            }
            queryClient.invalidateQueries({ queryKey: ["sales-stages"] });
        },
    });
};

export const useSalesStages = () => {
    return useQuery({
        queryKey: ["sales-stages"],
        queryFn: () => opportunitiesService.getSalesStages(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useExperiences = () => {
    return useQuery({
        queryKey: ["experiences"],
        queryFn: () => opportunitiesService.getExperiences(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useOpportunityHistory = (id: string) => {
    return useQuery({
        queryKey: ["opportunities", id, "history"],
        queryFn: () => opportunitiesService.getHistory(id),
        enabled: !!id,
    });
};

export const useOpportunityTasks = (id: string) => {
    return useQuery({
        queryKey: ["opportunities", id, "tasks"],
        queryFn: () => opportunitiesService.getTasks(id),
        enabled: !!id,
    });
};

export const useCreateOpportunityTask = (opportunityId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => opportunitiesService.createTask(opportunityId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunities", opportunityId, "tasks"] });
        },
    });
};

export const useChangeOpportunityOwner = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, newOwnerId }: { id: string; newOwnerId: string }) =>
            opportunitiesService.changeOwner(id, newOwnerId),
        onMutate: async (newOwner) => {
            await queryClient.cancelQueries({ queryKey: ["opportunities"] });
            const previousQueries = queryClient.getQueriesData({ queryKey: ["opportunities"] });

            queryClient.setQueriesData({ queryKey: ["opportunities"] }, (old: any) => {
                if (!old) return old;

                // Handle List Response
                if (old.opportunities && Array.isArray(old.opportunities)) {
                    return {
                        ...old,
                        opportunities: old.opportunities.map((opp: any) =>
                            opp.id === newOwner.id ? { ...opp, owner_id: newOwner.newOwnerId } : opp
                        ),
                    };
                }

                // Handle Single Record Response
                if (old.id === newOwner.id) {
                    return { ...old, owner_id: newOwner.newOwnerId };
                }

                return old;
            });

            return { previousQueries };
        },
        onError: (err, newOwner, context) => {
            context?.previousQueries.forEach(([queryKey, previousData]) => {
                queryClient.setQueryData(queryKey, previousData);
            });
            toast.error("Failed to change owner");
        },
        onSettled: (data) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            if (data) {
                queryClient.invalidateQueries({ queryKey: ["opportunities", data.id] });
            }
        },
    });
};
