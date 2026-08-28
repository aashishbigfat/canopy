"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateHierarchy, useUpdateHierarchy } from "@/features/admin/api/use-hierarchies";
import { Hierarchy } from "@/features/admin/types/hierarchies";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";

const hierarchyFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
});

type HierarchyFormValues = z.infer<typeof hierarchyFormSchema>;

interface HierarchyFormProps {
    initialData?: Hierarchy;
}

export function HierarchyForm({ initialData }: HierarchyFormProps) {
    const router = useRouter();
    const createHierarchy = useCreateHierarchy();
    const updateHierarchy = useUpdateHierarchy();

    const form = useForm<HierarchyFormValues>({
        resolver: zodResolver(hierarchyFormSchema),
        defaultValues: {
            name: initialData?.name || "",
        },
    });

    const handleBackendErrors = (error: any) => {
        if (error.type === ErrorType.VALIDATION && error.details?.detail) {
            const details = error.details.detail;
            details.forEach((err: any) => {
                const field = err.loc[err.loc.length - 1];
                form.setError(field as keyof HierarchyFormValues, {
                    type: "manual",
                    message: err.msg,
                });
            });
            return true;
        }
        return false;
    };

    const onSubmit = async (data: HierarchyFormValues) => {
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (initialData) {
                        await updateHierarchy.mutateAsync({ id: initialData._id || initialData.id!, data });
                    } else {
                        await createHierarchy.mutateAsync(data);
                    }
                    router.push("/admin/hierarchies");
                    router.refresh();
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save hierarchy"));
                    if (!mapped) throw error;
                }
            }, "Failed to save hierarchy");
        } catch (error) {
            // Error handled by ErrorHandler
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hierarchy Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Sales Team Structure" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={createHierarchy.isPending || updateHierarchy.isPending}>
                    {createHierarchy.isPending || updateHierarchy.isPending ? "Saving..." : "Save Hierarchy"}
                </Button>
            </form>
        </Form>
    );
}
