import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Itinerary, CreateItineraryPayload } from "../types";
import { apiClient } from "@/lib/api/client";

export const itinerariesKeys = {
    all: ['itineraries'] as const,
    lists: () => [...itinerariesKeys.all, 'list'] as const,
    list: (filters: string) => [...itinerariesKeys.lists(), { filters }] as const,
    details: () => [...itinerariesKeys.all, 'detail'] as const,
    detail: (id: string) => [...itinerariesKeys.details(), id] as const,
    opportunity: (id: string) => [...itinerariesKeys.all, 'opportunity', id] as const,
};

// Hooks
export const useItineraries = () => {
    return useQuery({
        queryKey: itinerariesKeys.lists(),
        queryFn: async () => {
            const { data } = await apiClient.get('/itineraries/');
            return data.itineraries as Itinerary[];
        },
    });
};

export const useItinerary = (id: string) => {
    return useQuery({
        queryKey: itinerariesKeys.detail(id),
        queryFn: async () => {
            const { data } = await apiClient.get(`/itineraries/${id}`);
            return data as Itinerary;
        },
        enabled: !!id,
    });
};

export const useOpportunityItineraries = (opportunityId: string) => {
    return useQuery({
        queryKey: itinerariesKeys.opportunity(opportunityId),
        queryFn: async () => {
            const { data } = await apiClient.get(`/itineraries/opportunity/${opportunityId}`);
            return data.itineraries as { itinerary: Itinerary; notes?: string }[];
        },
        enabled: !!opportunityId,
    });
};

export const useCreateItinerary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ payload, opportunityId }: { payload: CreateItineraryPayload; opportunityId?: string }) => {
            const { data: itinerary } = await apiClient.post('/itineraries/', payload);
            
            if (opportunityId && itinerary.id) {
                await apiClient.post(`/itineraries/opportunity/${opportunityId}/link?itinerary_id=${itinerary.id}`);
            }
            
            return itinerary;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: itinerariesKeys.lists() });
            if (variables.opportunityId) {
                queryClient.invalidateQueries({ queryKey: itinerariesKeys.opportunity(variables.opportunityId) });
            }
        },
    });
};

export const useUpdateItinerary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<Itinerary> }) => {
            const { data } = await apiClient.put(`/itineraries/${id}`, payload);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: itinerariesKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: itinerariesKeys.lists() });
        },
    });
};

export const useDeleteItinerary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.delete(`/itineraries/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itinerariesKeys.lists() });
        },
    });
};
