import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsService } from "@/lib/api/services/contacts.service";
import { ContactFilters, ContactCreateData } from "../types";

export const useContacts = (filters: ContactFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["contacts", filters],
        queryFn: () => contactsService.getContacts(filters),
        staleTime: 5 * 60 * 1000,
    });
};

export const useContact = (id: string) => {
    return useQuery({
        queryKey: ["contacts", id],
        queryFn: () => contactsService.getContact(id),
        enabled: !!id,
    });
};

export const useCreateContact = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ContactCreateData) => contactsService.createContact(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contacts"] });
        },
    });
};

export const useUpdateContact = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ContactCreateData> }) =>
            contactsService.updateContact(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["contacts"] });
            queryClient.invalidateQueries({ queryKey: ["contacts", data.id] });
        },
    });
};
