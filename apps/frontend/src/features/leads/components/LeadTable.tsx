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
import { ArrowUpDown, Filter, MoreHorizontal, Settings, ChevronDown, CheckCircle2, RefreshCw, X, Search as SearchIcon, Download, Save, Trash2, Loader2, Check, Upload, Pencil } from "lucide-react";

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
import { ImportLeadsDialog } from "./ImportLeadsDialog";
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
import { customFieldsService, type EntityType } from "@/lib/api/services/field-registry.service";
import { ListViewSelector, ListViewSettings, type ViewPreset } from "@/features/views/ListViewMenu";
import { ListViewFilterButton } from "@/features/views/ListViewFilterButton";
import { buildEntityColumns, type ViewLookups } from "@/features/views/accountColumnFactory";
import { buildLookupOptions, standardFieldByKey } from "@/features/views/accountFields";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { validateInlineField, normalizePhoneValue, isPhoneField } from "@/lib/validation/inline-field-validation";
import { PhoneInput } from "@/components/ui/phone-input";

import { leadsService } from "@/lib/api/services/leads.service";

// ─── Inline-editable text cell for Lead table ─────────────────────────────────
function EditableLeadCell({
    lead,
    field,
    href,
    type = "text",
    placeholder,
    onSaved,
}: {
    lead: Lead;
    field: "first_name" | "last_name" | "email" | "phone";
    href?: string;
    type?: string;
    placeholder?: string;
    onSaved: () => void;
}) {
    const initial = (lead[field] as string) || "";
    const [editing, setEditing] = React.useState(false);
    const [value, setValue] = React.useState(initial);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => setValue(initial), [initial]);

    const save = async () => {
        if (value === initial) {
            setEditing(false);
            return;
        }
        const validationError = validateInlineField("lead", field, value);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        const payloadValue = isPhoneField(field) ? normalizePhoneValue(value) ?? value.trim() : value.trim();
        setSaving(true);
        try {
            await leadsService.updateLead(lead.id, { [field]: payloadValue });
            toast.success("Updated");
            setEditing(false);
            onSaved();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Failed to update");
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <div className="flex items-center gap-1">
                {isPhoneField(field) ? (
                    <PhoneInput
                        value={value}
                        onChange={setValue}
                        disabled={saving}
                        className="w-[200px]"
                    />
                ) : (
                    <Input
                        autoFocus
                        type={type}
                        value={value}
                        disabled={saving}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") save();
                            if (e.key === "Escape") {
                                setValue(initial);
                                setEditing(false);
                            }
                        }}
                        className="h-7 w-40 text-sm"
                    />
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} disabled={saving}>
                    {saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Check className="h-3 w-3 text-green-500" />
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className="group/edit flex items-center gap-1.5">
            {href ? (
                <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                >
                    {initial || placeholder || "-"}
                </Link>
            ) : (
                <span className="text-sm text-muted-foreground">{initial || placeholder || "-"}</span>
            )}
            <button
                type="button"
                onClick={() => setEditing(true)}
                className="opacity-0 transition-opacity group-hover/edit:opacity-100"
                title="Edit"
            >
                <Pencil className="h-3 w-3 text-primary" />
            </button>
        </div>
    );
}


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
            cell: ({ row, table }) => {
                const lead = row.original;
                const refresh = () => {
                    const meta = table.options.meta as any;
                    if (meta?.refresh) meta.refresh();
                };
                return (
                    <EditableLeadCell
                        lead={lead}
                        field="first_name"
                        href={`/leads/${lead.id}`}
                        onSaved={refresh}
                    />
                );
            },
        },
        {
            accessorKey: "last_name",
            header: "Last Name",
            cell: ({ row, table }) => {
                const lead = row.original;
                const refresh = () => {
                    const meta = table.options.meta as any;
                    if (meta?.refresh) meta.refresh();
                };
                return (
                    <EditableLeadCell
                        lead={lead}
                        field="last_name"
                        onSaved={refresh}
                    />
                );
            },
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row, table }) => {
                const lead = row.original;
                const refresh = () => {
                    const meta = table.options.meta as any;
                    if (meta?.refresh) meta.refresh();
                };
                return (
                    <EditableLeadCell
                        lead={lead}
                        field="email"
                        type="email"
                        onSaved={refresh}
                    />
                );
            },
        },
        {
            accessorKey: "phone",
            header: "Phone",
            cell: ({ row, table }) => {
                const lead = row.original;
                const refresh = () => {
                    const meta = table.options.meta as any;
                    if (meta?.refresh) meta.refresh();
                };
                return (
                    <EditableLeadCell
                        lead={lead}
                        field="phone"
                        onSaved={refresh}
                    />
                );
            },
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
        total: number | null;
        per_page: number;
        pages: number | null;
    };
    lead_statuses: LeadStatus[];
    sources: Source[];
    users: User[];
    experiences: { id: string; name: string }[];
    sales_stages: { id: string; name: string }[];
    source_mediums?: { id: string; name: string }[];
    industries?: { id: string; name: string }[];
    isLoading?: boolean;
    onSelectOne?: (id: string, checked: boolean) => void;
    onSelectAll?: (checked: boolean) => void;
    selectedIds?: string[];
    // Keyset "load more" (infinite scroll).
    hasMore?: boolean;
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
}

