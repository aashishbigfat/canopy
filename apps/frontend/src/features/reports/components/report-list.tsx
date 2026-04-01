"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGetReports, useDeleteReport } from "@/features/reports/api/use-reports";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Play } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export function ReportList() {
    const { data: reports = [], isLoading, isError } = useGetReports();
    const deleteReport = useDeleteReport();
    const router = useRouter();

    if (isLoading) return <div>Loading reports...</div>;
    if (isError) return <div>Error loading reports</div>;

    const handleDelete = async (id: string) => {
        if (confirm("Delete this report?")) {
            await deleteReport.mutateAsync(id);
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No reports found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        reports.map((report: any) => (
                            <TableRow key={report.id || report._id}>
                                <TableCell className="font-medium">
                                    <Link href={`/reports/${report.id || report._id}`} className="hover:underline">
                                        {report.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="capitalize">{report.entity_type}</TableCell>
                                <TableCell><Badge variant="outline">{report.report_type}</Badge></TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/reports/${report.id || report._id}`)}>
                                        <Play className="h-4 w-4 mr-1" /> Run
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/reports/${report.id || report._id}/edit`)}> {/* Add edit route later if needed */}
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(report.id || report._id)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
