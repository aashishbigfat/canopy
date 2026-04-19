import { ReportList } from "@/features/reports/components/report-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
    return (
        <div className="flex-1 space-y-4 p-4 sm:p-8 pt-4 sm:pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
                <div className="flex items-center space-x-2">
                    <Link href="/reports/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Report
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="flex-1 flex-col space-y-8 flex">
                <ReportList />
            </div>
        </div>
    );
}
