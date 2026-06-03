"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Filter, MoreHorizontal, Settings, ChevronDown, CheckCircle2, RefreshCw, X, Search as SearchIcon, Download, Save, Trash2, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Lead, LeadStatus, Source, User } from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LoadingState, LoadingTable } from "@/components/ui/loading";
import Link from "next/link";
import { ConvertLeadDialog } from "./ConvertLeadDialog";
import { useIndustry, type IndustryType } from "@/lib/industry-labels";
import { getSegmentBadgeClass, getSegmentLabel } from "@/lib/segments";
import { destinationsService } from "@/lib/api/services/destinations.service";
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
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { entityViewsService } from "@/lib/api/services/entity-views.service";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

export const getColumns = (
    statuses: LeadStatus[],
    sources: Source[],
    users: User[],
    experiences: { id: string; name: string }[],
    industry: IndustryType = "travel",
    destinationMap: Map<string, string> = new Map()
): ColumnDef<Lead>[] => {
    // Industry-specific columns that replace travel columns
    const industryColumns: ColumnDef<Lead>[] = industry === "travel" ? [
        {
            id: "travel_date",
            header: "Travel Date",
            cell: ({ row }) => {
                const travelDate = row.original.industry_data?.travel_date;
                return <div className="text-sm text-muted-foreground">{travelDate ? travelDate : "-"}</div>;
            },
        },
        {
            id: "no_of_pax",
            header: "No of Pax",
            cell: ({ row }) => {
                const pax = row.original.industry_data?.no_of_pax;
                return <div className="text-sm text-muted-foreground">{pax ?? "-"}</div>;
            },
        },
        {
            id: "destinations",
            header: "Destination(s)",
            cell: ({ row }) => {
                const idata = row.original.industry_data;

                // 1. Prefer client-side resolution via destinationMap (most reliable)
                const ids: string[] = idata?.destination_ids || [];
                if (ids.length > 0 && destinationMap.size > 0) {
                    const resolved = ids
                        .map((id: string) => destinationMap.get(id))
                        .filter(Boolean) as string[];
                    if (resolved.length > 0) {
                        return <div className="text-sm text-muted-foreground">{resolved.join(", ")}</div>;
                    }
                }

                // 2. Fall back to server-resolved destination_names
                const names = idata?.destination_names;
                if (Array.isArray(names) && names.length > 0) {
                    return <div className="text-sm text-muted-foreground">{names.join(", ")}</div>;
                }

                // 3. Fall back to destinations field (TravelLeadData schema name list)
                const dests = idata?.destinations;
                if (Array.isArray(dests) && dests.length > 0) {
                    return <div className="text-sm text-muted-foreground">{dests.join(", ")}</div>;
                }

                return <div className="text-sm text-muted-foreground">-</div>;
            },
        },
        {
            id: "experience",
            header: "Experience",
            cell: ({ row }) => {
                const experienceId = row.original.industry_data?.experience_id;
                const experience = experiences.find(e => e.id === experienceId || e.name === experienceId);
                return <div className="text-sm text-muted-foreground">{experience?.name || experienceId || "-"}</div>;
            },
        },
    ] : industry === "healthcare" ? [
        {
            id: "chief_complaint",
            header: "Chief Complaint",
            cell: ({ row }) => {
                const data = (row.original as any).industry_data;
                return <div className="text-sm text-muted-foreground">{data?.chief_complaint || "-"}</div>;
            },
        },
        {
            id: "urgency",
            header: "Urgency",
            cell: ({ row }) => {
                const data = (row.original as any).industry_data;
                return <div className="text-sm text-muted-foreground capitalize">{data?.urgency || "-"}</div>;
            },
        },
    ] : industry === "education" ? [
        {
            id: "qualification",
            header: "Qualification",
            cell: ({ row }) => {
                const data = (row.original as any).industry_data;
                return <div className="text-sm text-muted-foreground">{data?.highest_qualification || "-"}</div>;
            },
        },
        {
            id: "start_date",
            header: "Start Date",
            cell: ({ row }) => {
                const data = (row.original as any).industry_data;
                return <div className="text-sm text-muted-foreground">{data?.preferred_start_date || "-"}</div>;
            },
        },
    ] : industry === "manufacturing" ? [
        {
            id: "rfq_number",
            header: "RFQ Number",
            cell: ({ row }) => {
                const data = (row.original as any).industry_data;
                return <div className="text-sm text-muted-foreground">{data?.rfq_number || "-"}</div>;
            },
        },
        {
            id: "product_category",
            header: "Product Category",
            cell: ({ row }) => {
                const data = (row.original as any).industry_data;
                return <div className="text-sm text-muted-foreground">{data?.product_category || "-"}</div>;
            },
        },
    ] : [];

    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "first_name",
            header: "First Name",
            cell: ({ row }) => {
                const lead = row.original;
                return (
                    <Link
                        href={`/leads/${lead.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                    >
                        {lead.first_name}
                    </Link>
                );
            },
        },
        {
            accessorKey: "last_name",
            header: "Last Name",
            cell: ({ row }) => {
                const lead = row.original;
                return (
                    <Link
                        href={`/leads/${lead.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                    >
                        {lead.last_name || "-"}
                    </Link>
                );
            },
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {row.original.email || "-"}
                </div>
            ),
        },
        {
            accessorKey: "phone",
            header: "Phone",
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {row.original.phone || row.original.mobile || "-"}
                </div>
            ),
        },
        {
            accessorKey: "city",
            header: "City of Origin",
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {row.original.city || "-"}
                </div>
            ),
        },
        {
            id: "new_status",
            header: "New",
            cell: ({ row }) => {
                const statusId = row.original.lead_status_id;
                const status = statuses.find(s => s.id === statusId);
                const label = status?.name || "New";
                return <div className="text-sm font-medium text-foreground">{label}</div>;
            },
        },
        ...industryColumns,
        {
            id: "segment",
            header: "Segment",
            cell: ({ row }) => {
                // Default to "B2C" — matches the Lead model default and ensures badge always shows
                const segment = row.original.segment || (row.original.custom_fields as any)?.segment || "B2C";
                return (
                    <Badge variant={segment === "B2C" ? "secondary" : "outline"} className={getSegmentBadgeClass(segment)}>
                        {getSegmentLabel(segment)}
                    </Badge>
                );
            },
        },
        {
            id: "source_medium",
            header: "Source Medium",
            cell: ({ row }) => {
                const sourceId = row.original.source_id;
                let sourceMedium = "-";
                if (sourceId) {
                    const matchedSource = sources.find(s => s.id === sourceId);
                    sourceMedium = matchedSource ? matchedSource.name : sourceId;
                } else if (row.original.creation_type) {
                    sourceMedium = row.original.creation_type;
                }
                return <div className="capitalize text-sm text-muted-foreground">{sourceMedium}</div>;
            },
        },
        {
            id: "convert",
            header: "Convert Lead",
            enableHiding: false,
            cell: ({ row, table }) => {
                const lead = row.original;

                if (lead.is_converted) {
                    return (
                        <div className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Converted</span>
                        </div>
                    );
                }

                return (
                    <Button
                        size="sm"
                        variant="default"
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        onClick={() => {
                            const tableMeta = table.options.meta as any;
                            if (tableMeta?.onConvert) {
                                tableMeta.onConvert(lead);
                            }
                        }}
                    >
                        Convert
                    </Button>
                );
            },
        },
    ];
};

