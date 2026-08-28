import { ReportList } from "@/features/reports/components/report-list";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
    return (
        <div className="crm-page">
            <div className="px-1 py-2">
                <div>
                    <h1>Reports</h1>
                </div>
            </div>
            <div className="flex flex-1 flex-col space-y-6">
                <ReportList />
            </div>
        </div>
    );
}
