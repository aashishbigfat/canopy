"use client";

import React, { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateRole, useUpdateRole, useGetAllPermissions } from "@/features/admin/api/use-roles";
import { Role, getRoleId } from "@/features/admin/types/roles";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Loader2, ArrowLeft, Search, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
// Permission grouping logic
// ---------------------------------------------------------------------------
const ACTION_ORDER = ["view", "create", "edit", "delete", "upload", "download", "share", "public_link", "send", "manage", "approve", "reimburse", "check_in", "feature", "lock", "owner"];

const TWO_WORD_ACTIONS = new Set([
    "public_link",
    "owner_change",
    "check_in",
]);

const EXCLUDED_PERMISSIONS = new Set([
    "view_department",
    "create_department",
    "edit_department",
    "delete_department",
    "view_reports",
    "manage_webhooks",
]);

function groupPermissions(perms: string[]) {
    const groups: Record<string, { action: string; perm: string }[]> = {};

    perms.forEach((perm) => {
        if (EXCLUDED_PERMISSIONS.has(perm)) return;

        const parts = perm.split("_");
        let action = parts[0];
        let entity = parts.slice(1).join("_");

        if (parts.length >= 3) {
            const twoWordAction = `${parts[0]}_${parts[1]}`;
            if (TWO_WORD_ACTIONS.has(twoWordAction)) {
                action = twoWordAction;
                entity = parts.slice(2).join("_");
            }
        }

        const key = entity
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        if (!groups[key]) groups[key] = [];
        groups[key].push({ action, perm });
    });

    const sorted = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted;
}

// ---------------------------------------------------------------------------
// Standard Columns and Mapping
// ---------------------------------------------------------------------------
const STANDARD_COLUMNS = [
    { label: "View", action: "view" },
    { label: "Create", action: "create" },
    { label: "Edit", action: "edit" },
    { label: "Delete", action: "delete" },
    { label: "Upload", action: "upload" },
    { label: "Download", action: "download" },
    { label: "Share", action: "share" },
    { label: "Public Link", action: "public_link" }
];

function getRowCells(items: { action: string; perm: string }[]) {
    const cells = Array(8).fill(null);
    const nonStandard: { action: string; perm: string }[] = [];

    // Step 1: Map standard actions
    items.forEach(item => {
        const idx = STANDARD_COLUMNS.findIndex(col => col.action === item.action);
        if (idx !== -1) {
            cells[idx] = item;
        } else {
            nonStandard.push(item);
        }
    });

    // Step 2: Distribute non-standard actions to the empty slots
    let nsIdx = 0;
    for (let i = 0; i < 8; i++) {
        if (cells[i] === null && nsIdx < nonStandard.length) {
            cells[i] = nonStandard[nsIdx];
            nsIdx++;
        }
    }

    return cells;
}

// ---------------------------------------------------------------------------
// Full-Page Profile Form
// ---------------------------------------------------------------------------
interface ProfileFormPageProps {
    initialData?: Role;
}

