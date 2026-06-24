"use client";

import { useState, useEffect, useRef } from "react";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    Plus,
    LayoutGrid,
    Loader2,
    RotateCw,
    Settings as SettingsIcon,
    Filter as FilterIcon,
    Kanban as KanbanIcon,
    FileDown,
    Lightbulb,
    ChevronDown,
    Save,
    Trash2,
    X,
    Search as SearchIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupedOpportunityTable } from "@/features/opportunities/components/GroupedOpportunityTable";
import { KanbanBoard } from "@/features/opportunities/components/KanbanBoard";
import { useInfiniteOpportunities, useSalesStages } from "@/features/opportunities/api/useOpportunities";
import { Opportunity } from "@/features/opportunities/types";
import { cn } from "@/lib/utils";
import { normalizeSalesStages } from "@/features/opportunities/utils/stageConfig";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OpportunityFormDrawer } from "@/features/opportunities/components/OpportunityFormDrawer";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useIndustryLabels } from "@/lib/industry-labels";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { entityViewsService } from "@/lib/api/services/entity-views.service";
import { accountService } from "@/features/accounts/services/accountService";
import { destinationsService } from "@/lib/api/services/destinations.service";
import { ListViewSelector, ListViewSettings, type ViewPreset } from "@/features/views/ListViewMenu";
import { ListViewFilterButton } from "@/features/views/ListViewFilterButton";
import { buildLookupOptions, standardFieldByKey } from "@/features/views/accountFields";
import { buildEntityColumns, type ViewLookups } from "@/features/views/accountColumnFactory";
import { DynamicListTable } from "@/features/views/DynamicListTable";
import { customFieldsService } from "@/lib/api/services/field-registry.service";
import * as React from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

type ViewMode = "list" | "kanban";

