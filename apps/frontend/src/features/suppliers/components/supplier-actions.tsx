"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Supplier } from "@/features/suppliers/types";
import { useDeleteSupplier } from "@/features/suppliers/api/use-suppliers";
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
            <div className="flex items-center justify-end gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsEditDrawerOpen(true)}
                    title="Edit"
                >
                    <Pencil className="h-4 w-4 text-primary" />
                    <span className="sr-only">Edit</span>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDelete}
                    disabled={deleteSupplier.isPending}
                    title="Delete"
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                </Button>
            </div>

            <SupplierFormDrawer
                open={isEditDrawerOpen}
                onOpenChange={setIsEditDrawerOpen}
                supplierId={supplier.id}
                initialData={supplier}
            />
        </>
    );
}
