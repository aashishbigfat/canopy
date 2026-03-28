import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { itinerariesService } from "@/lib/api/services/itineraries.service";
import { ItineraryFilters, ItineraryCreateData } from "../types";

export const useItineraries = (filters: ItineraryFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["itineraries", filters],
        queryFn: () => itinerariesService.getItineraries(filters),
        staleTime: 30_000, // 30 seconds
        placeholderData: keepPreviousData,
    });
};

export const useItinerary = (id: string) => {
    return useQuery({
        queryKey: ["itineraries", id],
        queryFn: () => itinerariesService.getItinerary(id),
        enabled: !!id,
    });
};

export const useCreateItinerary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ItineraryCreateData) => itinerariesService.createItinerary(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["itineraries"] });
        },
    });
};

export const useUpdateItinerary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ItineraryCreateData> }) =>
            itinerariesService.updateItinerary(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["itineraries"] });
            queryClient.invalidateQueries({ queryKey: ["itineraries", data.id] });
        }
    });
};
