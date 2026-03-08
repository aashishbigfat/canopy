import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotesService } from "@/lib/api/services/quotes.service";
import { QuoteFilters, QuoteCreateData } from "../types";

export const useQuotes = (filters: QuoteFilters = { page: 1, per_page: 10 }) => {
    return useQuery({
        queryKey: ["quotes", filters],
        queryFn: () => quotesService.getQuotes(filters),
        staleTime: 0,
    });
};

export const useQuote = (id: string) => {
    return useQuery({
        queryKey: ["quotes", id],
        queryFn: () => quotesService.getQuote(id),
        enabled: !!id,
    });
};

export const useCreateQuote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: QuoteCreateData) => quotesService.createQuote(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
    });
};

export const useUpdateQuote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<QuoteCreateData> }) =>
            quotesService.updateQuote(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quotes", data.id] });
        },
    });
};
