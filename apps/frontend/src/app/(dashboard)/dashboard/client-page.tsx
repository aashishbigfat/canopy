"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    dashboardService,
    getLeaderBoardKPIs,
    getSalesChartData,
    getUserActivities,
    type DashboardData,
} from "@/features/dashboard/services/dashboardService";
import { LeaderBoardKPIs } from "@/features/dashboard/components/LeaderBoardKPIs";
import { SalesChart } from "@/features/dashboard/components/SalesChart";
import { UserActivities } from "@/features/dashboard/components/UserActivities";

export default function DashboardClientPage() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const data = await dashboardService.getDashboardData();
                setDashboardData(data);
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                setError("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex h-96 items-center justify-center">
                    <div className="text-center">
                        <h2 className="mb-4 text-2xl font-bold">Loading Dashboard...</h2>
                        <p className="text-muted-foreground">Please wait while we load your data.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex h-96 items-center justify-center">
                    <div className="text-center">
                        <h2 className="mb-4 text-2xl font-bold">Error</h2>
                        <p className="mb-4 text-muted-foreground">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-primary underline underline-offset-4 hover:no-underline"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="space-y-6">
                <div className="flex h-96 items-center justify-center">
                    <div className="text-center">
                        <h2 className="mb-4 text-2xl font-bold">No Data Available</h2>
                        <p className="text-muted-foreground">No dashboard data found.</p>
                    </div>
                </div>
            </div>
        );
    }

    const kpis = getLeaderBoardKPIs(dashboardData);
    const chartData = getSalesChartData(dashboardData);
    const closedAmount = dashboardData.stats?.total_revenue ?? 0;
    const openAmount = (dashboardData.stats?.active_opportunities ?? 0) * 10000; // placeholder
    const activities = getUserActivities(dashboardData);

    return (
        <div className="space-y-6">
            {/* Leader Board KPIs */}
            <LeaderBoardKPIs kpis={kpis} />

            {/* My Sales / Team Sales + Target chart | User Activities */}
            <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <SalesChart
                        data={chartData}
                        closedAmount={closedAmount}
                        openAmount={openAmount}
                    />
                </div>
                <div>
                    <UserActivities activities={activities} />
                </div>
            </div>

            {/* Tasks + Key Deals row (reference layout) */}
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                    <h3 className="mb-3 text-lg font-semibold">Tasks</h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                        Missed (0) | Payment (0)
                    </p>
                    <div className="space-y-2">
                        <Link
                            href="/tasks"
                            className="flex w-full items-center justify-between rounded-lg bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
                        >
                            Missed Task (0)
                            <span className="text-muted-foreground">→</span>
                        </Link>
                        <Link
                            href="/tasks"
                            className="flex w-full items-center justify-between rounded-lg bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
                        >
                            Today&apos;s Payment Reminder (0)
                            <span className="text-muted-foreground">→</span>
                        </Link>
                    </div>
                </div>
                <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                    <h3 className="mb-3 text-lg font-semibold">Key Deals</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-2 pr-2 font-medium">ID</th>
                                    <th className="pb-2 pr-2 font-medium">Name</th>
                                    <th className="pb-2 pr-2 font-medium">Travel Date</th>
                                    <th className="pb-2 pr-2 font-medium">Pax/Nights</th>
                                    <th className="pb-2 pr-2 font-medium">Stage</th>
                                    <th className="pb-2 font-medium">Owner</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b">
                                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                                        No key deals.{" "}
                                        <Link href="/opportunities" className="text-primary hover:underline">
                                            View opportunities
                                        </Link>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
