"use client";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { Pencil, Check, Loader2, ChevronDown, RefreshCw, Filter, X, Search as SearchIcon, Download, Save, Trash2, Settings, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Contact } from "../types";
import { contactsService } from "@/lib/api/services/contacts.service";
import { OwnerPopover } from "@/components/shared/OwnerPopover";
import { ImportDataDialog, normalizeImportResult } from "@/components/shared/ImportDataDialog";
import { entityViewsService } from "@/lib/api/services/entity-views.service";
import { customFieldsService, type EntityType } from "@/lib/api/services/field-registry.service";
import { ListViewSelector, ListViewSettings } from "@/features/views/ListViewMenu";
import { ListViewFilterButton } from "@/features/views/ListViewFilterButton";
import { buildEntityColumns, type ViewLookups } from "@/features/views/accountColumnFactory";
import { buildLookupOptions, standardFieldByKey } from "@/features/views/accountFields";
import { useDebounce } from "@/hooks/use-debounce";
import { validateInlineField, normalizePhoneValue, isPhoneField } from "@/lib/validation/inline-field-validation";
import { PhoneInput } from "@/components/ui/phone-input";

// Pull a readable message out of an Axios/FastAPI validation error.
function extractError(e: any): string {
    const detail = e?.response?.data?.detail;
    if (Array.isArray(detail)) {
        return detail.map((d: any) => d?.msg).filter(Boolean).join("; ") || "Failed to update";
    }
    if (typeof detail === "string") return detail;
    return "Failed to update";
}