export default function OpportunitiesPageClient() {
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [groupByOwner, setGroupByOwner] = useState(true);
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
    const router = useRouter();
    const backfillRan = useRef(false);

    // One-time backfill: assign opportunity_number to any existing opportunities
    // that pre-date the feature. Safe to call repeatedly — backend skips already-numbered ones.
    useEffect(() => {
        if (backfillRan.current) return;
        backfillRan.current = true;
        opportunitiesService.backfillOpportunityNumbers().catch(() => {/* silent — non-critical */});
    }, []);
    const searchParams = useSearchParams();
    const labels = useIndustryLabels();

    const opportunityViews: ViewPreset[] = [
        { label: `Today ${labels.opportunities}`, value: "today" },
        { label: "Recently Viewed", value: "recent" },
        { label: `All ${labels.opportunities}`, value: "all" },
        { label: `Closed ${labels.opportunities}`, value: "closed" },
    ];
    const currentView = searchParams.get("view") || searchParams.get("filter") || "today";
    const currentViewLabel = opportunityViews.find(v => v.value === currentView)?.label || `Today ${labels.opportunities}`;

    const pathname = usePathname();
    const queryClient = useQueryClient();

    // URL-driven filters (saved views apply server-side)
    const search = searchParams.get("search") || undefined;
    const ownerFilter = searchParams.get("owner_id") || "";
    const stageFilter = searchParams.get("sales_stage_id") || "";
    const viewId = searchParams.get("view_id") || "";
    const hasActiveFilter = !!(ownerFilter || stageFilter);

    const {
        data: infinite,
        isLoading: isLoadingOpportunities,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteOpportunities({
        per_page: 100, // chunk size for "load more" (kanban groups the accumulated rows)
        // When a saved view is active, let its stored filters drive the query
        view: viewId ? undefined : currentView,
        view_id: viewId || undefined,
        search,
        owner_id: ownerFilter || undefined,
        sales_stage_id: stageFilter || undefined,
    });
    const { data: stages, isLoading: isLoadingStages } = useSalesStages();

    // Flatten the loaded pages; total comes from the first (offset) page.
    const opportunities = infinite ? infinite.pages.flatMap((p) => p.opportunities) : [];
    const totalCount = infinite?.pages[0]?.total ?? null;
    const normalizedStages = normalizeSalesStages(stages || []);

    // ── Saved views + owners (for the toolbar) ────────────────────────────────
    const { data: savedViews = [] } = useQuery({
        queryKey: ["entity-views", "opportunity"],
        queryFn: () => entityViewsService.listViews("opportunity"),
        staleTime: 60_000,
    });
    const activeView = savedViews.find((v) => v.id === viewId) || null;

    const { data: ownerFormData } = useQuery({
        queryKey: ["account-form-data"],
        queryFn: () => accountService.getFormData(),
        staleTime: 5 * 60 * 1000,
    });
    const owners: { id: string; name: string }[] = ownerFormData?.users || [];

    const { data: destinationsData } = useQuery({
        queryKey: ["destinations", "all"],
        queryFn: () => destinationsService.getDestinations({ limit: 1000 }),
        staleTime: 10 * 60 * 1000,
    });
    const destinationOptions: { id: string; name: string }[] =
        destinationsData?.destinations?.map((d) => ({ id: d.id, name: d.name })) || [];

    // field_key → value options for the Edit List Filters dropdowns.
    const lookupOptions = buildLookupOptions("opportunity", {
        users: owners,
        sales_stages: normalizedStages.map((s: any) => ({ id: s.id, name: s.name })),
        destinations: destinationOptions,
    });

    // Dynamic "Select Fields to display" columns for the flat list view.
    const { data: oppCustomFields = [] } = useQuery({
        queryKey: ["custom-fields", "opportunity"],
        queryFn: () => customFieldsService.list("opportunity", true),
        staleTime: 5 * 60 * 1000,
    });
    const oppFieldLabels = React.useMemo(() => {
        const m = new Map<string, string>();
        standardFieldByKey("opportunity").forEach((f, k) => m.set(k, f.label));
        oppCustomFields.forEach((f) => m.set("additional:" + f.id, f.label || f.name));
        return m;
    }, [oppCustomFields]);
    const oppViewLookups = React.useMemo<ViewLookups>(() => {
        const toM = (arr: { id: string; name: string }[]) => new Map(arr.map((o) => [o.id, o.name]));
        return {
            users: toM(owners),
            sales_stages: toM(normalizedStages.map((s: any) => ({ id: s.id, name: s.name }))),
            destinations: toM(destinationOptions),
        };
    }, [owners, normalizedStages, destinationOptions]);
    const dynamicOppColumns = React.useMemo(() => {
        if (!activeView?.display_columns?.length) return null;
        return buildEntityColumns(activeView.display_columns, oppFieldLabels, {
            entity: "opportunity",
            lookups: oppViewLookups,
        });
    }, [activeView, oppFieldLabels, oppViewLookups]);

    const setParams = (mut: (p: URLSearchParams) => void) => {
        const params = new URLSearchParams(searchParams.toString());
        mut(params);
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
    };
    const applySavedView = (id: string | null) => setParams((p) => { if (id) p.set("view_id", id); else p.delete("view_id"); });
    const applyFilter = (key: string, value: string) => setParams((p) => { if (value) p.set(key, value); else p.delete(key); });
    const clearFilters = () => setParams((p) => { p.delete("owner_id"); p.delete("sales_stage_id"); });
    const refresh = () => router.refresh();

    const [searchInput, setSearchInput] = useState(search || "");
    const debouncedSearch = useDebounce(searchInput, 400);
    const lastSearch = useRef(search || "");
    useEffect(() => {
        if (debouncedSearch === lastSearch.current) return;
        lastSearch.current = debouncedSearch;
        setParams((p) => { if (debouncedSearch) p.set("search", debouncedSearch); else p.delete("search"); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    // ── Save view dialog ──────────────────────────────────────────────────────
    const [saveOpen, setSaveOpen] = useState(false);
    const [vName, setVName] = useState("");
    const [vOwner, setVOwner] = useState("");
    const [vStage, setVStage] = useState("");
    const [vSearch, setVSearch] = useState("");
    const [vPublic, setVPublic] = useState(false);
    const [savingView, setSavingView] = useState(false);
    const openSaveView = () => { setVOwner(ownerFilter); setVStage(stageFilter); setVSearch(search || ""); setVPublic(false); setVName(""); setSaveOpen(true); };
    const viewFilterCount = (vOwner ? 1 : 0) + (vStage ? 1 : 0) + (vSearch.trim() ? 1 : 0);
    const saveView = async () => {
        const name = vName.trim();
        if (!name) { toast.error("Please enter a view name"); return; }
        const filters: Record<string, string> = {};
        if (vOwner) filters.owner_id = vOwner;
        if (vStage) filters.sales_stage_id = vStage;
        if (vSearch.trim()) filters.search = vSearch.trim();
        setSavingView(true);
        try {
            const created = await entityViewsService.createView("opportunity", { name, filters, is_public: vPublic });
            toast.success("View saved");
            queryClient.invalidateQueries({ queryKey: ["entity-views", "opportunity"] });
            setSaveOpen(false);
            applySavedView(created.id);
        } catch { toast.error("Failed to save view"); }
        finally { setSavingView(false); }
    };
    const deleteActiveView = async () => {
        if (!activeView) return;
        if (!confirm(`Delete the view "${activeView.name}"?`)) return;
        try {
            await entityViewsService.deleteView("opportunity", activeView.id);
            toast.success("View deleted");
            queryClient.invalidateQueries({ queryKey: ["entity-views", "opportunity"] });
            applySavedView(null);
        } catch { toast.error("Failed to delete view"); }
    };
    // Client-side CSV of the rows currently loaded (page 1 + any "Load more").
    // With keyset pagination there's no "page N", so this exports what's loaded;
    // the menu label reflects that. (A full server-side export would be a
    // separate streaming endpoint — infeasible to do client-side at scale.)
    const exportCsv = () => {
        if (opportunities.length === 0) {
            toast.info("Nothing to export yet.");
            return;
        }
        const headers = ["Opportunity", "Account", "Stage", "Amount", "Close Date", "Owner"];
        const rows = opportunities.map((o: any) => [
            o.name, o.account_name, o.sales_stage_name, o.amount, o.close_date, o.owner_name,
        ]);
        const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `opportunities_${opportunities.length}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleOpportunityClick = (opportunity: Opportunity) => {
        router.push(`/opportunities/${opportunity.id}`);
    };

    const isLoading = isLoadingOpportunities || isLoadingStages;


    return (
        <div className="crm-page">
            <div className="crm-surface space-y-4 rounded-b-none border-b-0 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-primary p-2 text-primary-foreground">
                            <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-primary">
                                {labels.opportunity} ({opportunities.length})
                            </div>
                            <ListViewSelector entity="opportunity" presets={opportunityViews} presetLabel={currentViewLabel} />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={`Search ${labels.opportunities.toLowerCase()}...`}
                                className="h-9 w-44 pl-8 text-sm"
                            />
                            {searchInput && (
                                <button type="button" onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            title={groupByOwner ? "Show all opportunities" : "Group by owner"}
                            className={cn(
                                "h-9 w-9 transition-colors",
                                groupByOwner
                                    ? "border-primary bg-primary text-white hover:bg-primary/90"
                                    : "border-border bg-muted/70 text-foreground hover:bg-accent"
                            )}
                            onClick={() => setGroupByOwner(prev => !prev)}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <PermissionGate permission="create_opportunity">
                            <Button 
                                className="h-9 gap-2 px-4 shadow-sm"
                                onClick={() => setIsCreateDrawerOpen(true)}
                            >
                                    <Plus className="h-4 w-4" />
                                    New {labels.opportunity}
                            </Button>
                        </PermissionGate>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-border bg-card text-foreground hover:bg-accent" onClick={refresh} title="Refresh">
                            <RotateCw className="h-4 w-4" />
                        </Button>
                        {/* Filter — view-aware (Edit List Filters for the active view) */}
                        <ListViewFilterButton entity="opportunity" lookupOptions={lookupOptions} />

                        {/* Settings — Select Fields renders the flat DynamicListTable (list mode);
                            the grouped/kanban layouts apply when a view has no chosen columns. */}
                        <ListViewSettings
                            entity="opportunity"
                            lookupOptions={lookupOptions}
                            extra={
                                <>
                                    <DropdownMenuItem onClick={refresh}><RotateCw className="mr-2 h-4 w-4" /> Refresh</DropdownMenuItem>
                                    <DropdownMenuItem onClick={exportCsv}><FileDown className="mr-2 h-4 w-4" /> Export loaded ({opportunities.length}) to CSV</DropdownMenuItem>
                                </>
                            }
                        />
                        <Button
                            variant={viewMode === "kanban" ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-9 px-3 gap-1.5 font-medium",
                                viewMode === "kanban"
                                    ? "bg-secondary text-secondary-foreground"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                            onClick={() => setViewMode(viewMode === "kanban" ? "list" : "kanban")}
                        >
                            <KanbanIcon className="h-3.5 w-3.5" />
                            Kanban
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="crm-surface overflow-hidden rounded-t-none border-t-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : viewMode === "kanban" ? (
                    <div>
                        <KanbanBoard
                            opportunities={opportunities}
                            stages={normalizedStages}
                            onOpportunityClick={handleOpportunityClick}
                        />
                        <div className="flex items-center justify-center border-t bg-muted/30 px-4 py-3">
                            {hasNextPage ? (
                                <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                                    {isFetchingNextPage ? "Loading…" : `Load more (${opportunities.length} loaded)`}
                                </Button>
                            ) : (
                                <span className="text-xs text-muted-foreground">All {opportunities.length} loaded</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        {dynamicOppColumns ? (
                            <DynamicListTable<any>
                                data={opportunities}
                                columns={dynamicOppColumns}
                                onRowClick={handleOpportunityClick}
                            />
                        ) : (
                            <GroupedOpportunityTable
                                data={opportunities}
                                onOpportunityClick={handleOpportunityClick}
                                groupByOwner={groupByOwner}
                            />
                        )}

                        <div className="flex flex-col gap-2 space-x-0 border-t bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-2 sm:px-6">
                            <div className="text-sm font-medium text-muted-foreground">
                                Showing {opportunities.length}
                                {totalCount != null ? ` of ${totalCount}` : "+"} records
                            </div>
                            <div>
                                {hasNextPage ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3 font-medium"
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                    >
                                        {isFetchingNextPage ? "Loading…" : "Load more"}
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">All records loaded</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <OpportunityFormDrawer
                open={isCreateDrawerOpen}
                onOpenChange={setIsCreateDrawerOpen}
                stages={normalizedStages}
            />

        </div>
    );
}
