"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
    BadgeIndianRupee,
    BriefcaseBusiness,
    Building2,
    Eye,
    FileText,
    Handshake,
    Lightbulb,
    ListFilter,
    Users,
} from "lucide-react";

import { useGetBdReportList, useGetReports } from "@/features/reports/api/use-reports";

type ReportItem = {
    id?: string;
    _id?: string;
    name: string;
    entity_type: string;
    report_type?: string;
    filters?: Record<string, any>;
};

type ReportGroup = {
    key: string;
    title: string;
    colorClass: string;
    icon: ComponentType<{ className?: string }>;
    reports: ReportItem[];
    customType?: string;
    staticItems?: Array<{ name: string; href: string }>;
    total?: number;
    showTotalNumber?: boolean;
    emptyText?: string | null;
};

const reportOrder = [
    "Accounts created Today", "Accounts created in Current Week", "Accounts created in Current Month",
    "Accounts created in Current Financial Quarter", "Accounts created in Current Financial Year", "Accounts created Yesterday",
    "Accounts created Last Week", "Accounts created Last Month", "Accounts created in Last Financial Quarter", "Accounts created in Last Financial Year",
    "Contacts created Today", "Contacts created in Current Week", "Contacts created in Current Month",
    "Contacts created in Current Financial Quarter", "Contacts created in Current Financial Year", "Contacts created Yesterday",
    "Contacts created Last Week", "Contacts created Last Month", "Contacts created in Last Financial Quarter", "Contacts created in Last Financial Year",
    "Person Accounts created Today", "Person Accounts created in Current Week", "Person Accounts created in Current Month",
    "Person Accounts created in Current Financial Quarter", "Person Accounts created in Current Financial Year", "Person Accounts created Yesterday",
    "Person Accounts created Last Week", "Person Accounts created Last Month", "Person Accounts created in Last Financial Quarter", "Person Accounts created in Last Financial Year",
    "Leads created Today", "Leads created in Current Week", "Leads created in Current Month",
    "Leads created in Current Financial Quarter", "Leads created in Current Financial Year", "Leads created Yesterday",
    "Leads created Last Week", "Leads created Last Month", "Leads created in Last Financial Quarter", "Leads created in Last Financial Year",
    "Opportunities Closed Today", "Opportunities Closed in Current Week", "Opportunities Closed in Current Month",
    "Opportunities Closed in Current Financial Quarter", "Opportunities Closed in Current Financial Year", "Opportunities Closed Yesterday",
    "Opportunities Closed Last Week", "Opportunities Closed Last Month", "Opportunities Closed Last Financial Quarter", "Opportunities Closed Last Financial Year",
    "Opportunities created Today", "Opportunities created Current Week", "Opportunities created Current Month",
    "Opportunities created Current Financial Quarter", "Opportunities created Current Financial Year", "Opportunities created Yesterday",
    "Opportunities created Last Week", "Opportunities created Last Month", "Opportunities created in Last Financial Quarter", "Opportunities created in Last Financial Year",
    "Passenger Travel Today", "Passenger Travel in Current Week", "Passenger Travel in Current Month",
    "Passenger Travel in Current Financial Quarter", "Passenger Travel in Current Financial Year", "Passenger Travelled Yesterday",
    "Passenger Travelled in Previous Week", "Passenger Travelled in Previous Month", "Passenger Travelled in Previous Financial Quarter", "Passenger Travelled in Previous Financial Year",
    "Passenger Travelling Tomorrow", "Passenger Travelling Next Week", "Passenger Travelling Next Month",
    "Passenger Travelling in Next Financial Quarter", "Passenger Travelling in Next Financial Year",
    "Month Performance", "Segment wise Business", "Opportunity Country wise", "Monthly Target/Achieved", "Opportunity Assigned", "Opportunity Claimed",
    "Supplier created Today", "Supplier created in Current Week", "Supplier created in Current Month",
    "Supplier created in Current Financial Quarter", "Supplier created in Current Financial Year", "Supplier created Yesterday",
    "Supplier created Last Week", "Supplier created Last Month", "Supplier created in Last Financial Quarter", "Supplier created in Last Financial Year",
];

const orderIndex = new Map(reportOrder.map((name, index) => [name, index]));

const sortReports = (reports: ReportItem[]) => {
    return [...reports].sort((a, b) => {
        const aIndex = orderIndex.get(a.name) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = orderIndex.get(b.name) ?? Number.MAX_SAFE_INTEGER;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.name.localeCompare(b.name);
    });
};

const isPersonAccountReport = (report: ReportItem) => {
    return report.entity_type === "accounts" && report.filters?.is_person_account === true;
};

const isCompanyAccountReport = (report: ReportItem) => {
    return report.entity_type === "accounts" && report.filters?.is_person_account !== true;
};

