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
import { useIndustry, type IndustryType } from "@/lib/industry-labels";

interface GroupedOpportunityTableProps {
    data: Opportunity[];
    onOpportunityClick?: (opportunity: Opportunity) => void;
    groupByOwner?: boolean;
}

function getColHeader(industry: IndustryType) {
    return (
        <TableRow>
            <TableHead className="w-28 pl-6">ID</TableHead>
            <TableHead className="w-16">Segment</TableHead>
            <TableHead className="min-w-[180px]">Opportunity Name</TableHead>
            <TableHead>
                {industry === "travel" ? "Destination(s)" : industry === "healthcare" ? "Treatment" : industry === "education" ? "Program" : "Product"}
            </TableHead>
            <TableHead className="w-24">Acct. Type</TableHead>
            <TableHead className="min-w-[120px]">Account Name</TableHead>
            <TableHead className="w-28 text-right">Amount</TableHead>
            <TableHead className="w-28 text-center">Sales Stage</TableHead>
            <TableHead className="w-28">
                {industry === "travel" ? "Travel Date" : "Key Date"}
            </TableHead>
            <TableHead className="w-28">Close Date</TableHead>
            <TableHead className="w-28">Owner</TableHead>
            <TableHead className="w-20">Creation</TableHead>
        </TableRow>
    );
}

// ─── Utility helpers ──────────────────────────────────────────────────────────
function formatOppDate(dateStr?: string) {
    if (!dateStr) return "—";
    return formatDate(dateStr) || "—";
}

