"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
import { ArrowUpDown, Filter, MoreHorizontal, Settings, ChevronDown } from "lucide-react";

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
import { Lead, LeadStatus, Source, User } from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingState, LoadingTable } from "@/components/ui/loading";
import Link from "next/link";

export const getColumns = (
    statuses: LeadStatus[],
    sources: Source[],
    users: User[]
): ColumnDef<Lead>[] => [
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
            accessorKey: "first_name",
            header: "First Name",
            cell: ({ row }) => {
                const lead = row.original;
                const firstName = lead.first_name || "";
                const lastName = lead.last_name || "";
                const initials = `${firstName[0] || ""}${lastName[0] || ""}`;
                return (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="" />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <Link
                                href={`/leads/${lead.id}`}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                {lead.first_name}
                            </Link>
                            <span className="text-xs text-muted-foreground">{lead.email}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "last_name",
            header: "Last Name",
            cell: ({ row }) => (
                <div className="text-sm font-medium">
                    {row.original.last_name || "-"}
                </div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="text-sm text-blue-600 hover:underline">
                    {row.original.email || "-"}
                </div>
            ),
        },
        {
            accessorKey: "phone",
            header: "Phone",
            cell: ({ row }) => (
                <div className="text-sm">
                    {row.original.phone || row.original.mobile || "-"}
                </div>
            ),
        },
        {
            accessorKey: "city",
            header: "City of Origin",
            cell: ({ row }) => (
                <div className="text-sm">
                    {row.original.city || "-"}
                </div>
            ),
        },
        {
            id: "new_status",
            header: "New",
            cell: ({ row }) => {
                const statusId = row.original.lead_status_id;
                const status = statuses.find(s => s.id === statusId);
                const label = status?.name || "New";
                return <div className="text-sm font-medium text-emerald-600">{label}</div>;
            },
        },
        {
            id: "travel_date",
            header: "Travel Date",
            cell: ({ row }) => {
                const cf = row.original.custom_fields || {};
                const travelDate = cf.travel_date as string | undefined;
                return (
                    <div className="text-sm">
                        {travelDate ? travelDate : "-"}
                    </div>
                );
            },
        },
        {
            id: "no_of_pax",
            header: "No of Pax",
            cell: ({ row }) => {
                const cf = row.original.custom_fields || {};
                const pax = (cf.no_of_pax as number | undefined) ?? (cf.pax as number | undefined);
                return <div className="text-sm">{pax ?? "-"}</div>;
            },
        },
        {
            id: "destinations",
            header: "Destination(s)",
            cell: ({ row }) => {
                const cf = row.original.custom_fields || {};
                const dest = (cf.destinations as string | undefined) ??
                    (cf.destination as string | undefined);
                return <div className="text-sm">{dest || "-"}</div>;
            },
        },
        {
            id: "segment",
            header: "Segment",
            cell: ({ row }) => {
                const cf = row.original.custom_fields || {};
                const segment = cf.segment as string | undefined;
                return <div className="text-sm">{segment || "-"}</div>;
            },
        },
        {
            id: "source_medium",
            header: "Source Medium",
            cell: ({ row }) => {
                const sourceId = row.original.source_id;
                const source = sources.find(s => s.id === sourceId);
                return <div className="capitalize text-sm">{source?.name || "-"}</div>;
            },
        },
        {
            id: "convert",
            header: "Convert Lead",
            enableHiding: false,
            cell: ({ row }) => {
                const lead = row.original;

                return (
                    <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="border-gray-400 text-gray-800 hover:bg-gray-100"
                    >
                        <Link href={`/leads/${lead.id}/convert`}>Convert</Link>
                    </Button>
                );
            },
        },
    ];

interface LeadTableProps {
    data: Lead[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    lead_statuses: LeadStatus[];
    sources: Source[];
    users: User[];
    isLoading?: boolean;
}

export function LeadTable({
    data,
    pagination,
    lead_statuses,
    sources,
    users,
    isLoading = false
}: LeadTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const columns = React.useMemo(() => getColumns(lead_statuses, sources, users), [lead_statuses, sources, users]);

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
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const total = pagination.total ?? table.getRowModel().rows.length;

    const currentView = searchParams.get("view") || "today";

    const leadViews = [
        { label: "Today Leads", value: "today" },
        { label: "Recently Viewed", value: "recent" },
        { label: "All Leads", value: "all" },
        { label: "Todays Lead", value: "todays_lead" },
        { label: "Yesterday Leads", value: "yesterday" },
        { label: "Last Week Leads", value: "last_week" },
        { label: "WhatsApp Enquiry Leads", value: "whatsapp" },
        { label: "lead check count", value: "lead_check_count" },
    ];

    const currentViewLabel =
        leadViews.find((v) => v.value === currentView)?.label || "Today Leads";

    return (
        <LoadingState isLoading={isLoading} fallback={<LoadingTable rows={10} columns={12} />}>
            <div className="w-full">
            <div className="mb-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold">
                            Leads ({total})
                        </div>
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                    >
                                        {currentViewLabel}
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {leadViews.map((view) => (
                                        <DropdownMenuItem
                                            key={view.value}
                                            onClick={() => {
                                                const params = new URLSearchParams(
                                                    searchParams.toString()
                                                );
                                                params.set("view", view.value);
                                                params.set("page", "1");
                                                router.push(
                                                    `${pathname}?${params.toString()}`
                                                );
                                            }}
                                        >
                                            {view.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild size="sm" className="gap-1">
                            <Link href="/leads/create">
                                <span className="text-lg leading-none">+</span>
                                New Lead
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="border-gray-300 text-gray-700"
                            aria-label="Filter leads"
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 border-gray-300 text-gray-700"
                                >
                                    Settings
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Manage columns</DropdownMenuItem>
                                <DropdownMenuItem>Save view</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="px-4 py-3">
                    <div className="mb-3 flex items-center">
                        <Input
                            placeholder="Search leads..."
                            value={(table.getColumn("first_name")?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn("first_name")?.setFilterValue(event.target.value)
                            }
                            className="max-w-sm"
                        />
                    </div>
                    <div className="rounded-md border">
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
                </div>
            </div>

            <div className="flex items-center justify-end space-x-2 py-2">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("page", (pagination.current_page - 1).toString());
                            router.push(`${pathname}?${params.toString()}`);
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
                            router.push(`${pathname}?${params.toString()}`);
                        }}
                        disabled={pagination.current_page >= pagination.pages}
                    >
                        Next
                    </Button>
                </div>
            </div>
            </div>
        </LoadingState>
    );
}
