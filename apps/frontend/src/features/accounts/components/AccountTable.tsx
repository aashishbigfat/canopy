"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
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
import type { EntityType } from "@/lib/api/services/field-registry.service";
import { standardFieldsService, customFieldsService } from "@/lib/api/services/field-registry.service";
import { useEntityViews } from "@/features/views/useEntityViews";
import { ListViewSelector, ListViewSettings } from "@/features/views/ListViewMenu";
import { ListViewFilterButton } from "@/features/views/ListViewFilterButton";
import { buildEntityColumns, type ViewLookups } from "@/features/views/accountColumnFactory";
import { buildLookupOptions } from "@/features/views/accountFields";

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
    nextCursor = null,
    hasMore = false,
    isPersonAccount = false,
}: {
    data: Account[];
    pagination: {
        current_page: number;
        total: number | null;
        per_page: number;
        pages: number | null;
    };
    views?: AccountListView[];
    activeViewId?: string;
    nextCursor?: string | null;
    hasMore?: boolean;
    isPersonAccount?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = React.useTransition();

    // ── Keyset "load more" (infinite scroll) ──────────────────────────────────
    // The SSR'd first page seeds `rows`; subsequent pages are fetched client-side
    // via the keyset cursor and appended (O(1) per page, no COUNT, no skip()).
    const [rows, setRows] = React.useState<Account[]>(data);
    const [cursor, setCursor] = React.useState<string | null>(nextCursor);
    const [moreAvailable, setMoreAvailable] = React.useState<boolean>(hasMore);
    const [loadingMore, setLoadingMore] = React.useState(false);

    // When the first page changes (filter / search / view / page nav re-SSRs), reset.
    React.useEffect(() => {
        setRows(data);
        setCursor(nextCursor);
        setMoreAvailable(hasMore);
    }, [data, nextCursor, hasMore]);

    const loadMore = React.useCallback(async () => {
        if (!cursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await accountService.getAccounts({
                is_person_account: isPersonAccount,
                per_page: pagination.per_page,
                search: searchParams.get("search") || undefined,
                owner_id: searchParams.get("owner_id") || undefined,
                view_id: searchParams.get("view_id") || undefined,
                acc_type_id: searchParams.get("acc_type_id") || undefined,
                billing_city: searchParams.get("billing_city") || undefined,
                cursor,
            });
            setRows((prev) => [...prev, ...res.accounts]);
            setCursor(res.next_cursor ?? null);
            setMoreAvailable(!!res.has_more);
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Failed to load more");
        } finally {
            setLoadingMore(false);
        }
    }, [cursor, loadingMore, isPersonAccount, pagination.per_page, searchParams]);

    // ── Saved list-view (polymorphic EntityView) ─────────────────────────────
    // entity_type discriminates B2B vs B2C so each gets its own views, filters
    // and field set. View management (New/Rename/Share/Edit Filters/Select
    // Fields/Delete) lives in ListViewSelector + ListViewSettings.
    const entity: EntityType = isPersonAccount ? "personal_account" : "account";
    const { activeView } = useEntityViews(entity);

    // Field labels for dynamic display columns (standard + additional/custom).
    const { data: stdFields = [] } = useQuery({
        queryKey: ["standard-fields", entity],
        queryFn: () => standardFieldsService.list(entity, true),
        staleTime: 5 * 60 * 1000,
    });
    const { data: addFields = [] } = useQuery({
        queryKey: ["custom-fields", entity],
        queryFn: () => customFieldsService.list(entity, true),
        staleTime: 5 * 60 * 1000,
    });
    const fieldLabels = React.useMemo(() => {
        const m = new Map<string, string>();
        stdFields.forEach((f) => m.set(f.field_key, f.label || f.field_key));
        addFields.forEach((f) => m.set("additional:" + f.id, f.label || f.name));
        return m;
    }, [stdFields, addFields]);

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

    const selectedAccounts = rows.filter((a) => selected.includes(a.id));

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

    // id→name maps so dynamic lookup columns (owner, type, industry, parent, …)
    // render names instead of ids.
    const viewLookups = React.useMemo<ViewLookups>(() => {
        const toMap = (arr?: { id: string; name: string }[]) =>
            new Map((arr || []).map((o) => [o.id, o.name]));
        return {
            users: toMap(filterFormData?.users),
            industries: toMap(filterFormData?.industries),
            account_types: toMap(filterFormData?.account_types),
            categories: toMap(filterFormData?.categories),
            parents: toMap(filterFormData?.parent_accounts),
        };
    }, [filterFormData]);

    // field_key → value options for the filter dropdowns.
    const lookupOptions = React.useMemo(
        () =>
            buildLookupOptions(entity, {
                users: filterFormData?.users,
                account_types: filterFormData?.account_types,
                industries: filterFormData?.industries,
                categories: filterFormData?.categories,
            }),
        [entity, filterFormData],
    );

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
        // When the active view selects explicit display columns, render those
        // (in order) instead of the default set.
        if (activeView?.display_columns?.length) {
            base.push(
                ...(buildEntityColumns(activeView.display_columns, fieldLabels, {
                    entity,
                    openDetail,
                    lookups: viewLookups,
                }) as ColumnDef<Account>[]),
            );
            return base;
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
    }, [mergeMode, selected, refresh, openDetail, activeView, fieldLabels, entity, isPersonAccount, viewLookups]);

    const table = useReactTable({
        data: rows,
        columns,
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
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
                            <ListViewSelector entity={entity} />
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

                    {/* Filter — view-aware (opens Edit List Filters for the active view) */}
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
                                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                                    <Upload className="mr-2 h-4 w-4" /> Import Accounts (CSV)
                                </DropdownMenuItem>
                            </>
                        }
                    />
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
                    Showing {rows.length}
                    {pagination.total != null ? ` of ${pagination.total}` : "+"} records
                </div>
                <div>
                    {moreAvailable ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                                </>
                            ) : (
                                "Load more"
                            )}
                        </Button>
                    ) : (
                        <span className="text-xs text-muted-foreground">All records loaded</span>
                    )}
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
                    "Phone format: +<country code> <number> (e.g. +91 9876543210); 10 digits for India.",
                ]}
            />
        </div>
    );
}
