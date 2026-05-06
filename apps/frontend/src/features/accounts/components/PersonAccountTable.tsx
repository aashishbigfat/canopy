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
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
import { Account } from "../types";
import { Checkbox } from "@/components/ui/checkbox";

export const personAccountColumns: ColumnDef<Account>[] = [
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
                <Link href={`/person-accounts/${account.id}`} className="font-medium text-primary hover:underline">
                    {firstName}
                </Link>
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
            <div className="text-sm text-foreground">{row.getValue("email") || "-"}</div>
        ),
    },
    {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
            <div className="text-sm text-foreground">{row.getValue("phone") || "-"}</div>
        ),
    },
    {
        accessorKey: "mobile",
        header: "Mobile",
        cell: ({ row }) => {
            const mobile = row.original.mobile || row.original.phone || "-";
            return <div className="text-sm text-foreground">{mobile}</div>;
        },
    },
    {
        id: "owner",
        header: "Owner",
        cell: ({ row }) => {
            const account = row.original;
            return (
                <div className="text-sm text-foreground">
                    {account.owner_name || "-"}
                </div>
            );
        },
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const account = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(account.id)}
                        >
                            Copy Account ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={`/person-accounts/${account.id}`}>View details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/person-accounts/${account.id}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

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

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const table = useReactTable({
        data,
        columns: personAccountColumns,
        pageCount: pagination.pages,
        manualPagination: true,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
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
                                    colSpan={personAccountColumns.length}
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
        </div>
    );
}
