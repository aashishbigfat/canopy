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
import { ArrowUpDown, Eye, Pencil, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Account } from "../types";
import { AccountDetailDrawer } from "./AccountDetailDrawer";
import { OwnerPopover } from "@/components/shared/OwnerPopover";
import { accountService } from "../services/accountService";

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
        setSaving(true);
        try {
            await accountService.updateSingleColumn(account.id, field as string, value);
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
                <Input
                    autoFocus
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

export function PersonAccountTable({ 
    data, 
    pagination 
}: { 
    data: Account[], 
    pagination: { 
        current_page: number; 
        total: number; 
        per_page: number; 
        pages: number; 
    } 
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
                        displayFallback={row.original.phone || ""}
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
            <div className="crm-toolbar py-2">
                <Input
                    placeholder="Search person accounts..."
                    value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("email")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
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
            <AccountDetailDrawer
                accountId={detailId}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
        </div>
    );
}
