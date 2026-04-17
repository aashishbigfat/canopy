"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    useCreateDepartment,
    useGetDepartments,
    useUpdateDepartment,
} from "@/features/admin/api/use-departments";
import { Department, getDepartmentId } from "@/features/admin/types/departments";
import { DepartmentActions } from "./department-actions";
import { useCrudPermissions } from "@/hooks/use-crud-permissions";
import { toast } from "sonner";
import { AxiosError } from "axios";

function departmentApiErrorMessage(err: unknown): string {
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
    return "Could not save department";
}

export function DepartmentList() {
    const router = useRouter();
    const { canCreate } = useCrudPermissions("department");
    const { data, isLoading, isError } = useGetDepartments();
    const createDepartment = useCreateDepartment();
    const updateDepartment = useUpdateDepartment();

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Department | null>(null);
    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const departments = data?.departments ?? [];

    // Client-side filter
    const filtered = searchQuery.trim()
        ? departments.filter(
              (d) =>
                  d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (d.description || "").toLowerCase().includes(searchQuery.toLowerCase())
          )
        : departments;

    const openCreate = () => {
        setFormName("");
        setFormDescription("");
        setCreateOpen(true);
    };

    const openEdit = (d: Department) => {
        setFormName(d.name);
        setFormDescription(d.description || "");
        setEditTarget(d);
    };

    const submitCreate = async () => {
        if (!formName.trim()) return;
        try {
            await createDepartment.mutateAsync({
                name: formName.trim(),
                description: formDescription.trim() || undefined,
            });
            setCreateOpen(false);
            setFormName("");
            setFormDescription("");
            toast.success("Department created successfully");
        } catch (err) {
            toast.error(departmentApiErrorMessage(err));
        }
    };

    const submitEdit = async () => {
        if (!editTarget || !formName.trim()) return;
        const id = getDepartmentId(editTarget);
        if (!id) return;
        try {
            await updateDepartment.mutateAsync({
                id,
                data: {
                    name: formName.trim(),
                    description: formDescription.trim() || undefined,
                },
            });
            setEditTarget(null);
            setFormName("");
            setFormDescription("");
            toast.success("Department updated successfully");
        } catch (err) {
            toast.error(departmentApiErrorMessage(err));
        }
    };

    const cancelEdit = () => {
        setEditTarget(null);
        setFormName("");
        setFormDescription("");
    };

    const cancelCreate = () => {
        setCreateOpen(false);
        setFormName("");
        setFormDescription("");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="ml-3 text-muted-foreground">Loading departments...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive font-medium">Failed to load departments</p>
                <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Top bar: Search + Create */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search departments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                {canCreate && (
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Department
                    </Button>
                )}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created By</TableHead>
                            <TableHead>Created Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {searchQuery
                                        ? "No departments match your search."
                                        : "No departments yet. Create one to get started."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((row) => {
                                const rowId = getDepartmentId(row);
                                return (
                                    <TableRow key={rowId}>
                                        <TableCell>
                                            <button
                                                type="button"
                                                className="font-medium text-primary hover:underline cursor-pointer text-left"
                                                onClick={() => router.push(`/admin/departments/${rowId}`)}
                                            >
                                                {row.name}
                                            </button>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={row.description || ""}>
                                            {row.description || "—"}
                                        </TableCell>
                                        <TableCell>
                                            {row.is_active ? (
                                                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{row.created_by_name || "—"}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {row.created_at
                                                ? new Date(row.created_at).toLocaleDateString(undefined, {
                                                      year: "numeric",
                                                      month: "short",
                                                      day: "numeric",
                                                  })
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DepartmentActions
                                                department={row}
                                                onEdit={openEdit}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={(open) => { if (!open) cancelCreate(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Department</DialogTitle>
                        <DialogDescription>
                            Add a new department to your organization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="dept-name-create">Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="dept-name-create"
                                placeholder="e.g. Marketing, Sales, Engineering"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void submitCreate();
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dept-desc-create">Description</Label>
                            <Textarea
                                id="dept-desc-create"
                                placeholder="Brief description of this department's responsibilities..."
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelCreate}>
                            Cancel
                        </Button>
                        <Button
                            onClick={submitCreate}
                            disabled={createDepartment.isPending || !formName.trim()}
                        >
                            {createDepartment.isPending ? "Creating..." : "Create Department"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog
                open={editTarget !== null}
                onOpenChange={(open) => {
                    if (!open) cancelEdit();
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                        <DialogDescription>Update the department details below.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="dept-name-edit">Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="dept-name-edit"
                                placeholder="Department name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void submitEdit();
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dept-desc-edit">Description</Label>
                            <Textarea
                                id="dept-desc-edit"
                                placeholder="Brief description..."
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                        </Button>
                        <Button
                            onClick={submitEdit}
                            disabled={updateDepartment.isPending || !formName.trim()}
                        >
                            {updateDepartment.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
