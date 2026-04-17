"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Opportunity } from "../types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GroupedOpportunityTableProps {
    data: Opportunity[];
    onOpportunityClick?: (opportunity: Opportunity) => void;
    groupByOwner?: boolean;
}

// ─── Shared column header ──────────────────────────────────────────────────────
const COL_HEADER = (
    <TableRow>
        <TableHead className="w-28 text-[11px] uppercase font-bold text-slate-500 pl-6">ID</TableHead>
        <TableHead className="w-16 text-[11px] uppercase font-bold text-slate-500">Segment</TableHead>
        <TableHead className="min-w-[180px] text-[11px] uppercase font-bold text-slate-500">Opportunity Name</TableHead>
        <TableHead className="text-[11px] uppercase font-bold text-slate-500">Destination(s)</TableHead>
        <TableHead className="w-24 text-[11px] uppercase font-bold text-slate-500">Acct. Type</TableHead>
        <TableHead className="min-w-[120px] text-[11px] uppercase font-bold text-slate-500">Account Name</TableHead>
        <TableHead className="w-28 text-[11px] uppercase font-bold text-slate-500 text-right">Amount</TableHead>
        <TableHead className="w-28 text-[11px] uppercase font-bold text-slate-500 text-center">Sales Stage</TableHead>
        <TableHead className="w-28 text-[11px] uppercase font-bold text-slate-500">Travel Date</TableHead>
        <TableHead className="w-28 text-[11px] uppercase font-bold text-slate-500">Close Date</TableHead>
        <TableHead className="w-28 text-[11px] uppercase font-bold text-slate-500">Owner</TableHead>
        <TableHead className="w-20 text-[11px] uppercase font-bold text-slate-500">Creation</TableHead>
    </TableRow>
);

// ─── Utility helpers ──────────────────────────────────────────────────────────
function formatOppDate(dateStr?: string) {
    if (!dateStr) return "—";
    return formatDate(dateStr) || "—";
}

function getStageBadgeStyle(stageName?: string) {
    const n = (stageName || "").toLowerCase();
    if (n.includes("won")) return "bg-green-100 text-green-700 border-green-200";
    if (n.includes("lost")) return "bg-red-100 text-red-700 border-red-200";
    if (n.includes("proposal") || n === "pp") return "bg-blue-100 text-blue-700 border-blue-200";
    if (n.includes("qualified") || n === "rq") return "bg-amber-100 text-amber-700 border-amber-200";
    if (n.includes("closed") || n === "cw") return "bg-purple-100 text-purple-700 border-purple-200";
    if (n === "ta") return "bg-teal-100 text-teal-700 border-teal-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
}

