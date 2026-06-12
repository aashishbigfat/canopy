"use client";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
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
}: {
    data: Contact[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    /** Tenant users — used to resolve an owner's name from its id. */
    users?: { id: string; name: string }[];
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = React.useTransition();
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const refresh = React.useCallback(() => {
        startTransition(() => router.refresh());
    }, [router]);

    // Resolve owner names from the tenant user list when the row didn't carry one.
    const ownerNameById = React.useMemo(() => {
        const map = new Map<string, string>();
        for (const u of users) map.set(u.id, u.name);
        return map;
    }, [users]);

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

    const exportCsv = () => {
        const headers = ["First Name", "Last Name", "Email", "Phone", "Mobile", "Owner"];
        const rows = data.map((c) => [
            c.first_name, c.last_name, c.email, c.phone, (c as any).mobile,
            c.owner_name || (c.owner_id ? ownerNameById.get(c.owner_id) : ""),
        ]);
        const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contacts-page-${pagination.current_page}.csv`;
        a.click();
        URL.revokeObjectURL(url);
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
        () => [
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
        ],
        [refresh, ownerNameById]
    );

    const table = useReactTable({
        data,
        columns,
        pageCount: pagination.pages,
        manualPagination: true,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters,
        },
    });

    return (
        <div className="w-full">
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Saved-view selector */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                            {activeView ? activeView.name : "All records"}
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-80 w-60 overflow-y-auto">
                        <DropdownMenuItem onClick={() => applySavedView(null)} className={!activeView ? "font-semibold text-primary" : ""}>
                            All records
                        </DropdownMenuItem>
                        {savedViews.length > 0 && <DropdownMenuSeparator />}
                        {savedViews.map((v) => (
                            <DropdownMenuItem key={v.id} onClick={() => applySavedView(v.id)} className={v.id === viewId ? "font-semibold text-primary" : ""}>
                                {v.name}
                                {v.is_public && <span className="ml-1 text-[10px] text-muted-foreground">(team)</span>}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

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

                    {/* Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={hasActiveFilter ? "default" : "outline"} size="icon" title="Filter">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 space-y-3">
                            <p className="text-sm font-semibold">Filter contacts</p>
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
                            {hasActiveFilter && (
                                <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>Clear all filters</Button>
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
                            <DropdownMenuItem onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</DropdownMenuItem>
                            <DropdownMenuItem onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Export page (CSV)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportAll("csv")}><Download className="mr-2 h-4 w-4" /> Export all (CSV)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportAll("xlsx")}><Download className="mr-2 h-4 w-4" /> Export all (Excel)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" /> Import Contacts (CSV)</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={openSaveView}><Save className="mr-2 h-4 w-4" /> Save view…</DropdownMenuItem>
                            {activeView && (
                                <DropdownMenuItem onClick={deleteActiveView} className="text-red-600 focus:text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete view “{activeView.name}”
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
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
            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save view</DialogTitle>
                        <DialogDescription>
                            Name the view and choose which contacts it should show.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">View name</label>
                            <Input autoFocus value={vName} onChange={(e) => setVName(e.target.value)} placeholder="e.g. Key contacts" />
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
                            <p className="text-xs text-amber-600">No filters set — this view will show all contacts.</p>
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
                    "Duplicate contacts (same email) are skipped and reported below.",
                ]}
            />
        </div>
    );
}
