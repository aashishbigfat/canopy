"use client";

import React, { useState } from "react";
import {
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
    Plus,
    Settings,
    RotateCcw,
    Filter,
    LayoutGrid,
    Lightbulb,
    FileText,
    Kanban
} from "lucide-react";
import Link from "next/link";
import { Opportunity } from "../types";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface GroupedOpportunityTableProps {
    data: Opportunity[];
    onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function GroupedOpportunityTable({ data, onOpportunityClick }: GroupedOpportunityTableProps) {
    const [expandedOwners, setExpandedOwners] = useState<Record<string, boolean>>({});

    // Group data by owner
    const groupedData = React.useMemo(() => {
        const groups: Record<string, { owner_name: string; opportunities: Opportunity[] }> = {};

        data.forEach(opp => {
            const ownerId = opp.owner_id;
            const ownerName = opp.owner_name || "Unknown Owner";

            if (!groups[ownerId]) {
                groups[ownerId] = {
                    owner_name: ownerName,
                    opportunities: []
                };
            }
            groups[ownerId].opportunities.push(opp);
        });

        return Object.entries(groups).map(([id, group]) => ({
            id,
            ...group
        }));
    }, [data]);

    // Expand all by default when data loads
    React.useEffect(() => {
        if (groupedData.length > 0) {
            const allExpanded: Record<string, boolean> = {};
            groupedData.forEach(group => {
                allExpanded[group.id] = true;
            });
            setExpandedOwners(allExpanded);
        }
    }, [groupedData]);

    const toggleOwner = (ownerId: string) => {
        setExpandedOwners(prev => ({
            ...prev,
            [ownerId]: !prev[ownerId]
        }));
    };

    return (
        <div className="w-full space-y-4">
            {/* Table Container */}
            <div className="rounded-md border shadow-sm bg-white overflow-hidden">
                <Table>
                    <TableBody>
                        {groupedData.map((group) => (
                            <React.Fragment key={group.id}>
                                {/* Owner Summary Row */}
                                <TableRow
                                    className="cursor-pointer hover:bg-slate-50 transition-colors border-b last:border-0"
                                    onClick={() => toggleOwner(group.id)}
                                >
                                    <TableCell className="py-4 pl-6 font-medium text-slate-700">
                                        <div className="flex items-center gap-3">
                                            {expandedOwners[group.id] ? (
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                            )}
                                            {group.owner_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-12 font-semibold text-slate-600">
                                        {group.opportunities.length}
                                    </TableCell>
                                </TableRow>

                                {/* Opportunity Details Table (Expanded) */}
                                {expandedOwners[group.id] && (
                                    <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b">
                                        <TableCell colSpan={2} className="p-0">
                                            <div className="overflow-x-auto border-t">
                                                <Table className="min-w-full">
                                                    <TableHeader className="bg-slate-100/50">
                                                        <TableRow>
                                                            <TableHead className="w-20 text-[11px] uppercase font-bold text-slate-500 pl-8">ID</TableHead>
                                                            <TableHead className="w-24 text-[11px] uppercase font-bold text-slate-500">Segment</TableHead>
                                                            <TableHead className="min-w-[200px] text-[11px] uppercase font-bold text-slate-500">Opportunity Name</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500">Destination(s)</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500">Account Type</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500">Account Name</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500 text-right">Amount</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500 text-center">Sales Stage</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500">Travel Date</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500">Close Date</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500">Owner</TableHead>
                                                            <TableHead className="text-[11px] uppercase font-bold text-slate-500">Creation</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {group.opportunities.map((opp) => (
                                                            <TableRow key={opp.id} className="hover:bg-blue-50/40 transition-colors border-b last:border-0 border-slate-100">
                                                                <TableCell
                                                                    className="pl-8 text-xs text-blue-600 font-medium tabular-nums underline cursor-pointer"
                                                                    onClick={() => onOpportunityClick?.(opp)}
                                                                >
                                                                    {opp.id.slice(-6)}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-slate-600">
                                                                    {opp.segment || "B2C"}
                                                                </TableCell>
                                                                <TableCell
                                                                    className="text-xs font-semibold text-blue-700 cursor-pointer hover:underline"
                                                                    onClick={() => onOpportunityClick?.(opp)}
                                                                >
                                                                    {opp.name}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-blue-600 cursor-pointer hover:underline">
                                                                    {opp.destination_names?.join(", ") || "N/A"}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-slate-500">
                                                                    {/* Account Type mapping could be added here */}
                                                                    -
                                                                </TableCell>
                                                                <TableCell className="text-xs text-slate-700 font-medium">
                                                                    <Link
                                                                        href={`/accounts/${opp.account_id}`}
                                                                        className="hover:text-blue-600 hover:underline"
                                                                    >
                                                                        {opp.account_name || "Personal Account"}
                                                                    </Link>
                                                                </TableCell>
                                                                <TableCell className="text-xs text-right font-semibold tabular-nums text-slate-700">
                                                                    {opp.amount ? `$${opp.amount.toLocaleString()}` : "-"}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Badge variant="outline" className="bg-slate-100 text-[10px] h-5 px-1.5 py-0 border-slate-200 uppercase font-bold text-slate-500">
                                                                        {opp.sales_stage_id === "won" ? "Won" : (opp.sales_stage_id === "lost" ? "Lost" : "PP")}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-xs text-slate-600 tabular-nums">
                                                                    {opp.travel_date ? format(new Date(opp.travel_date), "dd MMM yyyy") : "-"}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-slate-600 tabular-nums">
                                                                    {opp.close_date ? format(new Date(opp.close_date), "dd MMM yyyy") : "-"}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-blue-600 cursor-pointer hover:underline font-medium">
                                                                    {opp.owner_name}
                                                                </TableCell>
                                                                <TableCell className="text-xs">
                                                                    <span className={cn(
                                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                                        opp.creation_type === "Auto" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                                                    )}>
                                                                        {opp.creation_type || "Manual"}
                                                                    </span>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
