"use client";

import { useSearchParams } from "next/navigation";
import { CustomReportsWorkspace } from "@/features/reports/components/custom-reports-workspace";
import { StandardReports } from "@/features/reports/components/standard-reports";

export function ReportsPageClient() {
    const searchParams = useSearchParams();
    const type = searchParams.get("type");

    if (type) {
        return (
            <div className="crm-page">
            <div className="crm-surface flex items-center justify-between px-4 py-3">
                    <h1>Reports</h1>
                </div>
                <CustomReportsWorkspace type={type} />
            </div>
        );
    }

    return (
        <div className="crm-page">
            <div className="crm-surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Reports</h1>
                </div>
            </div>
            <div className="crm-surface p-4">
                <StandardReports />
            </div>
        </div>
    );
}
