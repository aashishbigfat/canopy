"use client";

import { MoreHorizontal, Edit, Trash } from "lucide-react";
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
import { Role } from "@/features/admin/types/roles";
import { useDeleteRole } from "@/features/admin/api/use-roles";

interface RoleActionsProps {
    role: Role;
}

export function RoleActions({ role }: RoleActionsProps) {
    const router = useRouter();
    const deleteRole = useDeleteRole();

    const handleEdit = () => {
        router.push(`/admin/roles/${role._id}`);
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this role?")) {
            await deleteRole.mutateAsync(role._id);
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
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(role._id)}>
                    Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                </DropdownMenuItem>
                {!role.is_system && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
