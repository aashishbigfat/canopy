"use client";

import { useState } from "react";
import { SupplierList } from "@/features/suppliers/components/supplier-list";
import { SupplierFormDrawer } from "@/features/suppliers/components/SupplierFormDrawer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SuppliersPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Supplier
                    </Button>
                </div>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <SupplierList />
            </div>

            <SupplierFormDrawer 
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </div>
    );
}
