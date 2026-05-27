import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { OpportunityFilters, OpportunityCreateData } from "../types";

export const useOpportunities = (filters: OpportunityFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["opportunities", filters],
        queryFn: () => opportunitiesService.getOpportunities(filters),
        staleTime: 30_000, // 30 seconds – fresh enough for CRM, prevents duplicate fetches
        placeholderData: keepPreviousData,
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
        onMutate: async ({ id, data }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ["opportunities", id] });

            // Snapshot the previous value
            const previousOpportunity = queryClient.getQueryData(["opportunities", id]);

            // Optimistically update to the new value
            queryClient.setQueryData(["opportunities", id], (old: any) => {
                if (!old) return old;
                return { ...old, ...data };
            });

            // Return a context object with the snapshotted value
            return { previousOpportunity };
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousOpportunity) {
                queryClient.setQueryData(["opportunities", (context.previousOpportunity as any).id], context.previousOpportunity);
            }
            toast.error("Failed to update opportunity");
        },
        onSettled: (data) => {
            // Always refetch after error or success to keep server & client in sync
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            if (data) {
                queryClient.invalidateQueries({ queryKey: ["opportunities", data.id] });
                queryClient.invalidateQueries({ queryKey: ["opportunities", data.id, "history"] });
                queryClient.invalidateQueries({ queryKey: ["opportunities", data.id, "costing"] });
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
        onSuccess: (data) => {
            queryClient.setQueryData(["opportunities", data.id], data);
            
            // Also update it in the list view cache
            queryClient.setQueriesData({ queryKey: ["opportunities"] }, (old: any) => {
                if (!old) return old;
                if (old.opportunities && Array.isArray(old.opportunities)) {
                    return {
                        ...old,
                        opportunities: old.opportunities.map((opp: any) =>
                            opp.id === data.id ? data : opp
                        ),
                    };
                }
                return old;
            });
            toast.success("Stage updated successfully");
        },
        onError: (err, newOpportunity, context) => {
            context?.previousQueries.forEach(([queryKey, previousData]) => {
                queryClient.setQueryData(queryKey, previousData);
            });
            toast.error("Failed to update stage — please try again");
        },
        onSettled: (data) => {
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

export const useLockOpportunity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => opportunitiesService.lockOpportunity(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities", data.id] });
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            toast.success("Opportunity locked successfully");
        },
        onError: () => {
            toast.error("Failed to lock opportunity");
        },
    });
};

export const useUnlockOpportunity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => opportunitiesService.unlockOpportunity(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities", data.id] });
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            toast.success("Opportunity unlocked successfully");
        },
        onError: (error: any) => {
            const status = error?.response?.status;
            if (status === 403) {
                toast.error("You do not have permission to unlock this opportunity.");
            } else {
                toast.error("Failed to unlock opportunity");
            }
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
