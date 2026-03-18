"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { FormDrawer } from "@/components/shared/FormDrawer";
import { OpportunityForm } from "./OpportunityForm";
import { OpportunityEditForm } from "./OpportunityEditForm";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { Opportunity } from "../types";

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
    const [loading, setLoading] = useState(false);
    const [editData, setEditData] = useState<Opportunity | undefined>(opportunity);
    const [editStages, setEditStages] = useState<any[] | undefined>(stages);

    const isEdit = !!opportunityId;

    // Fetch opportunity + stages for edit mode if not pre-loaded
    useEffect(() => {
        if (!open || !isEdit) return;
        if (editData && editStages) return;

        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                const promises: Promise<any>[] = [];
                promises.push(
                    editData ? Promise.resolve(null) : opportunitiesService.getOpportunity(opportunityId)
                );
                promises.push(
                    editStages ? Promise.resolve(null) : opportunitiesService.getSalesStages()
                );
                const [oppResponse, stagesResponse] = await Promise.all(promises);
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
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        <span className="ml-2 text-sm text-slate-500">Loading form...</span>
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
