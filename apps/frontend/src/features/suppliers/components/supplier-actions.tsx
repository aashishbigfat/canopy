"use client";

import { useState } from "react";
import { MoreHorizontal, Edit, Trash } from "lucide-react";
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
import { copyToClipboard } from "@/lib/clipboard";
import { SupplierFormDrawer } from "./SupplierFormDrawer";

interface SupplierActionsProps {
    supplier: Supplier;
}

export function SupplierActions({ supplier }: SupplierActionsProps) {
    const deleteSupplier = useDeleteSupplier();
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this supplier?")) {
            await deleteSupplier.mutateAsync(supplier.id);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => copyToClipboard(supplier.id, "Supplier ID")}>
                        Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsEditDrawerOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <SupplierFormDrawer
                open={isEditDrawerOpen}
                onOpenChange={setIsEditDrawerOpen}
                supplierId={supplier.id}
                initialData={supplier}
            />
        </>
    );
}