interface LeadTableProps {
    data: Lead[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    lead_statuses: LeadStatus[];
    sources: Source[];
    users: User[];
    experiences: { id: string; name: string }[];
    sales_stages: { id: string; name: string }[];
    isLoading?: boolean;
    onSelectOne?: (id: string, checked: boolean) => void;
    onSelectAll?: (checked: boolean) => void;
    selectedIds?: string[];
}

export function LeadTable({
    data,
    pagination,
    lead_statuses,
    sources,
    users,
    experiences,
    sales_stages,
    isLoading = false,
    onSelectOne,
    onSelectAll,
    selectedIds = []
}: LeadTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [isPending, startTransition] = React.useTransition();
    const industry = useIndustry();
    const isTravel = industry === "travel";

    // Build a destination id→name map for client-side resolution (same approach as experiences)
    const [destinationMap, setDestinationMap] = React.useState<Map<string, string>>(new Map());
    React.useEffect(() => {
        if (!isTravel) return;
        destinationsService.getDestinations({ limit: 500 })
            .then(res => {
                const map = new Map<string, string>();
                res.destinations.forEach(d => map.set(d.id, d.name));
                setDestinationMap(map);
            })
            .catch(() => { /* non-critical — fall back to server names */ });
    }, [isTravel]);

    const rowSelection = React.useMemo(() => {
        const selection: Record<string, boolean> = {};
        selectedIds.forEach(id => {
            const index = data.findIndex(d => d.id === id);
            if (index >= 0) {
                selection[index] = true;
            }
        });
        return selection;
    }, [selectedIds, data]);

    const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
    const [isConvertOpen, setIsConvertOpen] = React.useState(false);

    const columns = React.useMemo(() => {
        const baseColumns = getColumns(lead_statuses, sources, users, experiences, industry, destinationMap);

        if (baseColumns[0].id === "select") {
            baseColumns[0] = {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            selectedIds.length > 0 && selectedIds.length === data.length
                        }
                        onCheckedChange={(value) => {
                            if (onSelectAll) onSelectAll(!!value);
                        }}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={selectedIds.includes(row.original.id)}
                        onCheckedChange={(value) => {
                            if (onSelectOne) onSelectOne(row.original.id, !!value);
                        }}
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            };
        }

        return baseColumns;
    }, [lead_statuses, sources, users, experiences, industry, destinationMap, selectedIds, onSelectOne, onSelectAll, data.length]);

