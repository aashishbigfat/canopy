"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { FormDrawer } from "@/components/shared/FormDrawer";
import { OpportunityForm } from "./OpportunityForm";
import { OpportunityEditForm } from "./OpportunityEditForm";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { Opportunity } from "../types";
import { useRouter } from "next/navigation";

interface OpportunityFormDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** For edit mode */
    opportunity?: Opportunity;
    opportunityId?: string;
    /** Pre-loaded stages for edit mode */
    stages?: any[];
    /** For create mode */
    initialAccountId?: string;
    initialContactId?: string;
}

export function OpportunityFormDrawer({
    open,
    onOpenChange,
    opportunity,
    opportunityId,
    stages,
    initialAccountId,
    initialContactId,
}: OpportunityFormDrawerProps) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [editData, setEditData] = useState<Opportunity | undefined>(opportunity);
    const [editStages, setEditStages] = useState<any[] | undefined>(stages);

    const isEdit = !!opportunityId;

    // Fetch opportunity + stages for edit mode whenever drawer opens
    useEffect(() => {
        if (!open || !isEdit) return;

        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [oppResponse, stagesResponse] = await Promise.all([
                    opportunitiesService.getOpportunity(opportunityId),
                    editStages ? Promise.resolve(null) : opportunitiesService.getSalesStages(),
                ]);
                if (cancelled) return;
                if (oppResponse) setEditData(oppResponse);
                if (stagesResponse) setEditStages(stagesResponse);
            } catch (error) {
                console.error("Failed to load opportunity data:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [open, isEdit, opportunityId]);

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        if (opportunityId) {
            queryClient.invalidateQueries({ queryKey: ["opportunities", opportunityId] });
        }
        router.refresh();
        onOpenChange(false);
        setEditData(undefined);
    };

    const handleClose = () => {
        onOpenChange(false);
        setEditData(undefined);
    };

    const title = isEdit
        ? `Edit Opportunity${editData ? ` — ${editData.name}` : ""}`
        : "Create Opportunity";

    return (
        <FormDrawer
            open={open}
            onOpenChange={handleClose}
            title={title}
            subtitle={isEdit ? "Update opportunity details" : "Create a new opportunity"}
        >
            {isEdit ? (
                loading || !editData || !editStages ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading form...</span>
                    </div>
                ) : (
                    <div className="p-5">
                        <OpportunityEditForm
                            key={opportunityId}
                            opportunity={editData}
                            stages={editStages}
                            onSuccess={handleSuccess}
                            onCancel={handleClose}
                            isDrawer
                        />
                    </div>
                )
            ) : (
                <div className="p-5">
                    <OpportunityForm
                        initialAccountId={initialAccountId}
                        initialContactId={initialContactId}
                        onSuccess={handleSuccess}
                        onCancel={handleClose}
                        isDrawer
                    />
                </div>
            )}
        </FormDrawer>
    );
}
