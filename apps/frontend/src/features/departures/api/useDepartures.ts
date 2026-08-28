import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
    Departure,
    DepartureCreatePayload,
    DepartureFilters,
    DepartureListResponse,
    DepartureStats,
} from "../types";

export const departureKeys = {
    all: ["departures"] as const,
    lists: () => [...departureKeys.all, "list"] as const,
    list: (filters: DepartureFilters) => [...departureKeys.lists(), filters] as const,
    stats: () => [...departureKeys.all, "stats"] as const,
    destinations: () => [...departureKeys.all, "destinations"] as const,
    detail: (id: string) => [...departureKeys.all, "detail", id] as const,
};

export function useDepartures(filters: DepartureFilters = {}, page = 1) {
    return useQuery({
        queryKey: departureKeys.list(filters),
        queryFn: async () => {
            const params: Record<string, string> = { page: String(page), page_size: "50" };
            if (filters.destination) params.destination = filters.destination;
            if (filters.has_flight != null) params.has_flight = String(filters.has_flight);
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            if (filters.search) params.search = filters.search;
            const { data } = await apiClient.get<DepartureListResponse>("/departures/", { params });
            return data;
        },
    });
}

export function useDepartureStats() {
    return useQuery({
        queryKey: departureKeys.stats(),
        queryFn: async () => {
            const { data } = await apiClient.get<DepartureStats>("/departures/stats");
            return data;
        },
    });
}

export function useDepartureDestinations() {
    return useQuery({
        queryKey: departureKeys.destinations(),
        queryFn: async () => {
            const { data } = await apiClient.get<{ destinations: string[] }>("/departures/destinations");
            return data.destinations;
        },
    });
}

export function useCreateDeparture() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: DepartureCreatePayload) => {
            const { data } = await apiClient.post<Departure>("/departures/", payload);
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: departureKeys.lists() });
            qc.invalidateQueries({ queryKey: departureKeys.stats() });
            qc.invalidateQueries({ queryKey: departureKeys.destinations() });
        },
    });
}

export function useUpdateDeparture() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<DepartureCreatePayload> }) => {
            const { data } = await apiClient.put<Departure>(`/departures/${id}`, payload);
            return data;
        },
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: departureKeys.lists() });
            qc.invalidateQueries({ queryKey: departureKeys.detail(id) });
            qc.invalidateQueries({ queryKey: departureKeys.stats() });
        },
    });
}

export function useDeleteDeparture() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/departures/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: departureKeys.lists() });
            qc.invalidateQueries({ queryKey: departureKeys.stats() });
        },
    });
}
