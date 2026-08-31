import { CustomReportList } from "@/features/reports/components/custom-report-list";

export const dynamic = "force-dynamic";

export default function CustomReportsPage() {
    return (
        <div className="crm-page">
            <CustomReportList />
        </div>
    );
}