export function ProfileFormPage({ initialData }: ProfileFormPageProps) {
    const router = useRouter();
    const createRole = useCreateRole();
    const updateRole = useUpdateRole();
    const { data: allPermissions = [], isLoading: isLoadingPerms } = useGetAllPermissions();
    const isEditing = !!initialData;
    const [permSearch, setPermSearch] = useState("");

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            display_name: initialData?.display_name || initialData?.name || "",
            description: initialData?.description || "",
            permissions: initialData?.permissions || [],
        },
    });

    React.useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name || "",
                display_name: initialData.display_name || initialData.name || "",
                description: initialData.description || "",
                permissions: initialData.permissions || [],
            });
        }
    }, [initialData]);

    const grouped = useMemo(() => groupPermissions(allPermissions), [allPermissions]);

    const filteredGroups = useMemo(() => {
        if (!permSearch.trim()) return grouped;
        const q = permSearch.toLowerCase();
        return grouped
            .map(([entity, items]) => {
                const matchEntity = entity.toLowerCase().includes(q);
                if (matchEntity) return [entity, items] as [string, typeof items];
                const matchedItems = items.filter(
                    (i) => i.action.toLowerCase().includes(q) || i.perm.toLowerCase().includes(q)
                );
                if (matchedItems.length > 0) return [entity, matchedItems] as [string, typeof matchedItems];
                return null;
            })
            .filter(Boolean) as [string, { action: string; perm: string }[]][];
    }, [grouped, permSearch]);

    const selectedPerms = form.watch("permissions") ?? [];

    const validSelectedPerms = useMemo(
        () => selectedPerms.filter(p => allPermissions.includes(p)),
        [selectedPerms, allPermissions]
    );

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

    const getRowSelectionState = (rowItems: { action: string; perm: string }[]) => {
        const total = rowItems.length;
        if (total === 0) return false;
        const selectedCount = rowItems.filter((i) => selectedPerms.includes(i.perm)).length;
        if (selectedCount === total) return true;
        if (selectedCount > 0) return "indeterminate";
        return false;
    };

    const handleToggleRow = (rowItems: { action: string; perm: string }[], checked: boolean) => {
        const current = form.getValues("permissions");
        let next = [...current];
        rowItems.forEach((item) => {
            if (checked) {
                if (!next.includes(item.perm)) {
                    next.push(item.perm);
                }
            } else {
                next = next.filter((p) => p !== item.perm);
            }
        });
        form.setValue("permissions", next, { shouldDirty: true });
    };

    const onSubmit = async (data: ProfileFormValues) => {
        const cleanedPermissions = data.permissions.filter(p => allPermissions.includes(p));

        try {
            if (isEditing) {
                await updateRole.mutateAsync({
                    id: getRoleId(initialData),
                    data: {
                        name: data.name,
                        display_name: data.display_name,
                        description: data.description,
                        permissions: cleanedPermissions,
                    },
                });
                toast.success("Profile updated successfully");
            } else {
                await createRole.mutateAsync({
                    name: data.name,
                    display_name: data.display_name,
                    description: data.description,
                    permissions: cleanedPermissions,
                });
                toast.success("Profile created successfully");
            }
            router.push("/admin/role-management");
        } catch (err) {
            toast.error(apiErrorMessage(err));
        }
    };

    const isPending = createRole.isPending || updateRole.isPending;

    return (
        <Form {...form}>
            <form
                id="profile-form"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                {/* Page header — compact, no blank space */}
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/admin/role-management")}
                            className="h-8 w-8 shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold leading-tight">
                                {isEditing ? "Edit Profile" : "Create Profile"}
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isEditing
                                    ? "Update profile details and permissions"
                                    : "Define a new permission profile for your team"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/admin/role-management")}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isPending}
                        >
                            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            {isPending
                                ? "Saving..."
                                : isEditing
                                  ? "Update Profile"
                                  : "Create Profile"}
                        </Button>
                    </div>
                </div>

                {/* Profile Details */}
                <div className="rounded-lg border bg-card p-5 mb-6">
                    <h2 className="text-sm font-semibold mb-4">Profile Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">
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
                                    <FormLabel className="text-xs">
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
                    <div className="mt-4">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Description</FormLabel>
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
                    </div>
                </div>

                {/* Permissions Section */}
                <div className="rounded-lg border bg-card p-5">
                    {/* Permissions header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <h2 className="text-sm font-semibold">Permissions</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="tabular-nums">
                                {validSelectedPerms.length} / {allPermissions.length} selected
                            </Badge>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium select-none">
                                <Checkbox
                                    checked={
                                        allPermissions.length > 0 && validSelectedPerms.length === allPermissions.length
                                            ? true
                                            : validSelectedPerms.length > 0
                                            ? "indeterminate"
                                            : false
                                    }
                                    onCheckedChange={(checked) => handleSelectAllPerms(!!checked)}
                                />
                                Select All
                            </label>
                        </div>
                    </div>

                    {/* Search and Title */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter permissions..."
                                value={permSearch}
                                onChange={(e) => setPermSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <div className="text-right shrink-0">
                            <h3 className="text-sm font-semibold text-muted-foreground select-none">
                                Permission List for <span className="text-foreground">{form.watch("display_name") || form.watch("name") || "New Profile"}</span> ({validSelectedPerms.length})
                            </h3>
                        </div>
                    </div>

                    {/* Permission table wrapper */}
                    {isLoadingPerms ? (
                        <div className="flex items-center gap-2 py-12 justify-center">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                                Loading permissions...
                            </span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border bg-card">
                            <Table className="w-full border-collapse">
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center font-bold text-[11px] border-b uppercase tracking-wider">#</TableHead>
                                        <TableHead className="w-[180px] font-bold text-[11px] border-b uppercase tracking-wider">Role</TableHead>
                                        <TableHead className="font-bold text-[11px] border-b uppercase tracking-wider">View</TableHead>
                                        <TableHead className="font-bold text-[11px] border-b uppercase tracking-wider">Create</TableHead>
                                        <TableHead className="font-bold text-[11px] border-b uppercase tracking-wider">Edit</TableHead>
                                        <TableHead className="font-bold text-[11px] border-b uppercase tracking-wider">Delete</TableHead>
                                        <TableHead className="font-bold text-[11px] border-b uppercase tracking-wider">Upload</TableHead>
                                        <TableHead className="font-bold text-[11px] border-b uppercase tracking-wider">Download</TableHead>
                                        <TableHead className="font-bold text-[11px] border-b uppercase tracking-wider">Share</TableHead>
                                        <TableHead className="font-bold text-[11px] border-b uppercase tracking-wider">Public Link</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredGroups.map(([entity, items]) => {
                                        const rowSelectionState = getRowSelectionState(items);
                                        const cells = getRowCells(items);
                                        return (
                                            <TableRow key={entity} className="hover:bg-muted/10 transition-colors">
                                                <TableCell className="text-center border-b py-2.5">
                                                    <Checkbox
                                                        checked={rowSelectionState}
                                                        onCheckedChange={(checked) => handleToggleRow(items, !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-semibold text-sm border-b py-2.5 text-foreground">
                                                    {entity}
                                                </TableCell>
                                                {cells.map((cell, idx) => {
                                                    if (!cell) {
                                                        return <TableCell key={idx} className="border-b py-2.5" />;
                                                    }
                                                    const isChecked = selectedPerms.includes(cell.perm);
                                                    return (
                                                        <TableCell key={idx} className="border-b py-2.5">
                                                            <label className={cn(
                                                                "inline-flex items-center gap-2 text-xs cursor-pointer select-none font-medium transition-colors py-1 px-1.5 rounded-sm hover:bg-muted/50",
                                                                isChecked ? "text-primary font-semibold" : "text-muted-foreground/80"
                                                            )}>
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    onCheckedChange={(checked) => handleToggle(cell.perm, !!checked)}
                                                                />
                                                                <span className="capitalize whitespace-nowrap">
                                                                    {cell.action.replace(/_/g, " ")}
                                                                </span>
                                                            </label>
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {!isLoadingPerms && filteredGroups.length === 0 && permSearch && (
                        <p className="text-center text-sm text-muted-foreground py-8">
                            No permission groups match &quot;{permSearch}&quot;
                        </p>
                    )}
                </div>
            </form>
        </Form>
    );
}
