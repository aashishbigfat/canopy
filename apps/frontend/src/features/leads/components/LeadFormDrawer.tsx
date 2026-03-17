"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { FormDrawer } from "@/components/shared/FormDrawer";
import { LeadForm } from "./LeadForm";
import { leadsService } from "@/lib/api/services/leads.service";
import { Lead } from "../types";

interface LeadFormDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** For edit mode — pass the lead data */
    initialData?: Lead;
    /** For edit mode — pass the lead id */
    leadId?: string;
    /** Pre-loaded metadata from the list page (avoids re-fetching) */
    metadata?: {
        statuses: any[];
        sources: any[];
        industries: any[];
        experiences: any[];
    };
}

export function LeadFormDrawer({
    open,
    onOpenChange,
    initialData,
    leadId,
    metadata,
}: LeadFormDrawerProps) {
    const queryClient = useQueryClient();
    const [metadataState, setMetadataState] = useState(metadata || null);
    const [loading, setLoading] = useState(false);
    const [editData, setEditData] = useState<Lead | undefined>(initialData);

    const isEdit = !!leadId;

    // Fetch metadata if not provided, and lead data for edit mode
    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            try {
                const promises: Promise<any>[] = [];

                // Fetch metadata if not pre-loaded
                if (!metadataState) {
                    promises.push(leadsService.getLeads({ per_page: 1 }));
                } else {
                    promises.push(Promise.resolve(null));
                }

                // Fetch lead data for edit mode if not provided
                if (isEdit && !editData) {
                    promises.push(leadsService.getLead(leadId));
                } else {
                    promises.push(Promise.resolve(null));
                }

                const [metaResponse, leadResponse] = await Promise.all(promises);

                if (cancelled) return;

                if (metaResponse) {
                    setMetadataState({
                        statuses: metaResponse.lead_statuses || [],
                        sources: metaResponse.sources || [],
                        industries: metaResponse.industries || [],
                        experiences: metaResponse.experiences || [],
                    });
                }

                if (leadResponse) {
                    setEditData(leadResponse);
                }
            } catch (error) {
                console.error("Failed to load form data:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [open, isEdit, leadId]);

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        onOpenChange(false);
        // Reset edit data for next use
        setEditData(undefined);
    };

    const handleClose = () => {
        onOpenChange(false);
        setEditData(undefined);
    };

    const title = isEdit
        ? `Edit Lead${editData ? ` — ${editData.first_name || ""} ${editData.last_name || ""}`.trim() : ""}`
        : "Create Lead";

    return (
        <FormDrawer
            open={open}
            onOpenChange={handleClose}
            title={title}
            subtitle={isEdit ? "Update the details of this lead" : "Enter lead details to start tracking"}
        >
            {loading || !metadataState ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-sm text-slate-500">Loading form...</span>
                </div>
            ) : (
                <LeadForm
                    key={leadId || "create"}
                    initialData={editData}
                    leadId={leadId}
                    statuses={metadataState.statuses}
                    sources={metadataState.sources}
                    industries={metadataState.industries}
                    experiences={metadataState.experiences}
                    onSuccess={handleSuccess}
                    onCancel={handleClose}
                    isDrawer
                />
            )}
        </FormDrawer>
    );
}
