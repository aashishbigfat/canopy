"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { reportsExtraService } from "@/lib/api/services/reports-extra.service";

const STANDARD_REPORTS: Record<string, (filters: Record<string, any>) => Promise<any>> = {
    accounts: reportsExtraService.accounts,
    personalAccounts: reportsExtraService.personalAccounts,
    accountContact: reportsExtraService.accountContact,
    leads: reportsExtraService.leads,
    leadConversion: reportsExtraService.leadConversion,
    opportunities: reportsExtraService.opportunities,
    oppByCountry: reportsExtraService.oppByCountry,
    salesStage: reportsExtraService.salesStage,
    userPerformance: reportsExtraService.userPerformance,
    activeUsers: reportsExtraService.activeUsers,
    tasks: reportsExtraService.tasks,
    suppliers: reportsExtraService.suppliers,
};

function exportCsv(reportName: string, columns: string[], rows: Array<Record<string, any>>) {
    const escape = (value: any) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
        columns.map(escape).join(","),
        ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "report"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export function StandardReportDetail() {
    const searchParams = useSearchParams();
    const reportKey = searchParams.get("report") || "leads";
    const name = searchParams.get("name") || "Standard Report";
    const rangeType = searchParams.get("range_type") || undefined;
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const rows: Array<Record<string, any>> = result?.report_results || result?.rows || [];
    const columns: string[] = result?.display_columns || (rows[0] ? Object.keys(rows[0]) : []);
    const totals = result?.totals || {};
    const reportName = result?.report_name || name;
    const runner = useMemo(() => STANDARD_REPORTS[reportKey], [reportKey]);

    const runReport = async () => {
        if (!runner) {
            setError("Report not found");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await runner({ extras: { limit: 1000, range_type: rangeType } });
            setResult(data);
        } catch (err: any) {
            setError(err?.response?.data?.detail || err?.message || "Failed to run report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportKey, rangeType]);

    return (
        <div className="crm-page">
            <div className="crm-surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Standard Report</h1>
                    <p className="text-sm text-muted-foreground">
                        {reportName} {totals.row_count != null ? `(${totals.row_count})` : ""}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/reports">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={runReport} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={rows.length === 0}
                        onClick={() => exportCsv(reportName, columns, rows)}
                    >
                        <FileDown className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            <div className="crm-surface">
                <div className="grid gap-2 border-b p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <span className="text-muted-foreground">Report Type</span>
                        <p className="font-semibold">Standard</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Rows</span>
                        <p className="font-semibold">{totals.row_count ?? rows.length}</p>
                    </div>
                    {"amount" in totals && (
                        <div>
                            <span className="text-muted-foreground">Amount</span>
                            <p className="font-semibold">{totals.amount}</p>
                        </div>
                    )}
                    {"converted" in totals && (
                        <div>
                            <span className="text-muted-foreground">Converted</span>
                            <p className="font-semibold">{totals.converted}</p>
                        </div>
                    )}
                </div>

                {error ? (
                    <div className="p-4 text-sm text-destructive">{error}</div>
                ) : (
                    <div className="max-h-[600px] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-card">
                                <TableRow>
                                    {columns.length === 0 ? (
                                        <TableHead>Report</TableHead>
                                    ) : columns.map((column) => (
                                        <TableHead key={column} className="whitespace-nowrap">{column}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={Math.max(columns.length, 1)} className="h-24 text-center">
                                            {loading ? "Loading report..." : "No report data found."}
                                        </TableCell>
                                    </TableRow>
                                ) : rows.map((row, index) => (
                                    <TableRow key={row.id || index}>
                                        {columns.map((column) => (
                                            <TableCell
                                                key={column}
                                                className="max-w-[280px] truncate"
                                                title={row[column] == null ? "" : String(row[column])}
                                            >
                                                {row[column] == null || row[column] === "" ? "-" : String(row[column])}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
