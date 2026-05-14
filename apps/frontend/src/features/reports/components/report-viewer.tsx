"use client";

import { useGetReport, useRunReport } from "@/features/reports/api/use-reports";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect } from "react";

interface ReportViewerProps {
    reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
    const { data: report, isLoading: isLoadingMeta } = useGetReport(reportId);
    // In a real app, useRunReport would fetch actual data based on config
    // Here we'll just mock or assume an endpoint returns data
    const { data: reportResult, isFetching, refetch } = useRunReport(reportId);

    useEffect(() => {
        if (reportId) {
            refetch();
        }
    }, [reportId, refetch]);

    if (isLoadingMeta) return <div className="crm-surface p-4">Loading report details...</div>;
    if (!report) return <div className="crm-surface p-4">Report not found</div>;

    return (
        <div className="space-y-4">
            <div className="crm-surface flex items-center justify-between px-4 py-3">
                <div>
                    <h2>{report.name}</h2>
                    <p className="text-sm text-muted-foreground">Module: {report.entity_type} | Type: {report.report_type}</p>
                </div>
                <Button onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? "Running..." : "Refresh Data"}
                </Button>
            </div>

            <div className="crm-surface min-h-[200px] p-4">
                {/* Chart Placeholder */}
                <div className="crm-empty-state h-40 mb-4">
                    Chart Visualization (Feature Placeholder)
                </div>

                {/* Data Table */}
                {isFetching ? <div className="text-center p-4">Fetching data...</div> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {report.columns.map(col => <TableHead key={col} className="capitalize">{col}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Mock Data Display if actual API not ready or empty */}
                            <TableRow>
                                <TableCell colSpan={report.columns.length} className="text-center h-24">
                                    {reportResult ? JSON.stringify(reportResult) : "No data loaded (Mock Endpoint)"}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
}
