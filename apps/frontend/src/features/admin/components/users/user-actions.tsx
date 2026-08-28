"use client";

import { MoreHorizontal, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "@/features/admin/types";
import { useDeleteUser } from "@/features/admin/api/use-users";

interface UserActionsProps {
    user: User;
}

export function UserActions({ user }: UserActionsProps) {
    const deleteUser = useDeleteUser();
    const userId = user.id || user._id;

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this user?")) {
            await deleteUser.mutateAsync(userId);
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
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive cursor-pointer">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
