"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { Department } from "@/features/admin/types/departments";
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
    const { canCreate } = useCrudPermissions("department");
    const { data, isLoading, isError } = useGetDepartments();
    const createDepartment = useCreateDepartment();
    const updateDepartment = useUpdateDepartment();

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Department | null>(null);
    const [formName, setFormName] = useState("");

    const departments = data?.departments ?? [];

    const openCreate = () => {
        setFormName("");
        setCreateOpen(true);
    };

    const openEdit = (d: Department) => {
        setFormName(d.name);
        setEditTarget(d);
    };

    const submitCreate = async () => {
        if (!formName.trim()) return;
        try {
            await createDepartment.mutateAsync({ name: formName.trim() });
            setCreateOpen(false);
            setFormName("");
            toast.success("Department created");
        } catch (err) {
            toast.error(departmentApiErrorMessage(err));
        }
    };

    const submitEdit = async () => {
        if (!editTarget || !formName.trim()) return;
        const id = editTarget.id || editTarget._id;
        if (!id) return;
        try {
            await updateDepartment.mutateAsync({ id, data: { name: formName.trim() } });
            setEditTarget(null);
            setFormName("");
            toast.success("Department updated");
        } catch (err) {
            toast.error(departmentApiErrorMessage(err));
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center">Loading departments...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading departments</div>;
    }

    return (
        <div className="space-y-4">
            {canCreate && (
                <div className="flex items-center justify-end">
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create department
                    </Button>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Created by</TableHead>
                            <TableHead>Created date</TableHead>
                            <TableHead>Tenant ID</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {departments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No departments yet. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            departments.map((row) => {
                                const rowId = row.id || row._id || "";
                                return (
                                    <TableRow key={rowId}>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell>{row.created_by_name || "—"}</TableCell>
                                        <TableCell>
                                            {row.created_at
                                                ? new Date(row.created_at).toLocaleString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-600 max-w-[140px] truncate" title={row.tenant_id}>
                                            {row.tenant_id || "—"}
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

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create department</DialogTitle>
                        <DialogDescription>
                            Add a department. The server records who created it, when, and your
                            tenant.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="dept-name-create">Name</Label>
                        <Input
                            id="dept-name-create"
                            placeholder="Department name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void submitCreate();
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitCreate} disabled={createDepartment.isPending}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={editTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditTarget(null);
                        setFormName("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit department</DialogTitle>
                        <DialogDescription>Update the department name.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="dept-name-edit">Name</Label>
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)}>
                            Cancel
                        </Button>
                        <Button onClick={submitEdit} disabled={updateDepartment.isPending}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
