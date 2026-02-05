import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksService, eventsService } from "@/lib/api/services/activities.service";
import { TaskFilters, TaskCreateData, EventFilters, EventCreateData } from "../types";

// --- Tasks Hooks ---

export const useTasks = (filters: TaskFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["tasks", filters],
        queryFn: () => tasksService.getTasks(filters),
        staleTime: 5 * 60 * 1000,
    });
};

export const useTask = (id: string) => {
    return useQuery({
        queryKey: ["tasks", id],
        queryFn: () => tasksService.getTask(id),
        enabled: !!id,
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: TaskCreateData) => tasksService.createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
};

export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<TaskCreateData> }) =>
            tasksService.updateTask(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["tasks", data.id] });
        },
    });
};

// --- Events Hooks ---

export const useEvents = (filters: EventFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["events", filters],
        queryFn: () => eventsService.getEvents(filters),
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: EventCreateData) => eventsService.createEvent(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });
};
