"use client";

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
import { ArrowUpDown, Eye, Pencil, Check, Loader2, ChevronDown, RefreshCw, Filter, X, Search as SearchIcon, Download, Save, Trash2, Upload, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Account } from "../types";
import { AccountDetailDrawer } from "./AccountDetailDrawer";
import { OwnerPopover } from "@/components/shared/OwnerPopover";
import { ImportDataDialog, normalizeImportResult } from "@/components/shared/ImportDataDialog";
import { accountService } from "../services/accountService";
import { useDebounce } from "@/hooks/use-debounce";
import { validateInlineField, normalizePhoneValue, isPhoneField, type InlineField } from "@/lib/validation/inline-field-validation";
import { PhoneInput } from "@/components/ui/phone-input";

function EditableTextCell({
    account,
    field,
    displayFallback,
    placeholder,
    onSaved,
}: {
    account: Account;
    field: keyof Account;
    displayFallback?: string;
    placeholder?: string;
    onSaved: () => void;
}) {
    const initial = (account[field] as string) || "";
    const initialValue = initial || displayFallback || "";
    const displayValue = initial || displayFallback || placeholder || "-";
    const originalValue = initial;
    const [editing, setEditing] = React.useState(false);
    const [value, setValue] = React.useState(initialValue);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => setValue(initialValue), [initialValue]);

    const save = async () => {
        if (value === originalValue) {
            setEditing(false);
            return;
        }
        const validationError = validateInlineField(
            "person_account",
            field as InlineField,
            value
        );
        if (validationError) {
            toast.error(validationError);
            return;
        }
        const payloadValue = isPhoneField(field as string)
            ? normalizePhoneValue(value) ?? value.trim()
            : value.trim();
        setSaving(true);
        try {
            await accountService.updateSingleColumn(account.id, field as string, payloadValue);
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
                {isPhoneField(field as string) ? (
                    <PhoneInput
                        value={value}
                        onChange={setValue}
                        disabled={saving}
                        className="w-[200px]"
                    />
                ) : (
                    <Input
                        autoFocus
                        type={field === "email" ? "email" : "text"}
                        value={value}
                        disabled={saving}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") save();
                            if (e.key === "Escape") {
                                setValue(initialValue);
                                setEditing(false);
                            }
                        }}
                        className="h-7 w-44 text-sm"
                    />
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                </Button>
            </div>
        );
    }

    return (
        <div className="group/edit flex items-center gap-1.5 text-sm text-foreground">
            <span className="truncate">{displayValue}</span>
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

type AccountListView = { id: string; name: string; public_view?: boolean };

export function PersonAccountTable({
    data,
    pagination,
    views = [],
    activeViewId,
}: {
    data: Account[],
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    },
    views?: AccountListView[];
    activeViewId?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = React.useTransition();

    const [detailId, setDetailId] = React.useState<string | null>(null);
    const [detailOpen, setDetailOpen] = React.useState(false);
    const openDetail = React.useCallback((id: string) => {
        setDetailId(id);
        setDetailOpen(true);
    }, []);
    const refresh = React.useCallback(() => {
        startTransition(() => router.refresh());
    }, [router, startTransition]);

    // ── Saved list-view selector ──────────────────────────────────────────────
    const activeView = views.find((v) => v.id === activeViewId) || null;
    const applyView = React.useCallback((id: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (id) params.set("view_id", id);
        else params.delete("view_id");
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, [pathname, router, searchParams]);

    // ── Save a named view ─────────────────────────────────────────────────────
    const [saveViewOpen, setSaveViewOpen] = React.useState(false);
    const [viewName, setViewName] = React.useState("");
    const [savingView, setSavingView] = React.useState(false);
    const [vfOwner, setVfOwner] = React.useState("");
    const [vfCity, setVfCity] = React.useState("");
    const [vfSearch, setVfSearch] = React.useState("");
    const [vfPublic, setVfPublic] = React.useState(false);

    const openSaveView = () => {
        setVfOwner(searchParams.get("owner_id") ?? "");
        setVfCity(searchParams.get("billing_city") ?? "");
        setVfSearch(searchParams.get("search") ?? "");
        setVfPublic(false);
        setViewName("");
        setSaveViewOpen(true);
    };

    const viewFilterCount = (vfOwner ? 1 : 0) + (vfCity.trim() ? 1 : 0) + (vfSearch.trim() ? 1 : 0);

    const saveCurrentView = async () => {
        const name = viewName.trim();
        if (!name) {
            toast.error("Please enter a view name");
            return;
        }
        const filters: Record<string, string> = {};
        if (vfOwner) filters.owner_id = vfOwner;
        if (vfCity.trim()) filters.billing_city = vfCity.trim();
        if (vfSearch.trim()) filters.search = vfSearch.trim();
        setSavingView(true);
        try {
            const created = await accountService.createView(name, filters, true, vfPublic);
            toast.success("View saved");
            setSaveViewOpen(false);
            setViewName("");
            const params = new URLSearchParams();
            params.set("view_id", created.id);
            startTransition(() => router.push(`${pathname}?${params.toString()}`));
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Failed to save view");
        } finally {
            setSavingView(false);
        }
    };

    const deleteActiveView = async () => {
        if (!activeView) return;
        if (!confirm(`Delete the view "${activeView.name}"?`)) return;
        try {
            await accountService.deleteView(activeView.id);
            toast.success("View deleted");
            applyView(null);
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Failed to delete view");
        }
    };

    // ── Server-side search ────────────────────────────────────────────────────
    const [searchInput, setSearchInput] = React.useState(searchParams.get("search") ?? "");
    const debouncedSearch = useDebounce(searchInput, 400);
    const lastPushed = React.useRef(searchParams.get("search") ?? "");
    React.useEffect(() => {
        if (debouncedSearch === lastPushed.current) return;
        lastPushed.current = debouncedSearch;
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearch) params.set("search", debouncedSearch);
        else params.delete("search");
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, [debouncedSearch, pathname, router, searchParams]);

    // ── Filter popover (owner / city) ─────────────────────────────────────────
    const ownerFilter = searchParams.get("owner_id") ?? "";
    const cityFilter = searchParams.get("billing_city") ?? "";
    const hasActiveFilter = !!(ownerFilter || cityFilter);

    const { data: filterFormData } = useQuery({
        queryKey: ["account-form-data"],
        queryFn: () => accountService.getFormData(),
        staleTime: 5 * 60 * 1000,
    });
    const owners: { id: string; name: string }[] = filterFormData?.users || [];

    const applyFilter = React.useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, [pathname, router, searchParams]);

    const clearAllFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("owner_id");
        params.delete("billing_city");
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    };

    const [cityInput, setCityInput] = React.useState(cityFilter);
    const debouncedCity = useDebounce(cityInput, 400);
    const lastCity = React.useRef(cityFilter);
    React.useEffect(() => {
        if (debouncedCity === lastCity.current) return;
        lastCity.current = debouncedCity;
        applyFilter("billing_city", debouncedCity.trim());
    }, [debouncedCity, applyFilter]);

    // ── Bulk import + full server-side export ─────────────────────────────────
    const [importOpen, setImportOpen] = React.useState(false);
    const exportAll = async (format: "csv" | "xlsx") => {
        try {
            toast.info("Preparing export…");
            await accountService.exportAccounts(format, true);
            toast.success("Export downloaded");
        } catch {
            toast.error("Failed to export person accounts");
        }
    };

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

    const columns = React.useMemo<ColumnDef<Account>[]>(() => [
        {
            id: "first_name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    First Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            accessorFn: (row) => {
                if (row.first_name) return row.first_name;
                const parts = row.name?.split(" ") || [];
                if (parts[0] && ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof."].includes(parts[0])) {
                    return parts[1] || "";
                }
                return parts[0] || "";
            },
            cell: ({ row }) => {
                const account = row.original;
                let firstName = account.first_name;
                if (!firstName) {
                    const parts = account.name?.split(" ") || [];
                    if (parts[0] && ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof."].includes(parts[0])) {
                        firstName = parts[1] || "";
                    } else {
                        firstName = parts[0] || "";
                    }
                }
                return (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openDetail(account.id)}
                            title="Quick view"
                            className="flex-shrink-0 text-primary hover:text-primary/80"
                        >
                            <Eye className="h-4 w-4" />
                        </button>
                        <Link
                            href={`/person-accounts/${account.id}`}
                            className="font-medium text-primary hover:underline"
                        >
                            {firstName}
                        </Link>
                    </div>
                );
            },
        },
        {
            id: "last_name",
            header: "Last Name",
            accessorFn: (row) => {
                if (row.last_name) return row.last_name;
                const parts = row.name?.split(" ") || [];
                if (parts[0] && ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof."].includes(parts[0])) {
                    return parts.slice(2).join(" ");
                }
                return parts.length > 1 ? parts.slice(1).join(" ") : "";
            },
            cell: ({ row }) => {
                const account = row.original;
                let lastName = account.last_name;
                if (!lastName) {
                    const parts = account.name?.split(" ") || [];
                    if (parts[0] && ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof."].includes(parts[0])) {
                        lastName = parts.slice(2).join(" ");
                    } else {
                        lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
                    }
                }
                return (
                    <Link href={`/person-accounts/${account.id}`} className="font-medium text-primary hover:underline">
                        {lastName}
                    </Link>
                );
            },
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <EditableTextCell
                    account={row.original}
                    field="email"
                    placeholder="-"
                    onSaved={refresh}
                />
            ),
        },
        {
            accessorKey: "phone",
            header: "Phone",
            cell: ({ row }) => (
                <EditableTextCell
                    account={row.original}
                    field="phone"
                    placeholder="-"
                    onSaved={refresh}
                />
            ),
        },
        {
            accessorKey: "mobile",
            header: "Mobile",
            cell: ({ row }) => {
                return (
                    <EditableTextCell
                        account={row.original}
                        field="mobile"
                        placeholder="-"
                        onSaved={refresh}
                    />
                );
            },
        },
        {
            id: "owner",
            header: "Owner",
            cell: ({ row }) => (
                <OwnerPopover
                    ownerId={row.original.owner_id}
                    ownerName={row.original.owner_name}
                />
            ),
        },
    ], [openDetail, refresh]);

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
        },
    });

    return (
        <div className="w-full">
            <div className="flex flex-col gap-4 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground sm:h-10 sm:w-10">
                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary sm:text-xs">
                            Person Accounts
                        </div>
                        <div className="flex items-center gap-1.5">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary sm:text-lg"
                                        title="Switch list view"
                                    >
                                        {activeView ? activeView.name : "Recently Viewed"}
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="max-h-80 w-60 overflow-y-auto">
                                    <DropdownMenuItem
                                        onClick={() => applyView(null)}
                                        className={!activeView ? "font-semibold text-primary" : ""}
                                    >
                                        Recently Viewed
                                    </DropdownMenuItem>
                                    {views.length > 0 && <DropdownMenuSeparator />}
                                    {views.map((v) => (
                                        <DropdownMenuItem
                                            key={v.id}
                                            onClick={() => applyView(v.id)}
                                            className={v.id === activeViewId ? "font-semibold text-primary" : ""}
                                        >
                                            {v.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {activeView && (
                                <button
                                    type="button"
                                    onClick={() => applyView(null)}
                                    title="Clear view"
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    {/* Search */}
                    <div className="relative flex-shrink-0">
                        <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search person accounts..."
                            className="h-9 w-48 pl-8 text-sm"
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
                    <Button
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={refresh}
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                    </Button>

                    {/* Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={hasActiveFilter ? "default" : "outline"}
                                size="icon"
                                className="flex-shrink-0"
                                title="Filter"
                            >
                                <Filter className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 space-y-3">
                            <p className="text-sm font-semibold">Filter person accounts</p>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Owner</label>
                                <Select value={ownerFilter || "all"} onValueChange={(v) => applyFilter("owner_id", v === "all" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="All owners" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All owners</SelectItem>
                                        {owners.map((o) => (
                                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Billing city</label>
                                <div className="relative">
                                    <Input
                                        value={cityInput}
                                        onChange={(e) => setCityInput(e.target.value)}
                                        placeholder="e.g. Agra"
                                        className="h-9 text-sm"
                                    />
                                    {cityInput && (
                                        <button
                                            type="button"
                                            onClick={() => setCityInput("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {hasActiveFilter && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        setCityInput("");
                                        clearAllFilters();
                                    }}
                                >
                                    Clear all filters
                                </Button>
                            )}
                        </PopoverContent>
                    </Popover>

                    {/* Settings */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex-shrink-0">
                                Settings <ChevronDown className="w-4 h-4 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={refresh}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportAll("csv")}>
                                <Download className="mr-2 h-4 w-4" /> Export all (CSV)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setImportOpen(true)}>
                                <Upload className="mr-2 h-4 w-4" /> Import Person Accounts (CSV)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={openSaveView}>
                                <Save className="mr-2 h-4 w-4" /> Save view…
                            </DropdownMenuItem>
                            {activeView && (
                                <DropdownMenuItem
                                    onClick={deleteActiveView}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete view “{activeView.name}”
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className={`crm-surface rounded-md transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
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
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No person accounts found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 border-t px-4 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    Showing {data.length} of {pagination.total} records
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
            {/* Save a named view */}
            <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save view</DialogTitle>
                        <DialogDescription>
                            Name the view and choose which person accounts it should show. It
                            will appear in the “All records” dropdown for quick access.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">View name</label>
                            <Input
                                autoFocus
                                value={viewName}
                                onChange={(e) => setViewName(e.target.value)}
                                placeholder="e.g. Delhi customers"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Owner</label>
                                <Select value={vfOwner || "all"} onValueChange={(v) => setVfOwner(v === "all" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Any owner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any owner</SelectItem>
                                        {owners.map((o) => (
                                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Billing city</label>
                                <Input
                                    value={vfCity}
                                    onChange={(e) => setVfCity(e.target.value)}
                                    placeholder="e.g. Agra"
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-medium text-muted-foreground">Search text</label>
                                <Input
                                    value={vfSearch}
                                    onChange={(e) => setVfSearch(e.target.value)}
                                    placeholder="name / email / phone"
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 rounded-md border border-border/60 p-3">
                            <p className="text-xs font-medium text-muted-foreground">Who sees this view?</p>
                            <div className="flex items-center gap-2">
                                <Switch checked={vfPublic} onCheckedChange={(v: boolean) => setVfPublic(v)} />
                                <span className="text-sm">
                                    {vfPublic ? "All users in your team" : "Only me"}
                                </span>
                            </div>
                        </div>
                        {viewFilterCount === 0 && (
                            <p className="text-xs text-amber-600">
                                No filters set — this view will show all person accounts.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveViewOpen(false)} disabled={savingView}>
                            Cancel
                        </Button>
                        <Button onClick={saveCurrentView} disabled={savingView || !viewName.trim()}>
                            {savingView ? "Saving..." : "Save view"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AccountDetailDrawer
                accountId={detailId}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />

            {/* Bulk import (CSV/Excel) with sample download */}
            <ImportDataDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                entityLabel="Person Accounts"
                importFn={async (file) => normalizeImportResult(await accountService.importAccounts(file, true))}
                downloadSampleFn={() => accountService.downloadImportSample(true)}
                onImported={refresh}
                checklist={[
                    "Columns must match the downloaded sample — First Name and Last Name are required.",
                    "Phone/Mobile format: +<country code> <10 digits> (e.g. +91 9876543210).",
                    "Duplicate person accounts (same email or mobile) are skipped and reported below.",
                ]}
            />
        </div>
    );
}
