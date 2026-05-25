"use client";

import React, { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { useCreateRole, useUpdateRole, useGetAllPermissions } from "@/features/admin/api/use-roles";
import { Role, getRoleId } from "@/features/admin/types/roles";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const profileFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    display_name: z.string().min(2, "Display name must be at least 2 characters."),
    description: z.string().optional(),
    permissions: z.array(z.string()),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function apiErrorMessage(err: unknown): string {
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
    return "Could not save profile";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfileFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: Role;
}

// ---------------------------------------------------------------------------
// Permission grouping logic
// ---------------------------------------------------------------------------
const ACTION_ORDER = ["view", "create", "edit", "delete", "upload", "download", "share", "public_link", "send", "manage", "approve", "reimburse", "check_in", "feature", "lock", "owner"];

const TWO_WORD_ACTIONS = new Set([
    "public_link",
    "owner_change",
    "check_in",  // for check_in_bd_visit
]);

function groupPermissions(perms: string[]) {
    const groups: Record<string, { action: string; perm: string }[]> = {};

    perms.forEach((perm) => {
        const parts = perm.split("_");
        let action = parts[0];
        let entity = parts.slice(1).join("_");

        // Handle multi-word actions like "public_link", "owner_change", "check_in"
        if (parts.length >= 3) {
            const twoWordAction = `${parts[0]}_${parts[1]}`;
            if (TWO_WORD_ACTIONS.has(twoWordAction)) {
                action = twoWordAction;
                entity = parts.slice(2).join("_");
            }
        }

        // Capitalize entity name for display
        const key = entity
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        if (!groups[key]) groups[key] = [];
        groups[key].push({ action, perm });
    });

    // Sort groups alphabetically
    const sorted = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted;
}

// ---------------------------------------------------------------------------
// Collapsible Permission Group
// ---------------------------------------------------------------------------
function PermissionGroup({
    entity,
    items,
    selectedPerms,
    onToggle,
}: {
    entity: string;
    items: { action: string; perm: string }[];
    selectedPerms: string[];
    onToggle: (perm: string, checked: boolean) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const allSelected = items.every((i) => selectedPerms.includes(i.perm));
    const someSelected = items.some((i) => selectedPerms.includes(i.perm));
    const selectedCount = items.filter((i) => selectedPerms.includes(i.perm)).length;

    const handleSelectAll = (checked: boolean) => {
        items.forEach((i) => onToggle(i.perm, checked));
    };

    return (
        <div className="border rounded-md">
            <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={(checked) => {
                            handleSelectAll(!!checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm font-medium">{entity}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                    {selectedCount}/{items.length}
                </Badge>
            </div>
            {expanded && (
                <div className="border-t px-3 py-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1.5 bg-muted/20">
                    {items
                        .sort((a, b) => {
                            const ai = ACTION_ORDER.indexOf(a.action);
                            const bi = ACTION_ORDER.indexOf(b.action);
                            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                        })
                        .map((item) => (
                            <label
                                key={item.perm}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                                <Checkbox
                                    checked={selectedPerms.includes(item.perm)}
                                    onCheckedChange={(checked) => onToggle(item.perm, !!checked)}
                                />
                                <span className="capitalize">{item.action.replace(/_/g, " ")}</span>
                            </label>
                        ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Profile Form Sheet
// ---------------------------------------------------------------------------
export function ProfileFormSheet({ open, onOpenChange, initialData }: ProfileFormSheetProps) {
    const createRole = useCreateRole();
    const updateRole = useUpdateRole();
    const { data: allPermissions = [], isLoading: isLoadingPerms } = useGetAllPermissions();
    const isEditing = !!initialData;

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            display_name: initialData?.display_name || initialData?.name || "",
            description: initialData?.description || "",
            permissions: initialData?.permissions || [],
        },
    });

    // Reset form when opening with different data
    React.useEffect(() => {
        if (open) {
            form.reset({
                name: initialData?.name || "",
                display_name: initialData?.display_name || initialData?.name || "",
                description: initialData?.description || "",
                permissions: initialData?.permissions || [],
            });
        }
    }, [open, initialData]);

    // Group permissions for the matrix display
    const grouped = useMemo(() => groupPermissions(allPermissions), [allPermissions]);

    const selectedPerms = form.watch("permissions");

    const handleToggle = (perm: string, checked: boolean) => {
        const current = form.getValues("permissions");
        if (checked) {
            if (!current.includes(perm)) {
                form.setValue("permissions", [...current, perm], { shouldDirty: true });
            }
        } else {
            form.setValue(
                "permissions",
                current.filter((p) => p !== perm),
                { shouldDirty: true }
            );
        }
    };

    const handleSelectAllPerms = (checked: boolean) => {
        if (checked) {
            form.setValue("permissions", [...allPermissions], { shouldDirty: true });
        } else {
            form.setValue("permissions", [], { shouldDirty: true });
        }
    };

    const onSubmit = async (data: ProfileFormValues) => {
        try {
            if (isEditing) {
                await updateRole.mutateAsync({
                    id: getRoleId(initialData),
                    data: {
                        name: data.name,
                        display_name: data.display_name,
                        description: data.description,
                        permissions: data.permissions,
                    },
                });
                toast.success("Profile updated successfully");
            } else {
                await createRole.mutateAsync({
                    name: data.name,
                    display_name: data.display_name,
                    description: data.description,
                    permissions: data.permissions,
                });
                toast.success("Profile created successfully");
            }
            onOpenChange(false);
        } catch (err) {
            toast.error(apiErrorMessage(err));
        }
    };

    const isPending = createRole.isPending || updateRole.isPending;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="!w-full !max-w-2xl p-0 flex flex-col overflow-hidden"
            >
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b bg-primary text-primary-foreground shrink-0">
                    <SheetTitle className="text-primary-foreground text-lg">
                        {isEditing ? "Edit Profile" : "Create Profile"}
                    </SheetTitle>
                    <SheetDescription className="text-primary-foreground/70 text-sm">
                        {isEditing
                            ? "Update profile name, description, and permissions."
                            : "Define a new permission profile for your team."}
                    </SheetDescription>
                </SheetHeader>

                {/* Scrollable form body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <Form {...form}>
                        <form
                            id="profile-form"
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-5 pb-4"
                        >
                            {/* Row: Name / Display Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Profile Name <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Dook_Power" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="display_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Display Name <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Dook Power" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe what this profile is for..."
                                                rows={2}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Permissions matrix */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">Permissions</h3>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary">
                                            {selectedPerms.length} / {allPermissions.length} selected
                                        </Badge>
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                            <Checkbox
                                                checked={
                                                    selectedPerms.length === allPermissions.length && allPermissions.length > 0
                                                        ? true
                                                        : selectedPerms.length > 0
                                                        ? "indeterminate"
                                                        : false
                                                }
                                                onCheckedChange={(checked) => handleSelectAllPerms(!!checked)}
                                            />
                                            Select All
                                        </label>
                                    </div>
                                </div>

                                {isLoadingPerms ? (
                                    <div className="flex items-center gap-2 p-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm text-muted-foreground">
                                            Loading permissions...
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {grouped.map(([entity, items]) => (
                                            <PermissionGroup
                                                key={entity}
                                                entity={entity}
                                                items={items}
                                                selectedPerms={selectedPerms}
                                                onToggle={handleToggle}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </form>
                    </Form>
                </div>

                {/* Fixed footer */}
                <SheetFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
                    <Button
                        type="submit"
                        form="profile-form"
                        disabled={isPending}
                        className="w-full"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isPending
                            ? "Saving..."
                            : isEditing
                              ? "Update Profile"
                              : "Create Profile"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// Keep the old export for backward compatibility with [id] edit page
export function RoleForm({ initialData }: { initialData?: Role }) {
    const [sheetOpen, setSheetOpen] = React.useState(true);
    return (
        <ProfileFormSheet
            open={sheetOpen}
            onOpenChange={(open) => {
                setSheetOpen(open);
                if (!open) {
                    window.history.back();
                }
            }}
            initialData={initialData}
        />
    );
}
