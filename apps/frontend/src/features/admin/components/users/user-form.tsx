"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCreateUser, useUpdateUser } from "@/features/admin/api/use-users";
import { useGetRoles } from "@/features/admin/api/use-roles";
import { useGetHierarchies } from "@/features/admin/api/use-hierarchies";
import { getRoleId } from "@/features/admin/types/roles";
import { User } from "@/features/admin/types";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { locationService } from "@/lib/api/services/locations.service";
import { MultiSelect } from "@/components/ui/multi-select";



// ---------------------------------------------------------------------------
// Validation — mirrors backend validators.py
// ---------------------------------------------------------------------------
const PHONE_REGEX = /^\+?\d{1,4}\s\d{10}$/;

const userFormSchema = z.object({
    first_name: z.string().min(2, "First name must be at least 2 characters.").max(50),
    last_name: z.string().min(1, "Last name is required.").max(50),
    email: z.string().email("Invalid email address."),
    password: z.string().optional(),
    phone: z.string().optional().refine(
        (v) => !v || PHONE_REGEX.test(v),
        "Invalid phone. Use: +91 9876543210"
    ),
    mobile: z.string().optional().refine(
        (v) => !v || PHONE_REGEX.test(v),
        "Invalid mobile. Use: +91 9876543210"
    ),
    phone_extension: z.string().max(10).optional(),
    title: z.string().max(100).optional(),
    role_hierarchy_id: z.string().min(1, "Role (Hierarchy) is required."),
    profile_id: z.string().min(1, "Profile is required."),
    is_active: z.boolean().default(true),
    is_available_for_assignment: z.boolean().default(true),
    assigned_countries: z.array(z.string()).default([]),
    not_assigned_countries: z.array(z.string()).default([]),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: User;
}

export function UserFormSheet({ open, onOpenChange, initialData }: UserFormSheetProps) {
    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const { data: roles = [], isLoading: isLoadingRoles } = useGetRoles();
    const { data: hierarchiesData, isLoading: isLoadingHierarchies } = useGetHierarchies();
    const hierarchies = hierarchiesData?.hierarchies || hierarchiesData?.data || [];
    const [showPassword, setShowPassword] = useState(false);
    const isEditing = !!initialData;
    const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);

    React.useEffect(() => {
        if (open) {
            setIsLoadingCountries(true);
            locationService.getCountries()
                .then((res) => {
                    setCountries(res.countries || []);
                })
                .catch((err) => console.error("Failed to load countries", err))
                .finally(() => setIsLoadingCountries(false));
        }
    }, [open]);



    // Parse name into first/last for edit mode
    const parseName = (name?: string) => {
        if (!name) return { first: "", last: "" };
        const parts = name.split(" ");
        return {
            first: parts[0] || "",
            last: parts.slice(1).join(" ") || "",
        };
    };

    const { first, last } = parseName(initialData?.name);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            first_name: first,
            last_name: last,
            email: initialData?.email || "",
            password: "",
            phone: initialData?.phone || "",
            mobile: "",
            phone_extension: "",
            title: initialData?.title || "",
            role_hierarchy_id: initialData?.role_hierarchy_id || "",
            profile_id: initialData?.role_ids?.[0] || "",
            is_active: initialData?.is_active ?? true,
            is_available_for_assignment: initialData?.is_available_for_assignment ?? true,
            assigned_countries: initialData?.assigned_countries || [],
            not_assigned_countries: initialData?.not_assigned_countries || [],
        },
    });

    // Reset form when opening with different data
    React.useEffect(() => {
        if (open) {
            const { first: f, last: l } = parseName(initialData?.name);
            form.reset({
                first_name: f,
                last_name: l,
                email: initialData?.email || "",
                password: "",
                phone: initialData?.phone || "",
                mobile: "",
                phone_extension: "",
                title: initialData?.title || "",
                role_hierarchy_id: initialData?.role_hierarchy_id || "",
                profile_id: initialData?.role_ids?.[0] || "",
                is_active: initialData?.is_active ?? true,
                is_available_for_assignment: initialData?.is_available_for_assignment ?? true,
                assigned_countries: initialData?.assigned_countries || [],
                not_assigned_countries: initialData?.not_assigned_countries || [],
            });
        }
    }, [open, initialData]);



    const onSubmit = async (data: UserFormValues) => {
        try {
            // Combine first/last into name for API
            const payload: any = {
                name: `${data.first_name} ${data.last_name}`.trim(),
                email: data.email,
                role_ids: [data.profile_id],
                role_hierarchy_id: data.role_hierarchy_id || undefined,
                phone: data.phone || undefined,
                title: data.title || undefined,
                is_active: data.is_active,
                is_available_for_assignment: data.is_available_for_assignment,
                assigned_countries: data.assigned_countries,
                not_assigned_countries: data.not_assigned_countries,
            };

            if (isEditing) {
                if (data.password) payload.password = data.password;
                await updateUser.mutateAsync({
                    id: initialData.id || initialData._id,
                    data: payload,
                });
                toast.success("User updated successfully");
            } else {
                // Password is required for new users
                if (!data.password || data.password.length < 8) {
                    form.setError("password", {
                        type: "manual",
                        message: "Password is required (min 8 chars, 1 upper, 1 lower, 1 number, 1 special).",
                    });
                    return;
                }
                payload.password = data.password;
                await createUser.mutateAsync(payload);
                toast.success("User created successfully");
            }

            onOpenChange(false);
        } catch (error: any) {
            const msg = error?.response?.data?.detail || error?.message || "Failed to save user";
            toast.error(typeof msg === "string" ? msg : "Validation error. Check form fields.");

            // Map backend validation errors to form fields
            if (error?.response?.data?.detail && Array.isArray(error.response.data.detail)) {
                error.response.data.detail.forEach((err: any) => {
                    const field = err.loc?.[err.loc.length - 1];
                    if (field) {
                        form.setError(field as any, { type: "manual", message: err.msg });
                    }
                });
            }
        }
    };

    const isPending = createUser.isPending || updateUser.isPending;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="!w-full !sm:max-w-lg !max-w-lg p-0 flex flex-col overflow-hidden"
            >
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b bg-primary text-primary-foreground shrink-0">
                    <SheetTitle className="text-primary-foreground text-lg">
                        {isEditing ? "Edit User" : "Add User"}
                    </SheetTitle>
                    <SheetDescription className="text-primary-foreground/70 text-sm">
                        {isEditing
                            ? "Update user details and permissions."
                            : "Fill in details to create a new user."}
                    </SheetDescription>
                </SheetHeader>

                {/* Scrollable form body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <Form {...form}>
                        <form
                            id="user-form"
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-5 pb-4"
                        >
                            {/* Row: First Name / Last Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="John" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Row: Email / Mobile */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="john@company.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mobile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mobile</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+91 9876543210" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Row: Phone / Phone Extension */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+91 9876543210" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone_extension"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Extension</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Password */}
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {isEditing ? "Password (leave blank to keep)" : "Password"}{" "}
                                            {!isEditing && <span className="text-destructive">*</span>}
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 special"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Role (Hierarchy Position) */}
                            <FormField
                                control={form.control}
                                name="role_hierarchy_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role (Position in Hierarchy) <span className="text-destructive">*</span></FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent position="popper" sideOffset={4} className="max-h-[300px]">
                                                {isLoadingHierarchies ? (
                                                    <SelectItem value="__loading" disabled>Loading...</SelectItem>
                                                ) : hierarchies.filter((h: any) => h._id || h.id).length === 0 ? (
                                                    <SelectItem value="__empty" disabled>No roles available</SelectItem>
                                                ) : (
                                                    hierarchies
                                                        .filter((h: any) => h._id || h.id)
                                                        .map((h: any) => {
                                                            const hId = h._id || h.id;
                                                            return (
                                                                <SelectItem key={hId} value={hId}>
                                                                    {h.name}
                                                                </SelectItem>
                                                            );
                                                        })
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Profile (Permissions) — dropdown */}
                            <FormField
                                control={form.control}
                                name="profile_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Profile <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a profile" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent position="popper" sideOffset={4} className="max-h-[300px]">
                                                {isLoadingRoles ? (
                                                    <SelectItem value="__loading" disabled>Loading...</SelectItem>
                                                ) : roles.filter((role: any) => getRoleId(role)).length === 0 ? (
                                                    <SelectItem value="__empty" disabled>No profiles available</SelectItem>
                                                ) : (
                                                    roles
                                                        .filter((role: any) => getRoleId(role))
                                                        .map((role: any) => {
                                                            const roleId = getRoleId(role);
                                                            return (
                                                                <SelectItem key={roleId} value={roleId}>
                                                                    {role.display_name || role.name}
                                                                    {role.permissions?.length ? ` (${role.permissions.length})` : ""}
                                                                </SelectItem>
                                                            );
                                                        })
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Row: Title / Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Sales Manager" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="is_active"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col justify-end">
                                            <FormLabel>Status</FormLabel>
                                            <Select
                                                onValueChange={(v) => field.onChange(v === "active")}
                                                defaultValue={field.value ? "active" : "inactive"}
                                                value={field.value ? "active" : "inactive"}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="inactive">Inactive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Auto-Assignment */}
                            <FormField
                                control={form.control}
                                name="is_available_for_assignment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Auto-Assignment</FormLabel>
                                        <Select
                                            onValueChange={(v) => field.onChange(v === "yes")}
                                            defaultValue={field.value ? "yes" : "no"}
                                            value={field.value ? "yes" : "no"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />

                            {/* Countries Assign */}
                            <FormField
                                control={form.control}
                                name="assigned_countries"
                                render={({ field }) => {
                                    const notAssignedSelected = form.watch("not_assigned_countries") || [];
                                    const assignOptions = countries
                                        .filter((c) => !notAssignedSelected.includes(c.name))
                                        .map((c) => ({ value: c.name, label: c.name }));
                                    return (
                                        <FormItem>
                                            <FormLabel>Countries Assign</FormLabel>
                                            <FormControl>
                                                <MultiSelect
                                                    options={assignOptions}
                                                    selected={field.value || []}
                                                    onChange={field.onChange}
                                                    placeholder="Select countries to assign..."
                                                    isLoading={isLoadingCountries}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />

                            {/* Countries Not Assign */}
                            <FormField
                                control={form.control}
                                name="not_assigned_countries"
                                render={({ field }) => {
                                    const assignedSelected = form.watch("assigned_countries") || [];
                                    const notAssignOptions = countries
                                        .filter((c) => !assignedSelected.includes(c.name))
                                        .map((c) => ({ value: c.name, label: c.name }));
                                    return (
                                        <FormItem>
                                            <FormLabel>Countries Not Assign</FormLabel>
                                            <FormControl>
                                                <MultiSelect
                                                    options={notAssignOptions}
                                                    selected={field.value || []}
                                                    onChange={field.onChange}
                                                    placeholder="Select countries to not assign..."
                                                    isLoading={isLoadingCountries}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                        </form>
                    </Form>
                </div>

                {/* Fixed footer */}
                <SheetFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button
                        type="submit"
                        form="user-form"
                        disabled={isPending}
                        className="w-full"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isPending
                            ? "Saving..."
                            : isEditing
                              ? "Update User"
                              : "Add User"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
