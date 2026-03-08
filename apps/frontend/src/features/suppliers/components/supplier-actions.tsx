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
import { Supplier } from "@/features/suppliers/types";
import { useDeleteSupplier } from "@/features/suppliers/api/use-suppliers";

interface SupplierActionsProps {
    supplier: Supplier;
}

export function SupplierActions({ supplier }: SupplierActionsProps) {
    const router = useRouter();
    const deleteSupplier = useDeleteSupplier();

    const handleEdit = () => {
        // Will implement edit page later, or modal
        // router.push(`/suppliers/${supplier.id}`);
        // For now, let's assume a modal or just log
        console.log("Edit supplier", supplier.id);
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this supplier?")) {
            await deleteSupplier.mutateAsync(supplier.id);
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
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(supplier.id)}>
                    Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
