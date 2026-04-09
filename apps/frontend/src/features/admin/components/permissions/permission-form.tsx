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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePermission, useUpdatePermission } from "@/features/admin/api/use-permissions";
import type { PermissionDef } from "@/features/admin/types/permissions";
import { ErrorHandler } from "@/lib/error-handler";

const permissionSchema = z.object({
    name: z
        .string()
        .min(2)
        .max(128)
        .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores (e.g. view_custom_report)."),
    display_name: z.string().min(1, "Display name is required."),
    description: z.string().optional(),
});

type PermissionFormValues = z.infer<typeof permissionSchema>;

interface PermissionFormProps {
    initialData?: PermissionDef;
}

export function PermissionForm({ initialData }: PermissionFormProps) {
    const router = useRouter();
    const createPerm = useCreatePermission();
    const updatePerm = useUpdatePermission();

    const form = useForm<PermissionFormValues>({
        resolver: zodResolver(permissionSchema),
        defaultValues: {
            name: initialData?.name || "",
            display_name: initialData?.display_name || "",
            description: initialData?.description || "",
        },
    });

    const onSubmit = async (data: PermissionFormValues) => {
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (initialData) {
                        const payload: {
                            name?: string;
                            display_name: string;
                            description?: string | null;
                        } = {
                            display_name: data.display_name,
                            description: data.description || undefined,
                        };

                        if (!initialData.is_system && data.name !== initialData.name) {
                            payload.name = data.name;
                        }

                        await updatePerm.mutateAsync({ id: initialData.id, data: payload });
                    } else {
                        await createPerm.mutateAsync({
                            name: data.name,
                            display_name: data.display_name,
                            description: data.description || undefined,
                        });
                    }

                    router.push("/admin/permissions");
                    router.refresh();
                } catch (error: unknown) {
                    const parsed = ErrorHandler.parseError(error, "Failed to save permission");
                    form.setError("root", { type: "manual", message: parsed.message });
                    throw error;
                }
            }, "Failed to save permission");
        } catch {
            // Handled
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {form.formState.errors.root && (
                    <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                )}

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Permission key</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="e.g. view_custom_report"
                                    {...field}
                                    disabled={!!initialData?.is_system}
                                />
                            </FormControl>
                            <FormDescription>
                                {initialData?.is_system
                                    ? "Built-in keys cannot be renamed."
                                    : initialData
                                      ? "Changing the key updates it on every role that uses it."
                                      : "Unique identifier used in code and APIs (snake_case)."}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Display name</FormLabel>
                            <FormControl>
                                <Input placeholder="Human-readable label" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Optional details for administrators"
                                    className="min-h-[100px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={createPerm.isPending || updatePerm.isPending}>
                    {createPerm.isPending || updatePerm.isPending ? "Saving..." : "Save Permission"}
                </Button>
            </form>
        </Form>
    );
}

