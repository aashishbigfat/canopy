"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    ChevronDown,
    Eye,
    Briefcase,
    RefreshCw,
    Filter,
    X,
    Search as SearchIcon,
    Pencil,
    Check,
    Loader2,
    Download,
    GitMerge,
    Save,
    Trash2,
    Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CreateAccountButton } from "./CreateAccountButton";
import { accountService } from "../services/accountService";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { OwnerPopover } from "@/components/shared/OwnerPopover";
import { ImportDataDialog, normalizeImportResult } from "@/components/shared/ImportDataDialog";
import { useDebounce } from "@/hooks/use-debounce";
import { validateInlineField, normalizePhoneValue, isPhoneField, type InlineField } from "@/lib/validation/inline-field-validation";
import { PhoneInput } from "@/components/ui/phone-input";

// ─── Inline-editable text cell (phone) ────────────────────────────────────────

function EditableTextCell({
    account,
    field,
    placeholder,
    onSaved,
}: {
    account: Account;
    field: keyof Account;
    placeholder?: string;
    onSaved: () => void;
}) {
    const initial = (account[field] as string) || "";
    const [editing, setEditing] = React.useState(false);
    const [value, setValue] = React.useState(initial);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => setValue(initial), [initial]);

    const save = async () => {
        if (value === initial) {
            setEditing(false);
            return;
        }
        const validationError = validateInlineField(
            "account",
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
                        className="h-7 w-36 text-sm"
                    />
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                </Button>
            </div>
        );
    }

    return (
        <div className="group/edit flex items-center gap-1.5 text-muted-foreground">
            <span>{initial || placeholder || "-"}</span>
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

// ─── Inline-editable account-type cell (select) ───────────────────────────────

function EditableTypeCell({ account, onSaved }: { account: Account; onSaved: () => void }) {
    const [editing, setEditing] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [selectedId, setSelectedId] = React.useState<string | undefined>(account.acc_type_id);

    React.useEffect(() => setSelectedId(account.acc_type_id), [account.acc_type_id]);

    const { data: formData } = useQuery({
        queryKey: ["account-form-data"],
        queryFn: () => accountService.getFormData(),
        enabled: editing,
        staleTime: 5 * 60 * 1000,
    });
    const types: { id: string; name: string }[] = formData?.account_types || [];

    const save = async () => {
        if (!selectedId || selectedId === account.acc_type_id) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            await accountService.updateSingleColumn(account.id, "acc_type_id", selectedId);
            toast.success("Account type updated");
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
                <Select value={selectedId} onValueChange={setSelectedId} disabled={saving}>
                    <SelectTrigger className="h-7 w-44 text-sm">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        {types.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                </Button>
            </div>
        );
    }

    return (
        <div className="group/edit flex items-center gap-1.5 text-muted-foreground">
            <span>{account.account_type_name || "-"}</span>
            <button
                type="button"
                onClick={() => setEditing(true)}
                className="opacity-0 transition-opacity group-hover/edit:opacity-100"
                title="Edit account type"
            >
                <Pencil className="h-3 w-3 text-primary" />
            </button>
        </div>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

type AccountListView = { id: string; name: string; public_view?: boolean };

export function AccountTable({
    data,
    pagination,
    views = [],
    activeViewId,
}: {
    data: Account[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    views?: AccountListView[];
    activeViewId?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = React.useTransition();

    // ── Saved list-view selector ("Recently Viewed" dropdown) ─────────────────
    const activeView = views.find((v) => v.id === activeViewId) || null;
    const applyView = React.useCallback((id: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (id) params.set("view_id", id);
        else params.delete("view_id");
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, [pathname, router, searchParams]);

    // ── Save a named view (pick filters right here in the dialog) ─────────────
    const [saveViewOpen, setSaveViewOpen] = React.useState(false);
    const [viewName, setViewName] = React.useState("");
    const [savingView, setSavingView] = React.useState(false);
    // Filter criteria for the view being saved (seeded from any active filters).
    const [vfOwner, setVfOwner] = React.useState("");
    const [vfType, setVfType] = React.useState("");
    const [vfCity, setVfCity] = React.useState("");
    const [vfSearch, setVfSearch] = React.useState("");
    const [vfPublic, setVfPublic] = React.useState(false);

    const openSaveView = () => {
        // Pre-fill with whatever is currently applied to the list.
        setVfOwner(searchParams.get("owner_id") ?? "");
        setVfType(searchParams.get("acc_type_id") ?? "");
        setVfCity(searchParams.get("billing_city") ?? "");
        setVfSearch(searchParams.get("search") ?? "");
        setVfPublic(false);
        setViewName("");
        setSaveViewOpen(true);
    };

    const viewFilterCount =
        (vfOwner ? 1 : 0) + (vfType ? 1 : 0) + (vfCity.trim() ? 1 : 0) + (vfSearch.trim() ? 1 : 0);

    const saveCurrentView = async () => {
        const name = viewName.trim();
        if (!name) {
            toast.error("Please enter a view name");
            return;
        }
        const filters: Record<string, string> = {};
        if (vfOwner) filters.owner_id = vfOwner;
        if (vfType) filters.acc_type_id = vfType;
        if (vfCity.trim()) filters.billing_city = vfCity.trim();
        if (vfSearch.trim()) filters.search = vfSearch.trim();

        setSavingView(true);
        try {
            const created = await accountService.createView(name, filters, false, vfPublic);
            toast.success("View saved");
            setSaveViewOpen(false);
            setViewName("");
            // Switch to the new view so the user immediately sees it applied.
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

    const refresh = React.useCallback(() => {
        startTransition(() => router.refresh());
    }, [router]);

    // ── Recent-view search box ────────────────────────────────────────────────
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

    // ── Quick-view detail drawer ──────────────────────────────────────────────
    const [detailId, setDetailId] = React.useState<string | null>(null);
    const [detailOpen, setDetailOpen] = React.useState(false);
    const openDetail = React.useCallback((id: string) => {
        setDetailId(id);
        setDetailOpen(true);
    }, []);

    // ── Merge mode + selection ────────────────────────────────────────────────
    const [mergeMode, setMergeMode] = React.useState(false);
    const [selected, setSelected] = React.useState<string[]>([]);
    const [mergeDialogOpen, setMergeDialogOpen] = React.useState(false);
    const [primaryId, setPrimaryId] = React.useState<string | null>(null);
    const [merging, setMerging] = React.useState(false);

    const toggleSelect = (id: string) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? prev : [...prev, id]
        );
    };

    const selectedAccounts = data.filter((a) => selected.includes(a.id));

    const doMerge = async () => {
        if (!primaryId || selected.length !== 2) return;
        const duplicateId = selected.find((id) => id !== primaryId)!;
        setMerging(true);
        try {
            await accountService.mergeAccounts(primaryId, duplicateId);
            toast.success("Accounts merged successfully");
            setMergeDialogOpen(false);
            setMergeMode(false);
            setSelected([]);
            setPrimaryId(null);
            refresh();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Failed to merge accounts");
        } finally {
            setMerging(false);
        }
    };

    // ── Filter popover (owner / account type / city) ──────────────────────────
    const ownerFilter = searchParams.get("owner_id") ?? "";
    const typeFilter = searchParams.get("acc_type_id") ?? "";
    const cityFilter = searchParams.get("billing_city") ?? "";
    const hasActiveFilter = !!(ownerFilter || typeFilter || cityFilter);

    const { data: filterFormData } = useQuery({
        queryKey: ["account-form-data"],
        queryFn: () => accountService.getFormData(),
        staleTime: 5 * 60 * 1000,
    });
    const owners: { id: string; name: string }[] = filterFormData?.users || [];
    const accountTypes: { id: string; name: string }[] = filterFormData?.account_types || [];

    const applyFilter = React.useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, [pathname, router, searchParams]);

    const applyOwnerFilter = (id: string) => applyFilter("owner_id", id);

    const clearAllFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("owner_id");
        params.delete("acc_type_id");
        params.delete("billing_city");
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    };

    // Debounced city text input (free-text contains match).
    const [cityInput, setCityInput] = React.useState(cityFilter);
    const debouncedCity = useDebounce(cityInput, 400);
    const lastCity = React.useRef(cityFilter);
    React.useEffect(() => {
        if (debouncedCity === lastCity.current) return;
        lastCity.current = debouncedCity;
        applyFilter("billing_city", debouncedCity.trim());
    }, [debouncedCity, applyFilter]);

    // ── CSV export of the current page ────────────────────────────────────────
    const exportCsv = () => {
        const headers = ["Name", "Phone", "Billing Street", "Billing City", "Account Type", "Owner"];
        const rows = data.map((a) => [
            a.name, a.phone, a.billing_street, a.billing_city, a.account_type_name, a.owner_name,
        ]);
        const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `accounts-page-${pagination.current_page}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Bulk import + full server-side export ─────────────────────────────────
    const [importOpen, setImportOpen] = React.useState(false);
    const exportAll = async (format: "csv" | "xlsx") => {
        try {
            toast.info("Preparing export…");
            await accountService.exportAccounts(format, false);
            toast.success("Export downloaded");
        } catch {
            toast.error("Failed to export accounts");
        }
    };

    const columns = React.useMemo<ColumnDef<Account>[]>(() => {
        const base: ColumnDef<Account>[] = [];
        if (mergeMode) {
            base.push({
                id: "select",
                header: "",
                cell: ({ row }) => (
                    <Checkbox
                        checked={selected.includes(row.original.id)}
                        onCheckedChange={() => toggleSelect(row.original.id)}
                    />
                ),
            });
        }
        base.push(
            {
                accessorKey: "name",
                header: "Account Name",
                cell: ({ row }) => {
                    const account = row.original;
                    const isB2C = account.is_person_account;
                    const basePath = isB2C ? "person-accounts" : "accounts";
                    const href = `/${basePath}/${account.id}`;
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
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate max-w-[200px] font-medium text-primary hover:underline"
                                title={row.getValue("name")}
                            >
                                {row.getValue("name")}
                            </Link>
                        </div>
                    );
                },
            },
            {
                accessorKey: "phone",
                header: "Phone",
                cell: ({ row }) => (
                    <EditableTextCell account={row.original} field="phone" onSaved={refresh} />
                ),
            },
            {
                accessorKey: "billing_street",
                header: "Billing Street",
                cell: ({ row }) => (
                    <div className="max-w-[200px] truncate text-muted-foreground" title={row.getValue("billing_street") || ""}>
                        {row.getValue("billing_street") || "-"}
                    </div>
                ),
            },
            {
                accessorKey: "billing_city",
                header: "Billing City",
                cell: ({ row }) => (
                    <div className="text-muted-foreground">{row.getValue("billing_city") || "-"}</div>
                ),
            },
            {
                accessorKey: "account_type_name",
                header: "Account Type",
                cell: ({ row }) => <EditableTypeCell account={row.original} onSaved={refresh} />,
            },
            {
                accessorKey: "owner_name",
                header: "Owner",
                cell: ({ row }) => (
                    <OwnerPopover
                        ownerId={row.original.owner_id}
                        ownerName={row.original.owner_name}
                    />
                ),
            }
        );
        return base;
    }, [mergeMode, selected, refresh, openDetail]);

    const table = useReactTable({
        data,
        columns,
        pageCount: pagination.pages,
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="w-full">
            <div className="flex flex-col gap-4 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground sm:h-10 sm:w-10">
                        <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary sm:text-xs">
                            Accounts
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
                    {/* Recent-view search */}
                    <div className="relative flex-shrink-0">
                        <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search accounts..."
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

                    <PermissionGate permission="create_account">
                        <CreateAccountButton />
                    </PermissionGate>

                    {mergeMode ? (
                        <>
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                                {selected.length}/2 selected
                            </span>
                            <Button
                                variant="default"
                                className="whitespace-nowrap"
                                disabled={selected.length !== 2}
                                onClick={() => {
                                    setPrimaryId(selected[0]);
                                    setMergeDialogOpen(true);
                                }}
                            >
                                <GitMerge className="mr-1 h-4 w-4" /> Merge Selected
                            </Button>
                            <Button
                                variant="outline"
                                className="whitespace-nowrap"
                                onClick={() => {
                                    setMergeMode(false);
                                    setSelected([]);
                                }}
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            className="whitespace-nowrap"
                            onClick={() => setMergeMode(true)}
                        >
                            Merge Account
                        </Button>
                    )}

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
                            <p className="text-sm font-semibold">Filter accounts</p>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Owner</label>
                                <Select value={ownerFilter || "all"} onValueChange={(v) => applyOwnerFilter(v === "all" ? "" : v)}>
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
                                <label className="text-xs text-muted-foreground">Account type</label>
                                <Select value={typeFilter || "all"} onValueChange={(v) => applyFilter("acc_type_id", v === "all" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        {accountTypes.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                            <DropdownMenuItem onClick={exportCsv}>
                                <Download className="mr-2 h-4 w-4" /> Export page (CSV)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportAll("csv")}>
                                <Download className="mr-2 h-4 w-4" /> Export all (CSV)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportAll("xlsx")}>
                                <Download className="mr-2 h-4 w-4" /> Export all (Excel)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setImportOpen(true)}>
                                <Upload className="mr-2 h-4 w-4" /> Import Accounts (CSV)
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

            <div className={`w-full overflow-x-auto transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="pb-3 whitespace-nowrap">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
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
                                    data-state={selected.includes(row.original.id) && "selected"}
                                    className="border-b"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-4 py-3 text-sm">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between space-x-2 border-t bg-card px-4 py-4">
                <div className="text-sm text-muted-foreground">
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

            {/* Merge dialog: choose which account to keep */}
            <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Merge accounts</DialogTitle>
                        <DialogDescription>
                            Choose which account to keep. The other will have its contacts,
                            opportunities and tasks moved over, then be deleted. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {selectedAccounts.map((a) => (
                            <label
                                key={a.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${primaryId === a.id ? "border-primary bg-primary/5" : "border-border"}`}
                            >
                                <input
                                    type="radio"
                                    name="primary"
                                    checked={primaryId === a.id}
                                    onChange={() => setPrimaryId(a.id)}
                                />
                                <div>
                                    <p className="font-medium">{a.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {a.email || "no email"} · {a.phone || "no phone"}
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMergeDialogOpen(false)} disabled={merging}>
                            Cancel
                        </Button>
                        <Button onClick={doMerge} disabled={merging || !primaryId}>
                            {merging ? "Merging..." : "Merge"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save a named view — choose its filters right here */}
            <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save view</DialogTitle>
                        <DialogDescription>
                            Name the view and choose which accounts it should show. It will
                            appear in the “Recently Viewed” dropdown for quick access.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">View name</label>
                            <Input
                                autoFocus
                                value={viewName}
                                onChange={(e) => setViewName(e.target.value)}
                                placeholder="e.g. Delhi Agents"
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
                                <label className="text-xs font-medium text-muted-foreground">Account type</label>
                                <Select value={vfType || "all"} onValueChange={(v) => setVfType(v === "all" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Any type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any type</SelectItem>
                                        {accountTypes.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                            <div className="space-y-1.5">
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
                                No filters set — this view will show all accounts.
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
                entityLabel="Accounts"
                importFn={async (file) => normalizeImportResult(await accountService.importAccounts(file, false))}
                downloadSampleFn={() => accountService.downloadImportSample(false)}
                onImported={refresh}
                checklist={[
                    "Columns must match the downloaded sample — Name is required.",
                    "Account Type and Industry must exist as active picklists in Tutterfly.",
                    "Phone format: +<country code> <10 digits> (e.g. +91 9876543210).",
                    "Duplicate accounts (same name or email) are skipped and reported below.",
                ]}
            />
        </div>
    );
}
