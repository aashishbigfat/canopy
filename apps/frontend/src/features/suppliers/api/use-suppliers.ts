import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersService } from "@/lib/api/services/suppliers.service";
import { SupplierFilters, SupplierCreateData } from "../types";

export const useSuppliers = (filters: SupplierFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["suppliers", filters],
        queryFn: () => suppliersService.getSuppliers(filters),
        staleTime: 5 * 60 * 1000,
    });
};

export const useSupplier = (id: string) => {
    return useQuery({
        queryKey: ["suppliers", id],
        queryFn: () => suppliersService.getSupplier(id),
        enabled: !!id,
    });
};

export const useCreateSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SupplierCreateData) => suppliersService.createSupplier(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        },
    });
};

export const useUpdateSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<SupplierCreateData> }) =>
            suppliersService.updateSupplier(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            queryClient.invalidateQueries({ queryKey: ["suppliers", data.id] });
        },
    });
};

export const useDeleteSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => suppliersService.deleteSupplier(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        },
    });
};
