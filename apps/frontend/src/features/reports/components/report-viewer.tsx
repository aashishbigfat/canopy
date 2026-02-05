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

    if (isLoadingMeta) return <div>Loading report details...</div>;
    if (!report) return <div>Report not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">{report.name}</h2>
                    <p className="text-muted-foreground">Module: {report.entity_type} | Type: {report.report_type}</p>
                </div>
                <Button onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? "Running..." : "Refresh Data"}
                </Button>
            </div>

            <div className="border rounded-md p-4 min-h-[200px]">
                {/* Chart Placeholder */}
                <div className="h-40 bg-muted/20 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md mb-4">
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
