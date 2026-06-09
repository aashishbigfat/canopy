"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
    Plus,
    Trash2,
    Loader2
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useIndustryLabels } from "@/lib/industry-labels";

import { LeadTable } from "@/features/leads/components/LeadTable";
import { useLeads } from "@/features/leads/api/useLeads";
import { leadsService } from "@/lib/api/services/leads.service";
import { LeadFormDrawer } from "@/features/leads/components/LeadFormDrawer";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function LeadsClientPage() {
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const labels = useIndustryLabels();
    // Selection state
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

    const page = parseInt(searchParams.get("page") || "1");
    const per_page = parseInt(searchParams.get("per_page") || "100");
    const search = searchParams.get("search") || undefined;
    const view = searchParams.get("view") || undefined;
    const view_id = searchParams.get("view_id") || undefined;
    const owner_id = searchParams.get("owner_id") || undefined;
    const lead_status_id = searchParams.get("lead_status_id") || undefined;

    const { data: response, isLoading, error } = useLeads({
        page,
        per_page,
        search,
        view,
        view_id,
        owner_id,
        lead_status_id,
    });

    // Bulk Delete Mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: leadsService.bulkDelete,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success(`Successfully deleted ${data.deleted} leads`);
            setSelectedLeads([]);
        },
        onError: () => {
            toast.error("Failed to delete selected leads");
        },
    });



    const handleSelectLead = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedLeads(prev => [...prev, id]);
        } else {
            setSelectedLeads(prev => prev.filter(lid => lid !== id));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked && response) {
            setSelectedLeads(response.leads.map(l => l.id));
        } else {
            setSelectedLeads([]);
        }
    };

    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedLeads.length} leads? This action cannot be undone.`)) {
            bulkDeleteMutation.mutate(selectedLeads);
        }
    };



    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{labels.leads}</h1>
                        <p className="text-muted-foreground">
                            Track and manage your potential business opportunities.
                        </p>
                    </div>
                    <PermissionGate permission="create_lead">
                        <Button onClick={() => setIsCreateDrawerOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create {labels.lead}
                        </Button>
                    </PermissionGate>
                </div>
                <div className="p-8 text-center text-red-600">
                    Failed to load leads. Please try again.
                </div>
            </div>
        );
    }

    if (isLoading || !response) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                        <p className="text-muted-foreground">
                            Track and manage your potential business opportunities.
                        </p>
                    </div>
                    <Button disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                    </Button>
                </div>
                <div className="p-8 text-center text-muted-foreground">
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="crm-page">
            <div className="crm-surface flex flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Leads</h1>
                    <p className="text-sm text-muted-foreground">
                        Track and manage your potential business opportunities.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {selectedLeads.length > 0 && (
                        <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-4">
                            <span className="text-sm text-muted-foreground mr-2">
                                {selectedLeads.length} selected
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                disabled={bulkDeleteMutation.isPending}
                            >
                                {bulkDeleteMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                            </Button>
                        </div>
                    )}

                    <PermissionGate permission="create_lead">
                        <Button onClick={() => setIsCreateDrawerOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create {labels.lead}
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            <div className="crm-surface overflow-hidden">
                <LeadTable
                    data={response.leads}
                    pagination={response.pagination}
                    lead_statuses={response.lead_statuses}
                    sources={response.sources}
                    users={response.users}
                    experiences={response.experiences}
                    sales_stages={response.sales_stages}
                    isLoading={isLoading}
                    selectedIds={selectedLeads}
                    onSelectOne={handleSelectLead}
                    onSelectAll={handleSelectAll}
                />
            </div>

            <LeadFormDrawer
                open={isCreateDrawerOpen}
                onOpenChange={setIsCreateDrawerOpen}
                metadata={response ? {
                    statuses: response.lead_statuses || [],
                    sources: response.sources || [],
                    source_mediums: response.source_mediums || [],
                    industries: response.industries || [],
                    experiences: response.experiences || [],
                } : undefined}
            />
        </div>
    );
}

