"use client";

import { useState } from "react";
import { SupplierList } from "@/features/suppliers/components/supplier-list";
import { SupplierFormDrawer } from "@/features/suppliers/components/SupplierFormDrawer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useIndustryLabels } from "@/lib/industry-labels";
import { EntityListToolbar } from "@/features/views/EntityListToolbar";

export default function SuppliersPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const labels = useIndustryLabels();

    return (
        <div className="crm-page">
            <div className="crm-surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>{labels.suppliers}</h1>
                    <p className="text-sm text-muted-foreground">Manage partners, vendors, and fulfillment records.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <PermissionGate permission="create_supplier">
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add {labels.supplier}
                        </Button>
                    </PermissionGate>
                </div>
            </div>
            <EntityListToolbar entity="supplier" />

            <div className="crm-surface flex flex-1 flex-col p-4">
                <SupplierList />
            </div>

            <SupplierFormDrawer 
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </div>
    );
}