// ─── Inline-editable text cell ────────────────────────────────────────────────
// Shows the value (optionally as a link to the contact) with a pencil that
// reveals on hover. Saves a single field via PUT /contacts/{id}.
function EditableContactCell({
    contact,
    field,
    href,
    type = "text",
    placeholder,
    onSaved,
}: {
    contact: Contact;
    field: "first_name" | "last_name" | "email" | "phone" | "mobile";
    href?: string;
    type?: string;
    placeholder?: string;
    onSaved: () => void;
}) {
    const initial = (contact[field] as string) || "";
    const [editing, setEditing] = React.useState(false);
    const [value, setValue] = React.useState(initial);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => setValue(initial), [initial]);

    const save = async () => {
        if (value === initial) {
            setEditing(false);
            return;
        }
        const validationError = validateInlineField("contact", field, value);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        const payloadValue = isPhoneField(field) ? normalizePhoneValue(value) ?? value.trim() : value.trim();
        setSaving(true);
        try {
            await contactsService.updateContact(contact.id, { [field]: payloadValue });
            toast.success("Updated");
            setEditing(false);
            onSaved();
        } catch (e: any) {
            toast.error(extractError(e));
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

export function ContactTable({
    data,
    pagination,
    users = [],
    nextCursor = null,
    hasMore = false,
}: {
    data: Contact[];
    pagination: {
        current_page: number;
        total: number | null;
        per_page: number;
        pages: number | null;
    };
    /** Tenant users — used to resolve an owner's name from its id. */
    users?: { id: string; name: string }[];
    nextCursor?: string | null;
    hasMore?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = React.useTransition();
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    // ── Keyset "load more" (infinite scroll) — SSR seeds page 1; cursor appends ──
    const [rows, setRows] = React.useState<Contact[]>(data);
    const [cursor, setCursor] = React.useState<string | null>(nextCursor);
    const [moreAvailable, setMoreAvailable] = React.useState<boolean>(hasMore);
    const [loadingMore, setLoadingMore] = React.useState(false);

    React.useEffect(() => {
        setRows(data);
        setCursor(nextCursor);
        setMoreAvailable(hasMore);
    }, [data, nextCursor, hasMore]);

    const loadMore = React.useCallback(async () => {
        if (!cursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await contactsService.getContacts({
                per_page: pagination.per_page,
                search: searchParams.get("search") || undefined,
                owner_id: searchParams.get("owner_id") || undefined,
                view_id: searchParams.get("view_id") || undefined,
                account_id: searchParams.get("account_id") || undefined,
                cursor,
            });
            setRows((prev) => [...prev, ...res.contacts]);
            setCursor(res.next_cursor ?? null);
            setMoreAvailable(!!res.has_more);
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Failed to load more");
        } finally {
            setLoadingMore(false);
        }
    }, [cursor, loadingMore, pagination.per_page, searchParams]);

    const refresh = React.useCallback(() => {
        startTransition(() => router.refresh());
    }, [router]);

    // Resolve owner names from the tenant user list when the row didn't carry one.
    const ownerNameById = React.useMemo(() => {
        const map = new Map<string, string>();
        for (const u of users) map.set(u.id, u.name);
        return map;
    }, [users]);

    // ── List-view manager (filters + Select Fields) ───────────────────────────
    const entity: EntityType = "contact";
    const { data: customFields = [] } = useQuery({
        queryKey: ["custom-fields", entity],
        queryFn: () => customFieldsService.list(entity, true),
        staleTime: 5 * 60 * 1000,
    });
    const fieldLabels = React.useMemo(() => {
        const m = new Map<string, string>();
        standardFieldByKey(entity).forEach((f, k) => m.set(k, f.label));
        customFields.forEach((f) => m.set("additional:" + f.id, f.label || f.name));
        return m;
    }, [customFields]);
    const viewLookups = React.useMemo<ViewLookups>(() => ({ users: ownerNameById }), [ownerNameById]);
    const lookupOptions = React.useMemo(() => buildLookupOptions(entity, { users }), [users]);

    // ── Saved views (contact-scoped EntityViews) ─────────────────────────────
    const queryClient = useQueryClient();
    const { data: savedViews = [] } = useQuery({
        queryKey: ["entity-views", "contact"],
        queryFn: () => entityViewsService.listViews("contact"),
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

    const applySavedView = (id: string | null) => setParams((p) => { if (id) p.set("view_id", id); else p.delete("view_id"); });

    const ownerFilter = searchParams.get("owner_id") ?? "";
    const hasActiveFilter = !!ownerFilter;
    const applyFilter = (key: string, value: string) => setParams((p) => { if (value) p.set(key, value); else p.delete(key); });
    const clearFilters = () => setParams((p) => { p.delete("owner_id"); });

    const currentSearch = searchParams.get("search") ?? "";
    const [searchInput, setSearchInput] = React.useState(currentSearch);
    const debouncedSearch = useDebounce(searchInput, 400);
    const lastSearch = React.useRef(currentSearch);
    React.useEffect(() => {
        if (debouncedSearch === lastSearch.current) return;
        lastSearch.current = debouncedSearch;
        setParams((p) => { if (debouncedSearch) p.set("search", debouncedSearch); else p.delete("search"); });
    }, [debouncedSearch, setParams]);

    // ── Save view dialog ──────────────────────────────────────────────────────
    const [saveOpen, setSaveOpen] = React.useState(false);
    const [vName, setVName] = React.useState("");
    const [vOwner, setVOwner] = React.useState("");
    const [vSearch, setVSearch] = React.useState("");
    const [vPublic, setVPublic] = React.useState(false);
    const [savingView, setSavingView] = React.useState(false);
    const openSaveView = () => { setVOwner(ownerFilter); setVSearch(currentSearch); setVPublic(false); setVName(""); setSaveOpen(true); };
    const viewFilterCount = (vOwner ? 1 : 0) + (vSearch.trim() ? 1 : 0);

    const saveView = async () => {
        const name = vName.trim();
        if (!name) { toast.error("Please enter a view name"); return; }
        const filters: Record<string, string> = {};
        if (vOwner) filters.owner_id = vOwner;
        if (vSearch.trim()) filters.search = vSearch.trim();
        setSavingView(true);
        try {
            const created = await entityViewsService.createView("contact", { name, filters, is_public: vPublic });
            toast.success("View saved");
            queryClient.invalidateQueries({ queryKey: ["entity-views", "contact"] });
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
            await entityViewsService.deleteView("contact", activeView.id);
            toast.success("View deleted");
            queryClient.invalidateQueries({ queryKey: ["entity-views", "contact"] });
            applySavedView(null);
        } catch {
            toast.error("Failed to delete view");
        }
    };

    // ── Bulk import + full server-side export ─────────────────────────────────
    const [importOpen, setImportOpen] = React.useState(false);
    const exportAll = async (format: "csv" | "xlsx") => {
        try {
            toast.info("Preparing export…");
            await contactsService.exportContacts(format);
            toast.success("Export downloaded");
        } catch {
            toast.error("Failed to export contacts");
        }
    };

    const columns = React.useMemo<ColumnDef<Contact>[]>(
        () => {
            if (activeView?.display_columns?.length) {
                return buildEntityColumns(activeView.display_columns, fieldLabels, {
                    entity,
                    openDetail: undefined,
                    lookups: viewLookups,
                }) as ColumnDef<Contact>[];
            }
            return [
            {
                accessorKey: "first_name",
                header: "First Name",
                cell: ({ row }) => (
                    <EditableContactCell
                        contact={row.original}
                        field="first_name"
                        href={`/contacts/${row.original.id}`}
                        onSaved={refresh}
                    />
                ),
            },
            {
                accessorKey: "last_name",
                header: "Last Name",
                cell: ({ row }) => (
                    <EditableContactCell contact={row.original} field="last_name" onSaved={refresh} />
                ),
            },
            {
                accessorKey: "email",
                header: "Email",
                cell: ({ row }) => (
                    <EditableContactCell contact={row.original} field="email" type="email" onSaved={refresh} />
                ),
            },
            {
                accessorKey: "phone",
                header: "Phone",
                cell: ({ row }) => (
                    <EditableContactCell contact={row.original} field="phone" onSaved={refresh} />
                ),
            },
            {
                accessorKey: "mobile",
                header: "Mobile",
                cell: ({ row }) => (
                    <EditableContactCell contact={row.original} field="mobile" onSaved={refresh} />
                ),
            },
            {
                accessorKey: "owner_name",
                header: "Owner",
                cell: ({ row }) => (
                    <OwnerPopover
                        ownerId={row.original.owner_id}
                        ownerName={
                            row.original.owner_name ||
                            (row.original.owner_id ? ownerNameById.get(row.original.owner_id) : undefined)
                        }
                    />
                ),
            },
            ];
        },
        [refresh, ownerNameById, activeView, fieldLabels, viewLookups]
    );

    const table = useReactTable({
        data: rows,
        columns,
        manualPagination: true,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters,
        },
    });

    return (
        <div className="w-full">
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Saved-view selector */}
                <ListViewSelector entity={entity} presetLabel="All records" />

                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search contacts..."
                            className="h-9 w-44 pl-8 text-sm"
                        />
                        {searchInput && (
                            <button type="button" onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
                                <DropdownMenuItem onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportAll("csv")}><Download className="mr-2 h-4 w-4" /> Export all (CSV)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" /> Import Contacts (CSV)</DropdownMenuItem>
                            </>
                        }
                    />
                </div>
            </div>
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
                                <TableRow key={row.id}>
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
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    Showing {rows.length}
                    {pagination.total != null ? ` of ${pagination.total}` : "+"} records
                </div>
                <div>
                    {moreAvailable ? (
                        <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? (
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

            {/* Bulk import (CSV/Excel) with sample download */}
            <ImportDataDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                entityLabel="Contacts"
                importFn={async (file) => normalizeImportResult(await contactsService.importContacts(file))}
                downloadSampleFn={contactsService.downloadImportSample}
                invalidateKeys={[["contacts"]]}
                onImported={refresh}
                checklist={[
                    "Columns must match the downloaded sample — First Name and Last Name are required.",
                    "Account Name must match an existing account — import your accounts first.",
                    "Phone/Mobile format: +<country code> <10 digits> (e.g. +91 9876543210).",
                ]}
            />
        </div>
    );
}
