"use client";

import { Edit, MoreHorizontal, Trash } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hierarchy } from "@/features/admin/types/hierarchies";
import { useDeleteHierarchy } from "@/features/admin/api/use-hierarchies";
import { useCrudPermissions } from "@/hooks/use-crud-permissions";
import { toast } from "sonner";

interface HierarchyActionsProps {
    hierarchy: Hierarchy;
}

export function HierarchyActions({ hierarchy }: HierarchyActionsProps) {
    const { canEdit, canDelete } = useCrudPermissions("hierarchy");
    const router = useRouter();
    const deleteHierarchy = useDeleteHierarchy();
    const hierarchyId = hierarchy._id || hierarchy.id;

    const handleEdit = () => {
        if (!hierarchyId) return;
        router.push(`/admin/hierarchies/${hierarchyId}`);
    };

    const handleDelete = async () => {
        if (!hierarchyId) return;
        if (confirm("Are you sure you want to delete this hierarchy?")) {
            try {
                await deleteHierarchy.mutateAsync(hierarchyId);
                toast.success("Hierarchy deleted");
            } catch {
                toast.error("Failed to delete hierarchy");
            }
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
                <DropdownMenuItem onClick={() => hierarchyId && copyToClipboard(hierarchyId, "Hierarchy ID")}>
                    Copy ID
                </DropdownMenuItem>
                {(canEdit || canDelete) && <DropdownMenuSeparator />}
                {canEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
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
