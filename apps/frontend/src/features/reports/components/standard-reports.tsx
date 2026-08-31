"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    BadgeDollarSign,
    BriefcaseBusiness,
    ChevronDown,
    ChevronUp,
    ContactRound,
    Eye,
    Filter,
    Lightbulb,
    Plus,
    UserCheck,
    UserRoundCog,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    reportsExtraService,
    type StandardReportDefinition,
} from "@/lib/api/services/reports-extra.service";

type ReportGroup = {
    title: string;
    tone: string;
    customType: string;
    icon: ReactNode;
    showCustom?: boolean;
};

const GROUPS: ReportGroup[] = [
    {
        title: "Accounts",
        tone: "bg-sky-500",
        customType: "accounts",
        icon: <BriefcaseBusiness className="h-5 w-5" />,
    },
    {
        title: "Contacts",
        tone: "bg-amber-500",
        customType: "contacts",
        icon: <ContactRound className="h-5 w-5" />,
    },
    {
        title: "Person Account",
        tone: "bg-rose-500",
        customType: "personal_accounts",
        icon: <UserCheck className="h-5 w-5" />,
    },
    {
        title: "Leads",
        tone: "bg-emerald-500",
        customType: "leads",
        icon: <Filter className="h-5 w-5" />,
    },
    {
        title: "Opportunities",
        tone: "bg-blue-600",
        customType: "opportunities",
        icon: <Lightbulb className="h-5 w-5" />,
    },
    {
        title: "Supplier",
        tone: "bg-indigo-500",
        customType: "supplier",
        icon: <Users className="h-5 w-5" />,
    },
    {
        title: "BD Reports",
        tone: "bg-cyan-600",
        customType: "bd_reports",
        icon: <UserRoundCog className="h-5 w-5" />,
        showCustom: false,
    },
    {
        title: "Incentive Department",
        tone: "bg-violet-600",
        customType: "incentive_department",
        icon: <BadgeDollarSign className="h-5 w-5" />,
        showCustom: false,
    },
];

export function StandardReports() {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const { data, isLoading, isError } = useQuery({
        queryKey: ["standard-report-list"],
        queryFn: reportsExtraService.standardList,
    });

    const reportsByType = new Map(
        (data?.groups || []).map((group) => [group.type, group.reports])
    );

    return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {GROUPS.map((group) => {
                const reports: StandardReportDefinition[] = reportsByType.get(group.customType) || [];
                const canToggle = ["opportunities", "bd_reports"].includes(group.customType) && reports.length > 10;
                const isExpanded = expandedGroups[group.customType] || false;
                const visibleReports = canToggle && !isExpanded ? reports.slice(0, 10) : reports;

                return (
                    <section key={group.title} className="rounded-md border bg-card">
                        <div className="flex items-center justify-between gap-3 border-b p-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded text-white ${group.tone}`}>
                                    {group.icon}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate text-base font-semibold">{group.title}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Total Reports <span>({reports.length})</span>
                                    </p>
                                </div>
                            </div>
                            {group.showCustom !== false && (
                                <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
                                    <Link href={`/reports?type=${group.customType}`}>
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        Custom Report
                                    </Link>
                                </Button>
                            )}
                        </div>
                        <ul className="divide-y">
                            {isLoading ? (
                                <li className="px-3 py-2 text-sm text-muted-foreground">Loading reports...</li>
                            ) : isError ? (
                                <li className="px-3 py-2 text-sm text-destructive">Unable to load reports.</li>
                            ) : reports.length === 0 ? (
                                <li className="px-3 py-2 text-sm text-muted-foreground">No reports found.</li>
                            ) : visibleReports.map((report, index) => {
                                const standardHref = `/reports/standard?report=${report.key}&name=${encodeURIComponent(report.name)}${report.date_range_type ? `&range_type=${report.date_range_type}` : ""}`;
                                return (
                                    <li key={`${group.title}-${report.key}-${report.name}`}>
                                        <Link
                                            href={report.href || standardHref}
                                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-orange-600 transition hover:bg-muted/60"
                                        >
                                            <span className="min-w-0 truncate">
                                                <strong className="mr-1 text-foreground">{index + 1}.</strong>
                                                {report.name}
                                            </span>
                                            <Eye className="h-4 w-4 shrink-0 text-sky-500" />
                                        </Link>
                                    </li>
                                );
                            })}
                            {!isLoading && !isError && canToggle && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedGroups((value) => ({
                                            ...value,
                                            [group.customType]: !isExpanded,
                                        }))}
                                        className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-muted/60"
                                    >
                                        {isExpanded ? (
                                            <>
                                                <ChevronUp className="h-4 w-4" />
                                                Show less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4" />
                                                Show all {reports.length}
                                            </>
                                        )}
                                    </button>
                                </li>
                            )}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
