"use client";

import { Edit, MoreHorizontal, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Department } from "@/features/admin/types/departments";
import { useDeleteDepartment } from "@/features/admin/api/use-departments";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useCrudPermissions } from "@/hooks/use-crud-permissions";

function deleteErrorMessage(err: unknown): string {
    if (err instanceof AxiosError) {
        const data = err.response?.data as { detail?: unknown } | undefined;
        const d = data?.detail;
        if (typeof d === "string") return d;
    }
    if (err instanceof Error) return err.message;
    return "Could not delete department";
}

interface DepartmentActionsProps {
    department: Department;
    onEdit: (department: Department) => void;
}

export function DepartmentActions({ department, onEdit }: DepartmentActionsProps) {
    const { canEdit, canDelete } = useCrudPermissions("department");
    const deleteDepartment = useDeleteDepartment();
    const departmentId = department.id || department._id;

    const handleDelete = async () => {
        if (!departmentId) return;
        if (!confirm("Are you sure you want to delete this department?")) return;
        try {
            await deleteDepartment.mutateAsync(departmentId);
            toast.success("Department deleted");
        } catch (err) {
            toast.error(deleteErrorMessage(err));
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => departmentId && navigator.clipboard.writeText(departmentId)}
                >
                    Copy ID
                </DropdownMenuItem>
                {(canEdit || canDelete) && <DropdownMenuSeparator />}
                {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit(department)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                )}
                {canDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
