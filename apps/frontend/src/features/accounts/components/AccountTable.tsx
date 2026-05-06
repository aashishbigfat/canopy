"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Eye, Briefcase, RefreshCw, Filter, X } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { isPersonAccountEmail } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Account } from "../types";
import { CreateAccountButton } from "./CreateAccountButton";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export const columns: ColumnDef<Account>[] = [
    {
        accessorKey: "name",
        header: "Account Name",
        cell: ({ row }) => {
            const account = row.original;
            const isB2C = account.email ? isPersonAccountEmail(account.email) : false;
            const basePath = isB2C ? "person-accounts" : "accounts";

            return (
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary flex-shrink-0" />
                    <Link href={`/${basePath}/${account.id}`} className="truncate max-w-[200px] font-medium text-primary hover:underline" title={row.getValue("name")}>
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
            <div className="text-muted-foreground">{row.getValue("phone") || "-"}</div>
        ),
    },
    {
        accessorKey: "billing_street",
        header: "Billing Street",
        cell: ({ row }) => <div className="max-w-[200px] truncate text-muted-foreground" title={row.getValue("billing_street") || ""}>{row.getValue("billing_street") || "-"}</div>,
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
        cell: ({ row }) => (
            <div className="text-muted-foreground">{row.getValue("account_type_name") || "-"}</div>
        ),
    },
    {
        accessorKey: "owner_name",
        header: "Owner",
        cell: ({ row }) => (
            <Link href="#" className="text-primary hover:underline">
                {row.getValue("owner_name") || "-"}
            </Link>
        ),
    },
];

export function AccountTable({ 
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
                        <div className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary sm:text-xs">
                            Accounts <ChevronDown className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-lg">
                            Recently Viewed
                            <div className="ml-1 flex h-4 items-center gap-1 border-l border-border pl-2 text-muted-foreground">
                                <X className="h-3 w-3 cursor-pointer hover:text-foreground sm:h-3.5 sm:w-3.5" />
                                <ChevronDown className="h-3 w-3 cursor-pointer hover:text-foreground sm:h-4 sm:w-4" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <PermissionGate permission="create_account">
                        <CreateAccountButton />
                    </PermissionGate>
                    <Button variant="outline" className="whitespace-nowrap">Merge Account</Button>
                    <Button variant="outline" size="icon" className="flex-shrink-0">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="flex-shrink-0">
                        <Filter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="flex-shrink-0">
                        Settings <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
            
            <div className={`w-full overflow-x-auto transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="pb-3 whitespace-nowrap">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="border-b"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-4 py-3 text-sm">
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
        </div>
    );
}
