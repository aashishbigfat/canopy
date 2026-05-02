"use client";

import { useState } from "react";
import { SupplierList } from "@/features/suppliers/components/supplier-list";
import { SupplierFormDrawer } from "@/features/suppliers/components/SupplierFormDrawer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useIndustryLabels } from "@/lib/industry-labels";

export default function SuppliersPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const labels = useIndustryLabels();

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-8 pt-4 sm:pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-3xl font-bold tracking-tight">{labels.suppliers}</h2>
                <div className="flex items-center space-x-2">
                    <PermissionGate permission="create_supplier">
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add {labels.supplier}
                        </Button>
                    </PermissionGate>
                </div>
            </div>
            <div className="flex-1 flex-col space-y-8 flex">
                <SupplierList />
            </div>

            <SupplierFormDrawer 
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </div>
    );
}