// ─── Single opportunity row ────────────────────────────────────────────────────
function OppRow({
    opp,
    onRowClick,
}: {
    opp: Opportunity;
    onRowClick: (opp: Opportunity) => void;
}) {
    const stageName = opp.sales_stage_name || opp.sales_stage_id?.slice(-4) || "—";
    return (
        <TableRow
            className="hover:bg-blue-50/50 transition-colors border-b border-slate-100 cursor-pointer group"
            onClick={() => onRowClick(opp)}
        >
            {/* ID */}
            <TableCell className="pl-6 py-2.5">
                <span className="text-xs text-blue-600 font-mono font-medium underline underline-offset-2">
                    {opp.id.slice(-6)}
                </span>
            </TableCell>

            {/* Segment */}
            <TableCell className="py-2.5">
                <span className={cn(
                    "text-[11px] font-bold px-1.5 py-0.5 rounded uppercase",
                    opp.segment === "B2B" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                )}>
                    {opp.segment || "B2C"}
                </span>
            </TableCell>

            {/* Opportunity Name */}
            <TableCell className="py-2.5">
                <span className="text-xs font-semibold text-blue-700 group-hover:underline">
                    {opp.name}
                </span>
            </TableCell>

            {/* Destinations */}
            <TableCell className="py-2.5 text-xs text-blue-600">
                {opp.destination_names?.length
                    ? opp.destination_names.join(", ")
                    : <span className="text-slate-400">—</span>}
            </TableCell>

            {/* Account Type */}
            <TableCell className="py-2.5 text-xs text-slate-500">
                {opp.type || <span className="text-slate-300">—</span>}
            </TableCell>

            {/* Account Name */}
            <TableCell className="py-2.5" onClick={e => e.stopPropagation()}>
                {opp.account_id ? (
                    <Link
                        href={`/accounts/${opp.account_id}`}
                        className="text-xs text-slate-700 font-medium hover:text-blue-600 hover:underline"
                    >
                        {opp.account_name || "—"}
                    </Link>
                ) : (
                    <span className="text-xs text-slate-400">—</span>
                )}
            </TableCell>

            {/* Amount */}
            <TableCell className="py-2.5 text-right">
                <span className="text-xs font-semibold tabular-nums text-slate-700">
                    {opp.amount ? formatCurrency(opp.amount) : <span className="text-slate-400">—</span>}
                </span>
            </TableCell>

            {/* Sales Stage */}
            <TableCell className="py-2.5 text-center">
                <Badge
                    variant="outline"
                    className={cn("text-[10px] h-5 px-1.5 py-0 font-bold uppercase", getStageBadgeStyle(stageName))}
                >
                    {stageName}
                </Badge>
            </TableCell>

            {/* Travel Date */}
            <TableCell className="py-2.5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                {formatOppDate(opp.travel_date)}
            </TableCell>

            {/* Close Date */}
            <TableCell className="py-2.5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                {formatOppDate(opp.close_date)}
            </TableCell>

            {/* Owner */}
            <TableCell className="py-2.5 text-xs text-blue-600 font-medium whitespace-nowrap">
                {opp.owner_name || "—"}
            </TableCell>

            {/* Creation Type */}
            <TableCell className="py-2.5">
                <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                    (opp.creation_type || "").toLowerCase() === "auto"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                )}>
                    {opp.creation_type || "Manual"}
                </span>
            </TableCell>
        </TableRow>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function GroupedOpportunityTable({
    data,
    onOpportunityClick,
    groupByOwner = true,
}: GroupedOpportunityTableProps) {
    const router = useRouter();
    const [expandedOwners, setExpandedOwners] = useState<Record<string, boolean>>({});

    // Group by owner, sorted alphabetically
    const groupedData = React.useMemo(() => {
        const groups: Record<string, { owner_name: string; opportunities: Opportunity[] }> = {};
        data.forEach(opp => {
            const key = opp.owner_id;
            if (!groups[key]) groups[key] = { owner_name: opp.owner_name || "Unknown Owner", opportunities: [] };
            groups[key].opportunities.push(opp);
        });
        return Object.entries(groups)
            .map(([id, g]) => ({ id, ...g }))
            .sort((a, b) => a.owner_name.localeCompare(b.owner_name));
    }, [data]);

    // Expand all owners by default
    React.useEffect(() => {
        if (groupedData.length > 0) {
            const all: Record<string, boolean> = {};
            groupedData.forEach(g => { all[g.id] = true; });
            setExpandedOwners(all);
        }
    }, [groupedData]);

    const toggleOwner = (id: string) =>
        setExpandedOwners(prev => ({ ...prev, [id]: !prev[id] }));

    const handleRowClick = (opp: Opportunity) => {
        if (onOpportunityClick) onOpportunityClick(opp);
        else router.push(`/opportunities/${opp.id}`);
    };

    // ── Empty state ────────────────────────────────────────────────────────────
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="text-5xl mb-3">📋</div>
                <p className="font-medium text-slate-500">No opportunities found</p>
                <p className="text-sm mt-1">Try switching views or adding a new opportunity.</p>
            </div>
        );
    }

    // ── Flat view (all opportunities, no grouping) ─────────────────────────────
    if (!groupByOwner) {
        return (
            <div className="w-full overflow-x-auto">
                <Table className="min-w-[900px]">
                    <TableHeader className="bg-slate-100 sticky top-0 z-10">
                        {COL_HEADER}
                    </TableHeader>
                    <TableBody>
                        {data.map(opp => (
                            <OppRow key={opp.id} opp={opp} onRowClick={handleRowClick} />
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    // ── Grouped by owner view ─────────────────────────────────────────────────
    return (
        <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px]">
                <TableHeader className="bg-slate-100 sticky top-0 z-10">
                    {COL_HEADER}
                </TableHeader>
                <TableBody>
                    {groupedData.map(group => (
                        <React.Fragment key={group.id}>
                            {/* Owner header row */}
                            <TableRow
                                className="cursor-pointer hover:bg-blue-50/30 bg-slate-50 border-b border-slate-200 transition-colors"
                                onClick={() => toggleOwner(group.id)}
                            >
                                <TableCell colSpan={12} className="py-2.5 pl-4">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "transition-colors",
                                            expandedOwners[group.id] ? "text-blue-600" : "text-slate-400"
                                        )}>
                                            {expandedOwners[group.id]
                                                ? <ChevronDown className="h-4 w-4" />
                                                : <ChevronRight className="h-4 w-4" />}
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                                            {group.owner_name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-semibold text-slate-700 text-sm">{group.owner_name}</span>
                                        <span className="text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                                            {group.opportunities.length}
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>

                            {/* Opportunity rows under this owner */}
                            {expandedOwners[group.id] && group.opportunities.map(opp => (
                                <OppRow key={opp.id} opp={opp} onRowClick={handleRowClick} />
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
