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
import { ArrowUpDown, Filter, MoreHorizontal, Settings, ChevronDown, CheckCircle2 } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { LoadingState, LoadingTable } from "@/components/ui/loading";
import Link from "next/link";
import { ConvertLeadDialog } from "./ConvertLeadDialog";

export const getColumns = (
    statuses: LeadStatus[],
    sources: Source[],
    users: User[],
    experiences: { id: string; name: string }[]
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
                return (
                    <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        {lead.first_name}
                    </Link>
                );
            },
        },
        {
            accessorKey: "last_name",
            header: "Last Name",
            cell: ({ row }) => {
                const lead = row.original;
                return (
                    <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        {lead.last_name || "-"}
                    </Link>
                );
            },
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="text-sm text-gray-700">
                    {row.original.email || "-"}
                </div>
            ),
        },
        {
            accessorKey: "phone",
            header: "Phone",
            cell: ({ row }) => (
                <div className="text-sm text-gray-700">
                    {row.original.phone || row.original.mobile || "-"}
                </div>
            ),
        },
        {
            accessorKey: "city",
            header: "City of Origin",
            cell: ({ row }) => (
                <div className="text-sm text-gray-700">
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
                return <div className="text-sm font-medium text-gray-700">{label}</div>;
            },
        },
        {
            id: "travel_date",
            header: "Travel Date",
            cell: ({ row }) => {
                const travelDate = row.original.travel_date;
                return (
                    <div className="text-sm text-gray-700">
                        {travelDate ? travelDate : "-"}
                    </div>
                );
            },
        },
        {
            id: "no_of_pax",
            header: "No of Pax",
            cell: ({ row }) => {
                const pax = row.original.no_of_pax;
                return <div className="text-sm text-gray-700">{pax ?? "-"}</div>;
            },
        },
        {
            id: "destinations",
            header: "Destination(s)",
            cell: ({ row }) => {
                const dests = row.original.destinations;
                return <div className="text-sm text-gray-700">{Array.isArray(dests) ? dests.join(", ") : (dests || "-")}</div>;
            },
        },
        {
            id: "experience",
            header: "Experience",
            cell: ({ row }) => {
                const experienceId = row.original.experience_id;
                const experience = experiences.find(e => e.id === experienceId || e.name === experienceId);
                return <div className="text-sm text-gray-700">{experience?.name || experienceId || "-"}</div>;
            },
        },
        {
            id: "segment",
            header: "Segment",
            cell: ({ row }) => {
                const segment = row.original.segment || (row.original.custom_fields as any)?.segment;
                if (!segment) return <div className="text-sm text-gray-700">-</div>;

                return (
                    <Badge variant={segment === "B2B" ? "outline" : "secondary"} className={
                        segment === "B2B" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                    }>
                        {segment}
                    </Badge>
                );
            },
        },
        {
            id: "source_medium",
            header: "Source Medium",
            cell: ({ row }) => {
                const sourceId = row.original.source_id;
                let sourceMedium = "-";
                if (sourceId) {
                    const matchedSource = sources.find(s => s.id === sourceId);
                    sourceMedium = matchedSource ? matchedSource.name : sourceId;
                } else if (row.original.creation_type) {
                    sourceMedium = row.original.creation_type;
                }
                return <div className="capitalize text-sm text-gray-700">{sourceMedium}</div>;
            },
        },
        {
            id: "convert",
            header: "Convert Lead",
            enableHiding: false,
            cell: ({ row, table }) => {
                const lead = row.original;

                if (lead.is_converted) {
                    return (
                        <div className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Converted</span>
                        </div>
                    );
                }

                return (
                    <Button
                        size="sm"
                        variant="default"
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                        onClick={() => {
                            const tableMeta = table.options.meta as any;
                            if (tableMeta?.onConvert) {
                                tableMeta.onConvert(lead);
                            }
                        }}
                    >
                        Convert
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
    experiences: { id: string; name: string }[];
    sales_stages: { id: string; name: string }[];
    isLoading?: boolean;
    onSelectOne?: (id: string, checked: boolean) => void;
    onSelectAll?: (checked: boolean) => void;
    selectedIds?: string[];
}

export function LeadTable({
    data,
    pagination,
    lead_statuses,
    sources,
    users,
    experiences,
    sales_stages,
    isLoading = false,
    onSelectOne,
    onSelectAll,
    selectedIds = []
}: LeadTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [isPending, startTransition] = React.useTransition();

    const rowSelection = React.useMemo(() => {
        const selection: Record<string, boolean> = {};
        selectedIds.forEach(id => {
            const index = data.findIndex(d => d.id === id);
            if (index >= 0) {
                selection[index] = true;
            }
        });
        return selection;
    }, [selectedIds, data]);

    const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
    const [isConvertOpen, setIsConvertOpen] = React.useState(false);

    const columns = React.useMemo(() => {
        const baseColumns = getColumns(lead_statuses, sources, users, experiences);

        if (baseColumns[0].id === "select") {
            baseColumns[0] = {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            selectedIds.length > 0 && selectedIds.length === data.length
                        }
                        onCheckedChange={(value) => {
                            if (onSelectAll) onSelectAll(!!value);
                        }}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={selectedIds.includes(row.original.id)}
                        onCheckedChange={(value) => {
                            if (onSelectOne) onSelectOne(row.original.id, !!value);
                        }}
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            };
        }

        return baseColumns;
    }, [lead_statuses, sources, users, selectedIds, onSelectOne, onSelectAll, data.length]);

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
            rowSelection,
        },
        meta: {
            onConvert: (lead: Lead) => {
                setSelectedLead(lead);
                setIsConvertOpen(true);
            }
        }
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b px-4 py-3">
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
                        <div className="flex flex-wrap items-center gap-2">
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

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end space-x-0 sm:space-x-2 py-2">
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
            {selectedLead && (
                <ConvertLeadDialog
                    lead={selectedLead}
                    open={isConvertOpen}
                    onOpenChange={setIsConvertOpen}
                    users={users}
                    experiences={experiences}
                    sales_stages={sales_stages}
                />
            )}
        </LoadingState>
    );
}
