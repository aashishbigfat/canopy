"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { SupplierForm } from "./supplier-form";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Supplier } from "../types";
import { useRouter } from "next/navigation";

interface SupplierFormDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: Supplier;
    supplierId?: string;
    onSuccess?: () => void;
}

export function SupplierFormDrawer({
    open,
    onOpenChange,
    initialData,
    supplierId,
    onSuccess
}: SupplierFormDrawerProps) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [editData, setEditData] = useState<Supplier | undefined>(initialData);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!open || !supplierId || editData) return;
        
        let cancelled = false;
        // In this implementation, the parent list component usually provides initialData.
        // We leave this structure matching the AccountFormDrawer for future direct ID fetching.
        const fetchSupplier = async () => {
            setLoading(true);
            try {
                // Fetch logic would go here if not provided initialData
            } catch (error) {
                console.error("Failed to load supplier:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchSupplier();
        return () => { cancelled = true; };
    }, [open, supplierId, editData]);

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        router.refresh();
        if (onSuccess) onSuccess();
        onOpenChange(false);
        setEditData(undefined);
    };

    const handleClose = () => {
        onOpenChange(false);
        setEditData(undefined);
    };

    const isEditMode = !!supplierId || !!initialData || !!editData;
    const titleMode = isEditMode ? "Edit" : "Create";
    const title = `${titleMode} Supplier${(editData?.name || initialData?.name) ? ` — ${editData?.name || initialData?.name}` : ""}`;

    return (
        <FormDrawer
            open={open}
            onOpenChange={handleClose}
            title={title}
            subtitle={isEditMode ? "Update the details of this supplier" : "Enter details for a new supplier"}
        >
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-sm text-slate-500">Loading form...</span>
                </div>
            ) : (
                <div className="p-5 overflow-x-hidden">
                    <SupplierForm
                        key={supplierId || "new"}
                        initialData={editData || initialData}
                        onSuccess={handleSuccess}
                        onCancel={handleClose}
                        isDrawer
                    />
                </div>
            )}
        </FormDrawer>
    );
}
