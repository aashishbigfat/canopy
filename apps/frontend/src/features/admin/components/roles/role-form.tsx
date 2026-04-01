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
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateRole, useUpdateRole, useGetAllPermissions } from "@/features/admin/api/use-roles";
import { Role } from "@/features/admin/types/roles";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";

const roleFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    permissions: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
    initialData?: Role;
}

export function RoleForm({ initialData }: RoleFormProps) {
    const router = useRouter();
    const createRole = useCreateRole();
    const updateRole = useUpdateRole();
    const { data: allPermissions = [], isLoading: isLoadingPerms } = useGetAllPermissions();

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            permissions: initialData?.permissions || [],
        },
    });

    // Group permissions by entity (e.g. "view_account" -> "account")
    const groupedPermissions = useMemo(() => {
        const groups: Record<string, string[]> = {};
        allPermissions.forEach((perm) => {
            // Simple heuristic: split by underscore, last part is entity usually but sometimes first
            // format usually: action_entity (view_account)
            const parts = perm.split('_');
            const entity = parts.length > 1 ? parts.slice(1).join(' ') : 'General';
            const key = entity.charAt(0).toUpperCase() + entity.slice(1);

            if (!groups[key]) groups[key] = [];
            groups[key].push(perm);
        });
        return groups;
    }, [allPermissions]);

    const handleBackendErrors = (error: any) => {
        if (error.type === ErrorType.VALIDATION && error.details?.detail) {
            const details = error.details.detail;
            details.forEach((err: any) => {
                const field = err.loc[err.loc.length - 1];
                form.setError(field as any, {
                    type: "manual",
                    message: err.msg,
                });
            });
            return true;
        }
        return false;
    };

    const onSubmit = async (data: RoleFormValues) => {
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (initialData) {
                        await updateRole.mutateAsync({ id: initialData._id, data });
                    } else {
                        await createRole.mutateAsync(data);
                    }
                    router.push("/admin/roles");
                    router.refresh();
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save role"));
                    if (!mapped) throw error;
                }
            }, "Failed to save role");
        } catch (error) {
            // Handled
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
                            <FormLabel>Role Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Sales Manager" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Permissions</h3>
                    {isLoadingPerms ? <p>Loading permissions...</p> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(groupedPermissions).map(([group, perms]) => (
                                <Card key={group}>
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-base">{group}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="space-y-2">
                                            {perms.map((perm) => (
                                                <FormField
                                                    key={perm}
                                                    control={form.control}
                                                    name="permissions"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value.includes(perm)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...field.value, perm])
                                                                            : field.onChange(field.value.filter((value) => value !== perm))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal cursor-pointer">
                                                                {perm.split('_')[0]} {/* Show 'view', 'create' etc */}
                                                            </FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                    {createRole.isPending || updateRole.isPending ? "Saving..." : "Save Role"}
                </Button>
            </form>
        </Form>
    );
}
