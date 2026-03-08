"use client";

import { use } from "react";
import { ReportViewer } from "@/features/reports/components/report-viewer";

interface ReportPageProps {
    params: Promise<{ id: string }>;
}

export default function ReportPage({ params }: ReportPageProps) {
    const { id } = use(params);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <ReportViewer reportId={id} />
        </div>
    );
}