function getStageBadgeStyle(stageName?: string) {
    const n = (stageName || "").toLowerCase();
    if (n.includes("won")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (n.includes("lost")) return "bg-red-100 text-red-700 border-red-200";
    if (n.includes("proposal") || n === "pp") return "bg-primary/10 text-primary border-primary/20";
    if (n.includes("qualified") || n === "rq") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-primary/15 text-primary border-primary/30";
}

// ─── Single opportunity row ────────────────────────────────────────────────────
function OppRow({
    opp,
    onRowClick,
    industry,
}: {
    opp: Opportunity;
    onRowClick: (opp: Opportunity) => void;
    industry: IndustryType;
}) {
    const stageName = opp.sales_stage_name || opp.sales_stage_id?.slice(-4) || "—";
    return (
        <TableRow
            className="cursor-pointer border-b border-border transition-colors group hover:bg-muted/40"
            onClick={() => onRowClick(opp)}
        >
            {/* ID */}
            <TableCell className="pl-6 py-2.5">
                <span className="text-xs font-mono font-medium text-primary underline underline-offset-2">
                    {opp.id.slice(-6)}
                </span>
            </TableCell>

            {/* Segment */}
            <TableCell className="py-2.5">
                <span className={cn(
                    "text-[11px] font-bold px-1.5 py-0.5 rounded uppercase",
                    opp.segment === "B2B" ? "bg-violet-100 text-violet-700" : "bg-primary/10 text-primary"
                )}>
                    {opp.segment || "B2C"}
                </span>
            </TableCell>

            {/* Opportunity Name */}
            <TableCell className="py-2.5">
                <span className="text-xs font-semibold text-foreground group-hover:underline">
                    {opp.name}
                </span>
            </TableCell>

            {/* Destinations / Product / Program / Treatment */}
            <TableCell className="py-2.5 text-xs text-muted-foreground">
                {industry === "travel" ? (
                    opp.industry_data?.destination_names?.length ? opp.industry_data.destination_names.join(", ") : <span className="text-muted-foreground">—</span>
                ) : industry === "healthcare" ? (
                    (opp as any).industry_data?.chief_complaint || <span className="text-muted-foreground">—</span>
                ) : industry === "education" ? (
                    (opp as any).industry_data?.highest_qualification || <span className="text-muted-foreground">—</span>
                ) : industry === "manufacturing" ? (
                    (opp as any).industry_data?.product_category || <span className="text-muted-foreground">—</span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>

            {/* Account Type */}
            <TableCell className="py-2.5 text-xs text-foreground/80">
                {opp.type || <span className="text-muted-foreground">—</span>}
            </TableCell>

            {/* Account Name */}
            <TableCell className="py-2.5" onClick={e => e.stopPropagation()}>
                {opp.account_id ? (
                    <Link
                        href={`/accounts/${opp.account_id}`}
                        className="text-xs font-medium text-foreground hover:text-primary hover:underline"
                    >
                        {opp.account_name || "—"}
                    </Link>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                )}
            </TableCell>

            {/* Amount */}
            <TableCell className="py-2.5 text-right">
                <span className="text-xs font-semibold tabular-nums text-foreground">
                    {opp.amount ? formatCurrency(opp.amount) : <span className="text-muted-foreground">—</span>}
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

            {/* Travel Date / Key Date */}
            <TableCell className="py-2.5 text-xs text-foreground/80 tabular-nums whitespace-nowrap">
                {industry === "travel" ? (
                    formatOppDate(opp.industry_data?.travel_date)
                ) : industry === "healthcare" ? (
                    formatOppDate((opp as any).industry_data?.preferred_appointment_date)
                ) : industry === "education" ? (
                    formatOppDate((opp as any).industry_data?.preferred_start_date)
                ) : industry === "manufacturing" ? (
                    formatOppDate((opp as any).industry_data?.target_delivery_date)
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>

            {/* Close Date */}
            <TableCell className="py-2.5 text-xs text-foreground/80 tabular-nums whitespace-nowrap">
                {formatOppDate(opp.close_date)}
            </TableCell>

            {/* Owner */}
            <TableCell className="py-2.5 text-xs font-medium whitespace-nowrap text-foreground">
                {opp.owner_name || "—"}
            </TableCell>

            {/* Creation Type */}
            <TableCell className="py-2.5">
                <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                    (opp.creation_type || "").toLowerCase() === "auto"
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-foreground/80"
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
    const industry = useIndustry();
    const COL_HEADER = getColHeader(industry);
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
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <p className="font-medium">No opportunities found</p>
                <p className="text-sm mt-1">Try switching views or adding a new opportunity.</p>
            </div>
        );
    }

    // ── Flat view (all opportunities, no grouping) ─────────────────────────────
    if (!groupByOwner) {
        return (
            <div className="w-full overflow-x-auto">
                <Table className="min-w-[900px]">
                    <TableHeader className="sticky top-0 z-10">
                        {COL_HEADER}
                    </TableHeader>
                    <TableBody>
                        {data.map(opp => (
                            <OppRow key={opp.id} opp={opp} onRowClick={handleRowClick} industry={industry} />
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
                <TableHeader className="sticky top-0 z-10">
                    {COL_HEADER}
                </TableHeader>
                <TableBody>
                    {groupedData.map(group => (
                        <React.Fragment key={group.id}>
                            {/* Owner header row */}
                            <TableRow
                                className="cursor-pointer border-b border-border bg-muted/30 transition-colors hover:bg-muted/50"
                                onClick={() => toggleOwner(group.id)}
                            >
                                <TableCell colSpan={12} className="py-2.5 pl-4">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "transition-colors",
                                            expandedOwners[group.id] ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {expandedOwners[group.id]
                                                ? <ChevronDown className="h-4 w-4" />
                                                : <ChevronRight className="h-4 w-4" />}
                                        </div>
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                            {group.owner_name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-semibold text-foreground">{group.owner_name}</span>
                                        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                            {group.opportunities.length}
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>

                            {/* Opportunity rows under this owner */}
                            {expandedOwners[group.id] && group.opportunities.map(opp => (
                                <OppRow key={opp.id} opp={opp} onRowClick={handleRowClick} industry={industry} />
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
