"use client";

import { ReportBuilder } from "@/features/reports/components/report-builder";

export default function NewReportPage() {
    return (
        <div className="crm-page">
            <div className="crm-surface flex items-center justify-between px-4 py-3">
                <h1>New Report</h1>
            </div>
            <div className="crm-surface p-4">
                <ReportBuilder />
            </div>
        </div>
    );
}
