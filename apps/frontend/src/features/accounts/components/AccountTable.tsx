"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Eye, Briefcase, RefreshCw, Filter, Settings, X } from "lucide-react";
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
                    <Eye className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <Link href={`/${basePath}/${account.id}`} className="text-blue-500 hover:underline font-medium truncate max-w-[200px]" title={row.getValue("name")}>
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
            <div className="text-gray-600">{row.getValue("phone") || "-"}</div>
        ),
    },
    {
        accessorKey: "billing_street",
        header: "Billing Street",
        cell: ({ row }) => <div className="text-gray-600 truncate max-w-[200px]" title={row.getValue("billing_street") || ""}>{row.getValue("billing_street") || "-"}</div>,
    },
    {
        accessorKey: "billing_city",
        header: "Billing City",
        cell: ({ row }) => (
            <div className="text-gray-600">{row.getValue("billing_city") || "-"}</div>
        ),
    },
    {
        accessorKey: "account_type_name",
        header: "Account Type",
        cell: ({ row }) => (
            <div className="text-gray-600">{row.getValue("account_type_name") || "-"}</div>
        ),
    },
    {
        accessorKey: "owner_name",
        header: "Owner",
        cell: ({ row }) => (
            <Link href="#" className="text-blue-500 hover:underline">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-[#f8f9fa] rounded-t-md gap-4 sm:gap-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded shadow-sm text-white">
                        <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-[10px] sm:text-xs font-semibold text-blue-500 flex items-center gap-1 cursor-pointer uppercase tracking-wider">
                            Accounts <ChevronDown className="w-3 h-3" />
                        </div>
                        <div className="text-sm sm:text-lg font-bold flex items-center gap-2 text-gray-800">
                            Recently Viewed
                            <div className="flex items-center gap-1 ml-1 text-gray-400 border-l pl-2 h-4 border-gray-300">
                                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 cursor-pointer hover:text-gray-600" />
                                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer hover:text-gray-600" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <PermissionGate permission="create_account">
                        <CreateAccountButton />
                    </PermissionGate>
                    <Button variant="outline" className="bg-white text-gray-700 border-gray-300 whitespace-nowrap">Merge Account</Button>
                    <Button variant="outline" size="icon" className="bg-white text-gray-600 border-gray-300 flex-shrink-0">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="bg-white text-gray-600 border-gray-300 flex-shrink-0">
                        <Filter className="w-4 h-4" />
                    </Button>
                    <Button className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white flex-shrink-0">
                        Settings <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
            
            <div className={`w-full overflow-x-auto transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                <Table>
                    <TableHeader className="bg-gray-50 text-gray-500">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="font-semibold text-xs whitespace-nowrap text-[#6b7280] pb-3 border-b-0">
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
                                        <TableCell key={cell.id} className="py-3 px-4 text-sm">
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
                                    className="h-24 text-center text-gray-500"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <div className="flex items-center justify-between space-x-2 py-4 px-4 bg-white border-t rounded-b-md">
                <div className="text-sm text-gray-500">
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