export function LeadTable({
    data,
    pagination,
    lead_statuses,
    sources,
    users,
    experiences,
    sales_stages,
    source_mediums = [],
    industries = [],
    isLoading = false,
    onSelectOne,
    onSelectAll,
    selectedIds = [],
    hasMore = false,
    onLoadMore,
    isLoadingMore = false,
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
    const [isImportOpen, setIsImportOpen] = React.useState(false);

    // ── List-view manager (saved views + filters + Select Fields) ─────────────
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const entity: EntityType = "lead";
    const { data: savedViews = [] } = useQuery({
        queryKey: ["entity-views", "lead"],
        queryFn: () => entityViewsService.listViews("lead"),
        staleTime: 60_000,
    });
    const viewId = searchParams.get("view_id") ?? "";
    const activeView = savedViews.find((v) => v.id === viewId) || null;
    const { data: leadCustomFields = [] } = useQuery({
        queryKey: ["custom-fields", entity],
        queryFn: () => customFieldsService.list(entity, true),
        staleTime: 5 * 60 * 1000,
    });
    const fieldLabels = React.useMemo(() => {
        const m = new Map<string, string>();
        standardFieldByKey(entity).forEach((f, k) => m.set(k, f.label));
        leadCustomFields.forEach((f) => m.set("additional:" + f.id, f.label || f.name));
        return m;
    }, [leadCustomFields]);
    const toMapLV = (arr: { id: string; name: string }[]) => new Map(arr.map((o) => [o.id, o.name]));
    const viewLookups = React.useMemo<ViewLookups>(() => ({
        users: toMapLV(users.map((u) => ({ id: u.id, name: u.name }))),
        lead_statuses: toMapLV(lead_statuses),
        sources: toMapLV(sources),
        source_mediums: toMapLV(source_mediums),
        industries: toMapLV(industries),
        destinations: destinationMap,
    }), [users, lead_statuses, sources, source_mediums, industries, destinationMap]);
    const lookupOptions = React.useMemo(() => buildLookupOptions(entity, {
        users: users.map((u) => ({ id: u.id, name: u.name })),
        lead_statuses, sources, source_mediums, industries,
        destinations: Array.from(destinationMap, ([id, name]) => ({ id, name })),
    }), [users, lead_statuses, sources, source_mediums, industries, destinationMap]);

    const columns = React.useMemo<ColumnDef<Lead>[]>(() => {
        const selectCol: ColumnDef<Lead> = {
            id: "select",
            header: () => (
                <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === data.length}
                    onCheckedChange={(value) => { if (onSelectAll) onSelectAll(!!value); }}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedIds.includes(row.original.id)}
                    onCheckedChange={(value) => { if (onSelectOne) onSelectOne(row.original.id, !!value); }}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        };

        // Active view with explicit display columns → render those.
        if (activeView?.display_columns?.length) {
            return [
                selectCol,
                ...(buildEntityColumns(activeView.display_columns, fieldLabels, {
                    entity,
                    openDetail: undefined,
                    lookups: viewLookups,
                }) as ColumnDef<Lead>[]),
            ];
        }

        const baseColumns = getColumns(lead_statuses, sources, users, experiences, industry, destinationMap);
        if (baseColumns[0].id === "select") baseColumns[0] = selectCol;
        return baseColumns;
    }, [lead_statuses, sources, users, experiences, industry, destinationMap, selectedIds, onSelectOne, onSelectAll, data.length, activeView, fieldLabels, viewLookups]);

    const table = useReactTable({
        data,
        columns,
        pageCount: pagination.pages ?? undefined,
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
            },
            refresh: () => {
                queryClient.invalidateQueries({ queryKey: ["leads"] });
                router.refresh();
            },
        }
    });

    const pathname = usePathname();
    const router = useRouter();

    const total = pagination.total ?? table.getRowModel().rows.length;
    const currentView = searchParams.get("view") || "today";

    const leadViews: ViewPreset[] = [
        { label: "Today Leads", value: "today" },
        { label: "Recently Viewed", value: "recent" },
        { label: "All Leads", value: "all" },
        { label: "Yesterday Leads", value: "yesterday" },
        { label: "Last Week Leads", value: "last_week" },
        { label: "WhatsApp Enquiry Leads", value: "whatsapp" },
        { label: "lead check count", value: "lead_check_count" },
    ];

    const currentViewLabel =
        leadViews.find((v) => v.value === currentView)?.label || "Today Leads";

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

    // Full server-side export of all visible leads (not just the current page)
    const exportAll = async (format: "csv" | "xlsx") => {
        try {
            toast.info("Preparing export…");
            await leadsService.exportLeads(format);
            toast.success("Export downloaded");
        } catch {
            toast.error("Failed to export leads");
        }
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
                                <ListViewSelector entity={entity} presets={leadViews} presetLabel="Today Leads" className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent" />
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

                            {/* Filter — view-aware */}
                            <ListViewFilterButton entity={entity} lookupOptions={lookupOptions} />

                            {/* Settings (context-aware list-view manager + data actions) */}
                            <ListViewSettings
                                entity={entity}
                                lookupOptions={lookupOptions}
                                extra={
                                    <>
                                        <DropdownMenuItem onClick={refresh}>
                                            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => exportAll("csv")}>
                                            <Download className="mr-2 h-4 w-4" /> Export all (CSV)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                                            <Upload className="mr-2 h-4 w-4" /> Import Leads (CSV)
                                        </DropdownMenuItem>
                                    </>
                                }
                            />
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
                    <div>
                        {hasMore ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onLoadMore?.()}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</>
                                ) : (
                                    "Load more"
                                )}
                            </Button>
                        ) : (
                            <span className="text-xs text-muted-foreground">All records loaded</span>
                        )}
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

            <ImportLeadsDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
            />

        </LoadingState>
    );
}
