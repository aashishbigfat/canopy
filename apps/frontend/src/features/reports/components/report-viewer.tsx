"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetReport, useRunReport } from "@/features/reports/api/use-reports";
import { formatDate } from "@/lib/format";

interface ReportViewerProps {
    reportId: string;
}

type ReportRow = Record<string, unknown>;

type DisplayColumn = {
    name: string;
    alias_name: string;
};

type ReportRunResult = {
    data?: ReportRow[];
    report_results?: ReportRow[];
    display_columns?: DisplayColumn[];
    add_display_columns?: DisplayColumn[];
    total?: number;
    total_rows?: number;
    closed_sum?: number | string;
    total_pessangers?: number | string;
    report_details?: {
        name?: string;
        report_type?: string;
    };
};

const dateColumns = new Set(["created_at", "updated_at", "dob", "close_date", "travel_date", "industry_data.travel_date", "converted_at"]);

function titleize(value: string) {
    return value.replace(/[_.]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isIsoDateString(value: unknown) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T|\b)/.test(value);
}

function cellText(value: unknown, columnName: string): string {
    if (value === null || value === undefined || value === "") return "-";
    if (dateColumns.has(columnName) || isIsoDateString(value)) return formatDate(String(value));
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (item && typeof item === "object" && "name" in item) return String(item.name ?? "");
                return String(item ?? "");
            })
            .filter(Boolean)
            .join(", ");
    }
    if (typeof value === "object") {
        if ("name" in value) return String(value.name ?? "-");
        return JSON.stringify(value);
    }
    return String(value);
}

function recordLink(entityType: string, columnName: string, row: ReportRow, isPersonAccount?: boolean) {
    const id = row.id ? String(row.id) : "";
    if (!id) return null;

    if (entityType === "accounts" && columnName === "name") return isPersonAccount ? `/person-accounts/${id}` : `/accounts/${id}`;
    if (entityType === "contacts" && ["first_name", "last_name", "name"].includes(columnName)) return `/contacts/${id}`;
    if (entityType === "leads" && ["first_name", "last_name", "name"].includes(columnName)) return `/leads/${id}`;
    if (entityType === "opportunities" && ["id", "name"].includes(columnName)) return `/opportunities/${id}`;
    if (entityType === "suppliers" && columnName === "name") return `/suppliers/${id}`;

    return null;
}

function downloadCsv(filename: string, columns: DisplayColumn[], rows: ReportRow[]) {
    const escape = (value: string) => {
        const normalized = value.replace(/"/g, '""');
        return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
    };
    const header = columns.map((column) => escape(column.alias_name)).join(",");
    const body = rows
        .map((row) => columns.map((column) => escape(cellText(row[column.name], column.name))).join(","))
        .join("\n");
    const csv = [header, body].filter(Boolean).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function ReportViewer({ reportId }: ReportViewerProps) {
    const [isExporting, setIsExporting] = useState(false);
    const { data: report, isLoading: isLoadingMeta } = useGetReport(reportId);
    const { data: reportResult, isFetching, refetch } = useRunReport(reportId);

    useEffect(() => {
        if (reportId) {
            refetch();
        }
    }, [reportId, refetch]);

    const result = reportResult as ReportRunResult | undefined;
    const rows = useMemo(() => result?.report_results || result?.data || [], [result]);
    const columns = useMemo<DisplayColumn[]>(() => {
        if (result?.display_columns?.length || result?.add_display_columns?.length) {
            return [...(result.display_columns || []), ...(result.add_display_columns || [])];
        }
        return (report?.columns || []).map((column) => ({
            name: column,
            alias_name: titleize(column),
        }));
    }, [report?.columns, result]);
    const total = result?.total ?? result?.total_rows ?? rows.length;

    if (isLoadingMeta) return <div className="p-4 text-sm text-muted-foreground">Loading report details...</div>;
    if (!report) return <div className="p-4 text-sm text-destructive">Report not found</div>;
    const reportTypeLabel = report.report_type === "custom" ? "Custom Report" : "Standard Report";
    const reportTitle = result?.report_details?.name || report.name;

    const handleExport = () => {
        setIsExporting(true);
        downloadCsv(`${reportTitle.replace(/\s+/g, "_")}.csv`, columns, rows);
        window.setTimeout(() => setIsExporting(false), 500);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500">{reportTypeLabel}</p>
                    <h1 className="text-xl font-semibold text-slate-950">{reportTitle}</h1>
                    <p className="text-sm text-slate-600">
                        {titleize(report.entity_type)} {total ? <span>({total})</span> : null}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/reports">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={!rows.length || isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? "Exporting..." : "Export"}
                    </Button>
                    <Button size="sm" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                        {isFetching ? "Refreshing..." : "Refresh"}
                    </Button>
                </div>
            </div>

            {result?.closed_sum ? (
                <div className="flex flex-wrap gap-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <span>
                        <strong>Closed Value</strong> - {result.closed_sum}
                    </span>
                    <span>
                        <strong>No Of PAX</strong> - {result.total_pessangers ?? "-"}
                    </span>
                </div>
            ) : null}

            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="max-h-[600px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-slate-100">
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead key={column.name} className="whitespace-nowrap text-xs font-semibold text-slate-800">
                                        {column.alias_name}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isFetching ? (
                                <TableRow>
                                    <TableCell colSpan={Math.max(columns.length, 1)} className="h-28 text-center text-sm text-muted-foreground">
                                        Fetching data...
                                    </TableCell>
                                </TableRow>
                            ) : rows.length ? (
                                rows.map((row, rowIndex) => (
                                    <TableRow key={`${row.id || rowIndex}`} className="text-sm">
                                        {columns.map((column) => {
                                            const value = cellText(row[column.name], column.name);
                                            const href = recordLink(report.entity_type, column.name, row, report.filters?.is_person_account === true);
                                            return (
                                                <TableCell key={column.name} className="max-w-[260px] truncate whitespace-nowrap" title={value}>
                                                    {href ? (
                                                        <Link href={href} className="font-medium text-[#f16a25] hover:underline">
                                                            {value}
                                                        </Link>
                                                    ) : (
                                                        value
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={Math.max(columns.length, 1)} className="h-28 text-center text-sm text-muted-foreground">
                                        No data found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
