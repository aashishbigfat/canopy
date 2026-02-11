import { apiClient } from "@/lib/api/client";
import {
    Task, TaskCreateData, TaskFilters, TaskResponse,
    Event, EventCreateData, EventFilters, EventResponse
} from "@/features/tasks/types";

const TASKS_URL = "/tasks";
const EVENTS_URL = "/events";

export const tasksService = {
    getTasks: async (params: TaskFilters): Promise<TaskResponse> => {
        const response = await apiClient.get<TaskResponse>(TASKS_URL, { params });
        return response.data;
    },

    getTask: async (id: string): Promise<Task> => {
        const response = await apiClient.get<Task>(`${TASKS_URL}/${id}`);
        return response.data;
    },

    createTask: async (data: TaskCreateData): Promise<Task> => {
        const response = await apiClient.post<Task>(TASKS_URL, data);
        return response.data;
    },

    updateTask: async (id: string, data: Partial<TaskCreateData>): Promise<Task> => {
        const response = await apiClient.put<Task>(`${TASKS_URL}/${id}`, data);
        return response.data;
    },

    deleteTask: async (id: string): Promise<void> => {
        await apiClient.delete(`${TASKS_URL}/${id}`);
    },

    // Specific
    completeTask: async (id: string): Promise<Task> => {
        const response = await apiClient.post<Task>(`${TASKS_URL}/${id}/complete`);
        return response.data;
    }
};

export const eventsService = {
    getEvents: async (params: EventFilters): Promise<EventResponse> => {
        const response = await apiClient.get<EventResponse>(EVENTS_URL, { params });
        return response.data;
    },

    getEvent: async (id: string): Promise<Event> => {
        const response = await apiClient.get<Event>(`${EVENTS_URL}/${id}`);
        return response.data;
    },

    createEvent: async (data: EventCreateData): Promise<Event> => {
        const response = await apiClient.post<Event>(EVENTS_URL, data);
        return response.data;
    },

    updateEvent: async (id: string, data: Partial<EventCreateData>): Promise<Event> => {
        const response = await apiClient.put<Event>(`${EVENTS_URL}/${id}`, data);
        return response.data;
    },

    deleteEvent: async (id: string): Promise<void> => {
        await apiClient.delete(`${EVENTS_URL}/${id}`);
    }
};
