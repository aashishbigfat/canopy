"use client";

import { use } from "react";
import { ReportViewer } from "@/features/reports/components/report-viewer";

interface ReportPageProps {
    params: Promise<{ id: string }>;
}

export default function ReportPage({ params }: ReportPageProps) {
    const { id } = use(params);

    return (
        <div className="crm-page">
            <div className="crm-surface p-4">
                <ReportViewer reportId={id} />
            </div>
        </div>
    );
}
