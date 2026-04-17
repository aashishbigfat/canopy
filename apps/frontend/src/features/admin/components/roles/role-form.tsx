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
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateRole, useUpdateRole, useGetAllPermissions } from "@/features/admin/api/use-roles";
import { Role, getRoleId } from "@/features/admin/types/roles";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AxiosError } from "axios";

const roleFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    display_name: z.string().min(2, "Display name must be at least 2 characters."),
    description: z.string().optional(),
    permissions: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

function roleApiErrorMessage(err: unknown): string {
    if (err instanceof AxiosError) {
        const data = err.response?.data as { detail?: unknown } | undefined;
        const d = data?.detail;
        if (typeof d === "string") return d;
        if (Array.isArray(d) && d.length) {
            const first = d[0] as { msg?: string };
            return first?.msg ?? err.message;
        }
    }
    if (err instanceof Error) return err.message;
    return "Could not save role";
}

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
            display_name: initialData?.display_name || initialData?.name || "",
            description: initialData?.description || "",
            permissions: initialData?.permissions || [],
        },
    });

    // Auto-generate display_name from name if user hasn't manually edited it
    const watchName = form.watch("name");
    const watchDisplayName = form.watch("display_name");

    // Group permissions by entity (e.g. "view_account" -> "Account")
    const groupedPermissions = useMemo(() => {
        const groups: Record<string, string[]> = {};
        allPermissions.forEach((perm) => {
            const parts = perm.split('_');
            const entity = parts.length > 1 ? parts.slice(1).join(' ') : 'General';
            const key = entity.charAt(0).toUpperCase() + entity.slice(1);

            if (!groups[key]) groups[key] = [];
            groups[key].push(perm);
        });
        return groups;
    }, [allPermissions]);

    const onSubmit = async (data: RoleFormValues) => {
        try {
            if (initialData) {
                await updateRole.mutateAsync({
                    id: getRoleId(initialData),
                    data: {
                        name: data.name,
                        display_name: data.display_name,
                        description: data.description,
                        permissions: data.permissions,
                    },
                });
                toast.success("Role updated successfully");
            } else {
                await createRole.mutateAsync({
                    name: data.name,
                    display_name: data.display_name,
                    description: data.description,
                    permissions: data.permissions,
                });
                toast.success("Role created successfully");
            }
            router.push("/admin/role-management");
            router.refresh();
        } catch (err) {
            toast.error(roleApiErrorMessage(err));
        }
    };

    const handleCancel = () => {
        router.push("/admin/role-management");
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role Name <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. sales_manager" {...field} />
                                </FormControl>
                                <FormDescription>Internal identifier for the role (lowercase, no spaces).</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="display_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Display Name <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Sales Manager" {...field} />
                                </FormControl>
                                <FormDescription>Human-readable name shown in the UI.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Describe the role's responsibilities and access level..."
                                    rows={3}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Permissions</h3>
                    {isLoadingPerms ? (
                        <div className="flex items-center gap-2 p-4">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                            <span className="text-muted-foreground">Loading permissions...</span>
                        </div>
                    ) : (
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
                                                                {perm.split('_')[0]}
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

                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                        {createRole.isPending || updateRole.isPending
                            ? "Saving..."
                            : initialData
                            ? "Save Changes"
                            : "Create Role"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Form>
    );
}
