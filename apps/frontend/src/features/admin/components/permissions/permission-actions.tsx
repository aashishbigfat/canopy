"use client";

import { MoreHorizontal, Edit, Trash } from "lucide-react";
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
import type { PermissionDef } from "@/features/admin/types/permissions";
import { useDeletePermission } from "@/features/admin/api/use-permissions";
import { ErrorHandler } from "@/lib/error-handler";

interface PermissionActionsProps {
    permission: PermissionDef;
}

export function PermissionActions({ permission }: PermissionActionsProps) {
    const router = useRouter();
    const deletePermission = useDeletePermission();

    const handleEdit = () => {
        router.push(`/admin/permissions/${permission.id}`);
    };

    const handleDelete = async () => {
        if (
            !confirm(
                `Delete permission "${permission.name}"? It will be removed from any roles that use it.`
            )
        ) {
            return;
        }
        try {
            await deletePermission.mutateAsync(permission.id);
        } catch (e) {
            ErrorHandler.handle(e, "Could not delete permission");
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
                <DropdownMenuItem onClick={() => copyToClipboard(permission.id, "Permission ID")}>
                    Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                </DropdownMenuItem>
                {!permission.is_system && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

