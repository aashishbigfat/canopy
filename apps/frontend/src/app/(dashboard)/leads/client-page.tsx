"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
    Plus,
    Trash2,
    Users,
    Loader2
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";

import { LeadTable } from "@/features/leads/components/LeadTable";
import { useLeads } from "@/features/leads/api/useLeads";
import { leadsService } from "@/lib/api/services/leads.service";
import { LeadFormDrawer } from "@/features/leads/components/LeadFormDrawer";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function LeadsClientPage() {
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    // Selection state
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [isBulkChangeOwnerOpen, setIsBulkChangeOwnerOpen] = useState(false);
    const [selectedNewOwner, setSelectedNewOwner] = useState<string>("");
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

    const page = parseInt(searchParams.get("page") || "1");
    const per_page = parseInt(searchParams.get("per_page") || "100");
    const search = searchParams.get("search") || undefined;
    const view = searchParams.get("view") || undefined;

    const { data: response, isLoading, error } = useLeads({
        page,
        per_page,
        search,
        view,
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

    // Bulk Change Owner Mutation
    const bulkChangeOwnerMutation = useMutation({
        mutationFn: ({ ids, newOwnerId }: { ids: string[], newOwnerId: string }) =>
            leadsService.bulkChangeOwner(ids, newOwnerId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success(`Successfully updated owner for ${data.updated} leads`);
            setSelectedLeads([]);
            setIsBulkChangeOwnerOpen(false);
            setSelectedNewOwner("");
        },
        onError: () => {
            toast.error("Failed to update owner for selected leads");
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

    const handleBulkChangeOwner = () => {
        if (!selectedNewOwner) return;
        bulkChangeOwnerMutation.mutate({
            ids: selectedLeads,
            newOwnerId: selectedNewOwner
        });
    };

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                        <p className="text-muted-foreground">
                            Track and manage your potential business opportunities.
                        </p>
                    </div>
                    <PermissionGate permission="create_lead">
                        <Button onClick={() => setIsCreateDrawerOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Lead
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
                <div className="flex items-center justify-between">
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground">
                        Track and manage your potential business opportunities.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedLeads.length > 0 && (
                        <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-4">
                            <span className="text-sm text-muted-foreground mr-2">
                                {selectedLeads.length} selected
                            </span>

                            <Dialog open={isBulkChangeOwnerOpen} onOpenChange={setIsBulkChangeOwnerOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Users className="mr-2 h-4 w-4" />
                                        Change Owner
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Change Owner</DialogTitle>
                                        <DialogDescription>
                                            Assign {selectedLeads.length} selected leads to a new owner.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Label htmlFor="new-owner">New Owner</Label>
                                        <SearchableSelect
                                            options={response.users.map((user) => ({
                                                label: user.name,
                                                value: user.id
                                            }))}
                                            value={selectedNewOwner}
                                            onValueChange={setSelectedNewOwner}
                                            placeholder="Select user..."
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsBulkChangeOwnerOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleBulkChangeOwner}
                                            disabled={!selectedNewOwner || bulkChangeOwnerMutation.isPending}
                                        >
                                            {bulkChangeOwnerMutation.isPending ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                "Update Owner"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

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
                                Create Lead
                        </Button>
                    </PermissionGate>
                </div>
            </div>

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

            <LeadFormDrawer
                open={isCreateDrawerOpen}
                onOpenChange={setIsCreateDrawerOpen}
                metadata={response ? {
                    statuses: response.lead_statuses || [],
                    sources: response.sources || [],
                    industries: response.industries || [],
                    experiences: response.experiences || [],
                } : undefined}
            />
        </div>
    );
}

