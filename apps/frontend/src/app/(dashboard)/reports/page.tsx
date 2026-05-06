import { ReportList } from "@/features/reports/components/report-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
    return (
        <div className="crm-page">
            <div className="crm-surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Reports</h1>
                    <p className="text-sm text-muted-foreground">Build and review CRM performance snapshots.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Link href="/reports/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Report
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="crm-surface flex flex-1 flex-col space-y-6 p-4">
                <ReportList />
            </div>
        </div>
    );
}