    const table = useReactTable({
        data,
        columns,
        pageCount: pagination.pages,
        manualPagination: true,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        meta: {
            onConvert: (lead: Lead) => {
                setSelectedLead(lead);
                setIsConvertOpen(true);
            }
        }
    });

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const total = pagination.total ?? table.getRowModel().rows.length;
    const currentView = searchParams.get("view") || "today";

    const leadViews = [
        { label: "Today Leads", value: "today" },
        { label: "Recently Viewed", value: "recent" },
        { label: "All Leads", value: "all" },
        { label: "Todays Lead", value: "todays_lead" },
        { label: "Yesterday Leads", value: "yesterday" },
        { label: "Last Week Leads", value: "last_week" },
        { label: "WhatsApp Enquiry Leads", value: "whatsapp" },
        { label: "lead check count", value: "lead_check_count" },
    ];

    const currentViewLabel =
        leadViews.find((v) => v.value === currentView)?.label || "Today Leads";

    // ── Saved views (lead-scoped EntityViews) ─────────────────────────────────
    const queryClient = useQueryClient();
    const { data: savedViews = [] } = useQuery({
        queryKey: ["entity-views", "lead"],
        queryFn: () => entityViewsService.listViews("lead"),
        staleTime: 60_000,
    });
    const viewId = searchParams.get("view_id") ?? "";
    const activeView = savedViews.find((v) => v.id === viewId) || null;

