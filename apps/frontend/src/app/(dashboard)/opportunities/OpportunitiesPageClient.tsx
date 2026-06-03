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
import { useOpportunities, useSalesStages } from "@/features/opportunities/api/useOpportunities";
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
    
    const page = parseInt(searchParams.get("page") || "1");
    const defaultView = searchParams.get("view") || searchParams.get("filter") || "today";

    const opportunityViews = [
        { label: `Today ${labels.opportunities}`, value: "today" },
        { label: "Recently Viewed", value: "recent" },
        { label: `All ${labels.opportunities}`, value: "all" },
        { label: `Closed ${labels.opportunities}`, value: "closed" },
    ];
    const [currentView, setCurrentView] = useState(defaultView);
    const currentViewLabel = opportunityViews.find(v => v.value === currentView)?.label || opportunityViews.find(v => v.value === "today")?.label || `Today ${labels.opportunities}`;

    const pathname = usePathname();
    const queryClient = useQueryClient();

    // URL-driven filters (saved views apply server-side)
    const search = searchParams.get("search") || undefined;
    const ownerFilter = searchParams.get("owner_id") || "";
    const stageFilter = searchParams.get("sales_stage_id") || "";
    const viewId = searchParams.get("view_id") || "";
    const hasActiveFilter = !!(ownerFilter || stageFilter);

    const { data: opportunitiesData, isLoading: isLoadingOpportunities } = useOpportunities({
        page: page,
        per_page: 100, // Get more for kanban view
        // When a saved view is active, let its stored filters drive the query
        view: viewId ? undefined : currentView,
        view_id: viewId || undefined,
        search,
        owner_id: ownerFilter || undefined,
        sales_stage_id: stageFilter || undefined,
    });
    const { data: stages, isLoading: isLoadingStages } = useSalesStages();

    const opportunities = opportunitiesData?.opportunities || [];
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
    const exportCsv = () => {
        const headers = ["Opportunity", "Stage", "Amount", "Close Date", "Owner"];
        const rows = opportunities.map((o: any) => [o.name, o.sales_stage_name, o.amount, o.close_date, o.owner_name]);
        const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `opportunities-page-${page}.csv`;
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
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex cursor-pointer items-center gap-2 text-lg font-semibold text-foreground transition-colors hover:text-primary">
                                        {activeView ? activeView.name : currentViewLabel}
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-y-auto">
                                    {opportunityViews.map((view) => (
                                        <DropdownMenuItem
                                            key={view.value}
                                            onClick={() => { applySavedView(null); setCurrentView(view.value); }}
                                            className={!activeView && currentView === view.value ? "font-semibold text-primary" : ""}
                                        >
                                            {view.label}
                                        </DropdownMenuItem>
                                    ))}
                                    {savedViews.length > 0 && (
                                        <>
                                            <DropdownMenuSeparator />
                                            {savedViews.map((v) => (
                                                <DropdownMenuItem
                                                    key={v.id}
                                                    onClick={() => applySavedView(v.id)}
                                                    className={v.id === viewId ? "font-semibold text-primary" : ""}
                                                >
                                                    {v.name}
                                                    {v.is_public && <span className="ml-1 text-[10px] text-muted-foreground">(team)</span>}
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={hasActiveFilter ? "default" : "outline"} size="icon" className="h-9 w-9" title="Filter">
                                    <FilterIcon className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 space-y-3">
                                <p className="text-sm font-semibold">Filter {labels.opportunities.toLowerCase()}</p>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Owner</label>
                                    <Select value={ownerFilter || "all"} onValueChange={(v) => applyFilter("owner_id", v === "all" ? "" : v)}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All owners" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All owners</SelectItem>
                                            {owners.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Sales stage</label>
                                    <Select value={stageFilter || "all"} onValueChange={(v) => applyFilter("sales_stage_id", v === "all" ? "" : v)}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All stages" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All stages</SelectItem>
                                            {normalizedStages.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {hasActiveFilter && (
                                    <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>Clear all filters</Button>
                                )}
                            </PopoverContent>
                        </Popover>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 gap-1 font-medium">
                                    <SettingsIcon className="h-4 w-4" /> Settings <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={refresh}><RotateCw className="mr-2 h-4 w-4" /> Refresh</DropdownMenuItem>
                                <DropdownMenuItem onClick={exportCsv}><FileDown className="mr-2 h-4 w-4" /> Export page (CSV)</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={openSaveView}><Save className="mr-2 h-4 w-4" /> Save view…</DropdownMenuItem>
                                {activeView && (
                                    <DropdownMenuItem onClick={deleteActiveView} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete view “{activeView.name}”
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    <KanbanBoard
                        opportunities={opportunities}
                        stages={normalizedStages}
                        onOpportunityClick={handleOpportunityClick}
                    />
                ) : (
                    <div className="w-full overflow-x-auto">
                        <GroupedOpportunityTable
                            data={opportunities}
                            onOpportunityClick={handleOpportunityClick}
                            groupByOwner={groupByOwner}
                        />
                        
                        <div className="flex flex-col gap-2 space-x-0 border-t bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-2 sm:px-6">
                            <div className="text-sm font-medium text-muted-foreground">
                                Showing {opportunities.length} of {opportunitiesData?.total || 0} records
                            </div>
                            <div className="space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 font-medium"
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set("page", (page - 1).toString());
                                        router.push(`${window.location.pathname}?${params.toString()}`);
                                    }}
                                    disabled={page <= 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 font-medium"
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set("page", (page + 1).toString());
                                        router.push(`${window.location.pathname}?${params.toString()}`);
                                    }}
                                    disabled={!opportunitiesData || page >= opportunitiesData.pages}
                                >
                                    Next
                                </Button>
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

            {/* Save a named view */}
            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save view</DialogTitle>
                        <DialogDescription>
                            Name the view and choose which {labels.opportunities.toLowerCase()} it should show.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">View name</label>
                            <Input autoFocus value={vName} onChange={(e) => setVName(e.target.value)} placeholder="e.g. My pipeline" />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Owner</label>
                                <Select value={vOwner || "all"} onValueChange={(v) => setVOwner(v === "all" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any owner" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any owner</SelectItem>
                                        {owners.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Sales stage</label>
                                <Select value={vStage || "all"} onValueChange={(v) => setVStage(v === "all" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any stage" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any stage</SelectItem>
                                        {normalizedStages.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-medium text-muted-foreground">Search text</label>
                                <Input value={vSearch} onChange={(e) => setVSearch(e.target.value)} placeholder="opportunity name" className="h-9 text-sm" />
                            </div>
                        </div>
                        <div className="space-y-2 rounded-md border border-border/60 p-3">
                            <p className="text-xs font-medium text-muted-foreground">Who sees this view?</p>
                            <div className="flex items-center gap-2">
                                <Switch checked={vPublic} onCheckedChange={(v: boolean) => setVPublic(v)} />
                                <span className="text-sm">{vPublic ? "All users in your team" : "Only me"}</span>
                            </div>
                        </div>
                        {viewFilterCount === 0 && (
                            <p className="text-xs text-amber-600">No filters set — this view will show all {labels.opportunities.toLowerCase()}.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={savingView}>Cancel</Button>
                        <Button onClick={saveView} disabled={savingView || !vName.trim()}>
                            {savingView ? "Saving..." : "Save view"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
