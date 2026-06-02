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
import { Pencil, Check, Loader2 } from "lucide-react";
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
import { Contact } from "../types";
import { contactsService } from "@/lib/api/services/contacts.service";
import { OwnerPopover } from "@/components/shared/OwnerPopover";

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
        setSaving(true);
        try {
            await contactsService.updateContact(contact.id, { [field]: value });
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
            <div className="flex items-center py-4">
                <Input
                    placeholder="Filter contacts..."
                    value={(table.getColumn("first_name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("first_name")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
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
        </div>
    );
}