    const setParams = React.useCallback((mut: (p: URLSearchParams) => void) => {
        const params = new URLSearchParams(searchParams.toString());
        mut(params);
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, [pathname, router, searchParams]);

    const applyPreset = (v: string) => setParams((p) => { p.set("view", v); p.delete("view_id"); });
    const applySavedView = (id: string | null) => setParams((p) => { if (id) { p.set("view_id", id); p.delete("view"); } else p.delete("view_id"); });

    // ── Structured filters (owner / status) ───────────────────────────────────
    const ownerFilter = searchParams.get("owner_id") ?? "";
    const statusFilter = searchParams.get("lead_status_id") ?? "";
    const hasActiveFilter = !!(ownerFilter || statusFilter);
    const applyFilter = (key: string, value: string) => setParams((p) => { if (value) p.set(key, value); else p.delete(key); });
    const clearFilters = () => setParams((p) => { p.delete("owner_id"); p.delete("lead_status_id"); });

    // ── Search (debounced, server-side) ───────────────────────────────────────
    const currentSearch = searchParams.get("search") ?? "";
    const [searchInput, setSearchInput] = React.useState(currentSearch);
    const debouncedSearch = useDebounce(searchInput, 400);
    const lastSearch = React.useRef(currentSearch);
    React.useEffect(() => {
        if (debouncedSearch === lastSearch.current) return;
        lastSearch.current = debouncedSearch;
        setParams((p) => { if (debouncedSearch) p.set("search", debouncedSearch); else p.delete("search"); });
    }, [debouncedSearch, setParams]);

    const refresh = () => startTransition(() => router.refresh());

    // ── Save view dialog ──────────────────────────────────────────────────────
    const [saveOpen, setSaveOpen] = React.useState(false);
    const [vName, setVName] = React.useState("");
    const [vOwner, setVOwner] = React.useState("");
    const [vStatus, setVStatus] = React.useState("");
    const [vSearch, setVSearch] = React.useState("");
    const [vPublic, setVPublic] = React.useState(false);
    const [savingView, setSavingView] = React.useState(false);

    const openSaveView = () => {
        setVOwner(ownerFilter);
        setVStatus(statusFilter);
        setVSearch(currentSearch);
        setVPublic(false);
        setVName("");
        setSaveOpen(true);
    };
    const viewFilterCount = (vOwner ? 1 : 0) + (vStatus ? 1 : 0) + (vSearch.trim() ? 1 : 0);

    const saveView = async () => {
        const name = vName.trim();
        if (!name) { toast.error("Please enter a view name"); return; }
        const filters: Record<string, string> = {};
        if (vOwner) filters.owner_id = vOwner;
        if (vStatus) filters.lead_status_id = vStatus;
        if (vSearch.trim()) filters.search = vSearch.trim();
        setSavingView(true);
        try {
            const created = await entityViewsService.createView("lead", { name, filters, is_public: vPublic });
            toast.success("View saved");
            queryClient.invalidateQueries({ queryKey: ["entity-views", "lead"] });
            setSaveOpen(false);
            applySavedView(created.id);
        } catch {
            toast.error("Failed to save view");
        } finally {
            setSavingView(false);
        }
    };

    const deleteActiveView = async () => {
        if (!activeView) return;
        if (!confirm(`Delete the view "${activeView.name}"?`)) return;
        try {
            await entityViewsService.deleteView("lead", activeView.id);
            toast.success("View deleted");
            queryClient.invalidateQueries({ queryKey: ["entity-views", "lead"] });
            applySavedView(null);
        } catch {
            toast.error("Failed to delete view");
        }
    };

    // ── CSV export (current page) ─────────────────────────────────────────────
    const exportCsv = () => {
        const statusName = (id?: string) => lead_statuses.find((s) => s.id === id)?.name || "";
        const headers = ["First Name", "Last Name", "Email", "Phone", "City", "Status"];
        const rows = data.map((l) => [
            (l as any).first_name, (l as any).last_name, l.email, l.phone, (l as any).city, statusName((l as any).lead_status_id),
        ]);
        const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leads-page-${pagination.current_page}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <LoadingState isLoading={isLoading} fallback={<LoadingTable rows={10} columns={12} />}>
            <div className="w-full">
                <div className="mb-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b px-4 py-3">
                        <div className="flex flex-col gap-1">
                            <div className="text-sm font-semibold">
                                Leads ({total})
                            </div>
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1"
                                        >
                                            {activeView ? activeView.name : currentViewLabel}
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">Presets</DropdownMenuLabel>
                                        {leadViews.map((view) => (
                                            <DropdownMenuItem
                                                key={view.value}
                                                onClick={() => applyPreset(view.value)}
                                                className={!activeView && currentView === view.value ? "font-semibold text-primary" : ""}
                                            >
                                                {view.label}
                                            </DropdownMenuItem>
                                        ))}
                                        {savedViews.length > 0 && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-xs text-muted-foreground">Saved views</DropdownMenuLabel>
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
                            {/* Search */}
                            <div className="relative">
                                <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search leads..."
                                    className="h-9 w-44 pl-8 text-sm"
                                />
                                {searchInput && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchInput("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Refresh */}
                            <Button variant="outline" size="icon" onClick={refresh} title="Refresh">
                                <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                            </Button>

                            {/* Filter */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={hasActiveFilter ? "default" : "outline"}
                                        size="icon"
                                        aria-label="Filter leads"
                                        title="Filter"
                                    >
                                        <Filter className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-72 space-y-3">
                                    <p className="text-sm font-semibold">Filter leads</p>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground">Owner</label>
                                        <Select value={ownerFilter || "all"} onValueChange={(v) => applyFilter("owner_id", v === "all" ? "" : v)}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All owners" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All owners</SelectItem>
                                                {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground">Status</label>
                                        <Select value={statusFilter || "all"} onValueChange={(v) => applyFilter("lead_status_id", v === "all" ? "" : v)}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All statuses</SelectItem>
                                                {lead_statuses.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {hasActiveFilter && (
                                        <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
                                            Clear all filters
                                        </Button>
                                    )}
                                </PopoverContent>
                            </Popover>

                            {/* Settings */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-1">
                                        <Settings className="h-4 w-4" /> Settings <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={refresh}>
                                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={exportCsv}>
                                        <Download className="mr-2 h-4 w-4" /> Export page (CSV)
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={openSaveView}>
                                        <Save className="mr-2 h-4 w-4" /> Save view…
                                    </DropdownMenuItem>
                                    {activeView && (
                                        <DropdownMenuItem onClick={deleteActiveView} className="text-red-600 focus:text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete view “{activeView.name}”
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="px-4 py-3">
                        <div className={`rounded-md border transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                            <Table>
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                data-state={row.getIsSelected() && "selected"}
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length}
                                                className="h-24 text-center"
                                            >
                                                No results.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end space-x-0 sm:space-x-2 py-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set("page", (pagination.current_page - 1).toString());
                                startTransition(() => {
                                    router.push(`${pathname}?${params.toString()}`);
                                });
                            }}
                            disabled={pagination.current_page <= 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set("page", (pagination.current_page + 1).toString());
                                startTransition(() => {
                                    router.push(`${pathname}?${params.toString()}`);
                                });
                            }}
                            disabled={pagination.current_page >= pagination.pages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
            {selectedLead && (
                <ConvertLeadDialog
                    lead={selectedLead}
                    open={isConvertOpen}
                    onOpenChange={setIsConvertOpen}
                    users={users}
                    experiences={experiences}
                    sales_stages={sales_stages}
                />
            )}

            {/* Save a named view */}
            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save view</DialogTitle>
                        <DialogDescription>
                            Name the view and choose which leads it should show.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">View name</label>
                            <Input autoFocus value={vName} onChange={(e) => setVName(e.target.value)} placeholder="e.g. Hot leads" />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Owner</label>
                                <Select value={vOwner || "all"} onValueChange={(v) => setVOwner(v === "all" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any owner" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any owner</SelectItem>
                                        {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Status</label>
                                <Select value={vStatus || "all"} onValueChange={(v) => setVStatus(v === "all" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any status</SelectItem>
                                        {lead_statuses.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-medium text-muted-foreground">Search text</label>
                                <Input value={vSearch} onChange={(e) => setVSearch(e.target.value)} placeholder="name / email / phone" className="h-9 text-sm" />
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
                            <p className="text-xs text-amber-600">No filters set — this view will show all leads.</p>
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
        </LoadingState>
    );
}
