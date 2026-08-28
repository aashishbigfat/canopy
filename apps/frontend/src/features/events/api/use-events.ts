import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Event, EventCreate, EventResponse, EventUpdate } from "@/features/events/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export const useGetEvents = (page = 1, perPage = 10, search?: string) => {
    return useQuery<EventResponse>({
        queryKey: ["events", page, perPage, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (search) {
                params.append("search", search);
            }
            const { data } = await apiClient.get(`/events/?${params.toString()}`);
            return data;
        },
    });
};

export const useGetEvent = (id: string) => {
    return useQuery<Event>({
        queryKey: ["events", id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/events/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

export const useCreateEvent = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: EventCreate) => {
            const { data: response } = await apiClient.post("/events/", data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
            toast({
                title: "Event created",
                description: "The event has been successfully created.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.detail || "Failed to create event",
                variant: "destructive",
            });
        },
    });
};

export const useUpdateEvent = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: EventUpdate }) => {
            const { data: response } = await apiClient.put(`/events/${id}`, data);
            return response;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
            queryClient.invalidateQueries({ queryKey: ["events", data.id] });
            toast({
                title: "Event updated",
                description: "The event has been successfully updated.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.detail || "Failed to update event",
                variant: "destructive",
            });
        },
    });
};

export const useDeleteEvent = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/events/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
            toast({
                title: "Event deleted",
                description: "The event has been successfully deleted.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.detail || "Failed to delete event",
                variant: "destructive",
            });
        },
    });
};

export const useMarkEventHeld = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(`/events/${id}/mark-held`);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
            queryClient.invalidateQueries({ queryKey: ["events", data.event.id] });
            toast({
                title: "Event marked as Held",
                description: "The event status has been updated.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.detail || "Failed to update event status",
                variant: "destructive",
            });
        },
    });
};