function ReportCard({ group }: { group: ReportGroup }) {
    const [expanded, setExpanded] = useState(false);
    const Icon = group.icon;
    const allItems = [
        ...group.reports.map((report) => ({
            name: report.name,
            href: `/reports/${report.id || report._id}`,
        })),
        ...(group.staticItems || []),
    ];
    const shouldLimit = group.key === "opportunities" && allItems.length > 10;
    const visibleItems = shouldLimit && !expanded ? allItems.slice(0, 10) : allItems;
    const total = group.total ?? allItems.length;
    const showTotalNumber = group.showTotalNumber ?? true;

    return (
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 px-2 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${group.colorClass}`}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold leading-5 text-slate-900">{group.title}</h3>
                        <p className="text-xs text-slate-600">
                            Total Reports {showTotalNumber ? <span>({total})</span> : null}
                        </p>
                    </div>
                </div>
                {group.customType ? (
                    <Link
                        href={`/reports/custom?type=${group.customType}`}
                        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80"
                    >
                        Custom Report
                    </Link>
                ) : null}
            </div>

            <ul className="min-h-[132px] px-2">
                {visibleItems.length ? (
                    visibleItems.map((item, index) => (
                        <li key={`${item.href}-${index}`} className="border-b border-slate-100 last:border-b-0">
                            <Link
                                href={item.href}
                                className="flex min-h-8 items-center justify-between gap-3 py-[5px] text-sm text-[#f16a25] hover:text-[#d85615] hover:underline"
                            >
                                <span className="min-w-0 truncate">
                                    <strong className="mr-1 text-slate-900">{index + 1}.</strong>
                                    {item.name}
                                </span>
                                <Eye className="h-4 w-4 shrink-0 text-sky-600" />
                            </Link>
                        </li>
                    ))
                ) : group.emptyText === null ? null : (
                    <li className="px-3 py-8 text-center text-sm text-muted-foreground">No reports found.</li>
                )}
            </ul>

            {shouldLimit ? (
                <div className="px-2 pb-2 pt-1 text-right">
                    <button
                        type="button"
                        className="text-sm font-medium text-[#f16a25] hover:underline"
                        onClick={() => setExpanded((value) => !value)}
                    >
                        {expanded ? "Show Less" : "Show All"}
                    </button>
                </div>
            ) : null}
        </section>
    );
}

export function ReportList() {
    const { data: reports = [], isLoading, isError } = useGetReports();
    const { data: bdReports = [], isLoading: isBdLoading, isError: isBdError } = useGetBdReportList();

    const groups = useMemo<ReportGroup[]>(() => {
        const allReports = reports as ReportItem[];
        const standardReports = allReports.filter((report) => report.report_type !== "custom");
        const leadReports = sortReports(standardReports.filter((report) => report.entity_type === "leads"));
        const leadReport = leadReports.find((report) => report.name === "Leads created Today") || leadReports[0];
        const bdReportItems = bdReports
            .filter((report) => report.id && report.name)
            .map((report) => ({
                name: report.name || "",
                href: `/bd/visits?owner_id=${report.id}`,
            }));

        return [
            {
                key: "accounts",
                title: "Accounts",
                colorClass: "bg-sky-500",
                icon: BriefcaseBusiness,
                customType: "accounts",
                reports: sortReports(standardReports.filter(isCompanyAccountReport)),
            },
            {
                key: "contacts",
                title: "Contacts",
                colorClass: "bg-amber-500",
                icon: Users,
                customType: "contacts",
                reports: sortReports(standardReports.filter((report) => report.entity_type === "contacts")),
            },
            {
                key: "person_accounts",
                title: "Person Account",
                colorClass: "bg-pink-500",
                icon: Building2,
                customType: "personal_accounts",
                reports: sortReports(standardReports.filter(isPersonAccountReport)),
            },
            {
                key: "leads",
                title: "Leads",
                colorClass: "bg-emerald-500",
                icon: ListFilter,
                customType: "leads",
                reports: leadReports,
                staticItems: [
                    { name: "Leads Converted Reports", href: "/reports/standard/lead-conversion" },
                    leadReport
                        ? { name: "Lead Report", href: `/reports/${leadReport.id || leadReport._id}` }
                        : { name: "Lead Report", href: "/reports/new?type=leads" },
                ],
            },
            {
                key: "opportunities",
                title: "Opportunities",
                colorClass: "bg-blue-600",
                icon: Lightbulb,
                customType: "opportunities",
                reports: sortReports(standardReports.filter((report) => report.entity_type === "opportunities")),
            },
            {
                key: "supplier",
                title: "Supplier",
                colorClass: "bg-violet-500",
                icon: Handshake,
                customType: "supplier",
                reports: sortReports(standardReports.filter((report) => report.entity_type === "suppliers")),
            },
            {
                key: "bd_reports",
                title: "BD Reports",
                colorClass: "bg-cyan-600",
                icon: FileText,
                reports: [],
                staticItems: bdReportItems,
                emptyText: null,
            },
            {
                key: "incentives",
                title: "Incentive Department",
                colorClass: "bg-rose-500",
                icon: BadgeIndianRupee,
                reports: [],
                showTotalNumber: false,
                staticItems: [{ name: "All Incentives", href: "/dashboard/incentive" }],
            },
        ];
    }, [bdReports, reports]);

    if (isLoading || isBdLoading) return <div className="p-4 text-sm text-muted-foreground">Loading reports...</div>;
    if (isError || isBdError) return <div className="p-4 text-sm text-destructive">Error loading reports</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
                <ReportCard key={group.key} group={group} />
            ))}
        </div>
    );
}
