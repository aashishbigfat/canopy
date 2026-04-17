"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateUser, useUpdateUser } from "@/features/admin/api/use-users";
import { useGetRoles } from "@/features/admin/api/use-roles";
import { useGetDepartments } from "@/features/admin/api/use-departments";
import { getRoleId } from "@/features/admin/types/roles";
import { User } from "@/features/admin/types";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";

const userFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    password: z.string().optional(),
    department_id: z.string().optional(),
    role_ids: z.array(z.string()).min(1, "At least one role is required."),
    is_active: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
    initialData?: User;
}

export function UserForm({ initialData }: UserFormProps) {
    const router = useRouter();
    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const { data: roles = [], isLoading: isLoadingRoles } = useGetRoles();
    const { data: departmentsData } = useGetDepartments();
    const departments = departmentsData?.departments || [];
    const [showPassword, setShowPassword] = useState(false);

    // Build a set of valid role IDs once roles are loaded
    const validRoleIds = roles.map((r) => getRoleId(r));

    // Filter initialData.role_ids to only include IDs that exist in the roles list
    const getCleanRoleIds = () => {
        if (!initialData?.role_ids || validRoleIds.length === 0) return initialData?.role_ids || [];
        return initialData.role_ids.filter((rid: string) => validRoleIds.includes(rid));
    };

    const form = useForm({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            email: initialData?.email || "",
            password: "",
            department_id: initialData?.department_id || "",
            role_ids: initialData?.role_ids || [],
            is_active: initialData?.is_active ?? true,
        },
    });

    // Once roles load, clean up the role_ids to remove invalid references
    React.useEffect(() => {
        if (!isLoadingRoles && roles.length > 0 && initialData?.role_ids) {
            const cleanIds = getCleanRoleIds();
            if (cleanIds.length !== (initialData?.role_ids?.length || 0)) {
                form.setValue("role_ids", cleanIds);
            }
        }
    }, [isLoadingRoles, roles]);

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

    const onSubmit = async (data: UserFormValues) => {
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (initialData) {
                        // Exclude password if empty during update
                        const updateData: any = { ...data };
                        if (!updateData.password) delete updateData.password;

                        await updateUser.mutateAsync({ id: initialData.id || initialData._id, data: updateData });
                    } else {
                        await createUser.mutateAsync(data);
                    }
                    router.push("/admin/users");
                    router.refresh();
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save user"));
                    if (!mapped) throw error;
                }
            }, "Failed to save user");
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
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a department" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {departments.map((dept: any) => (
                                        <SelectItem key={dept.id || dept._id} value={dept.id || dept._id || ""}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{initialData ? "Password (leave blank to keep current)" : "Password"}</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input type={showPassword ? "text" : "password"} placeholder="******" {...field} />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="role_ids"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Roles</FormLabel>
                            <FormControl>
                                <div className="flex flex-col gap-2 border p-4 rounded-md">
                                    {isLoadingRoles ? <p>Loading roles...</p> : roles.map((role) => {
                                        const roleId = getRoleId(role);
                                        return (
                                        <div key={roleId} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={roleId}
                                                checked={field.value.includes(roleId)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...field.value, roleId])
                                                        : field.onChange(field.value.filter((value) => value !== roleId))
                                                }}
                                            />
                                            <label
                                                htmlFor={roleId}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {role.name}
                                            </label>
                                        </div>
                                    )})}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Active
                                </FormLabel>
                                <FormDescription>
                                    This user can log in to the system.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                    {createUser.isPending || updateUser.isPending ? "Saving..." : "Save User"}
                </Button>
            </form>
        </Form>
    );
}
