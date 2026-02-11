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
    const [activities, setActivities] = useState<any[]>([]);
    const [keyDeals, setKeyDeals] = useState<any[]>([]);
    const [taskSummary, setTaskSummary] = useState<any>({ missed_count: 0, payment_reminder_count: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [data, activityLogs, deals, tasks] = await Promise.all([
                    dashboardService.getDashboardData(),
                    dashboardService.getActivityLogs(),
                    dashboardService.getKeyDeals(),
                    dashboardService.getTaskSummary()
                ]);
                setDashboardData(data);
                setActivities(activityLogs);
                setKeyDeals(deals);
                setTaskSummary(tasks);
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
    const openAmount = (dashboardData.stats?.active_opportunities ?? 0) * 10000; // placeholder - backend could provide this

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

            {/* Tasks + Key Deals row */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Recent Tasks</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">
                            Missed ({taskSummary.missed_count}) | Payment ({taskSummary.payment_reminder_count})
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Link
                            href="/tasks"
                            className="flex w-full items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-5 py-4 text-sm font-bold text-amber-900 transition-all hover:bg-amber-100"
                        >
                            Missed Task ({taskSummary.missed_count})
                            <span className="text-amber-400 font-bold">→</span>
                        </Link>
                        <Link
                            href="/tasks"
                            className="flex w-full items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm font-bold text-blue-900 transition-all hover:bg-blue-100"
                        >
                            Today&apos;s Payment Reminder ({taskSummary.payment_reminder_count})
                            <span className="text-blue-400 font-bold">→</span>
                        </Link>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
                    <h3 className="mb-6 text-xl font-bold text-slate-900">Key Deals</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm font-medium">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-slate-400">
                                    <th className="pb-4 pr-3 font-bold uppercase tracking-wider text-[11px]">ID</th>
                                    <th className="pb-4 pr-3 font-bold uppercase tracking-wider text-[11px]">Name</th>
                                    <th className="pb-4 pr-3 font-bold uppercase tracking-wider text-[11px]">Travel Date</th>
                                    <th className="pb-4 pr-3 font-bold uppercase tracking-wider text-[11px]">Pax/Nights</th>
                                    <th className="pb-4 pr-3 font-bold uppercase tracking-wider text-[11px]">Stage</th>
                                    <th className="pb-4 font-bold uppercase tracking-wider text-[11px]">Owner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {keyDeals.length > 0 ? (
                                    keyDeals.map((deal) => (
                                        <tr key={deal.id} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="py-3 pr-3 text-slate-500">
                                                <Link href={`/opportunities/${deal.id}`} className="hover:text-primary hover:underline">
                                                    #{deal.id.substring(deal.id.length - 4)}
                                                </Link>
                                            </td>
                                            <td className="py-3 pr-3 font-semibold text-slate-900">
                                                <Link href={`/opportunities/${deal.id}`} className="hover:text-primary hover:underline">
                                                    {deal.name}
                                                </Link>
                                            </td>
                                            <td className="py-3 pr-3 text-slate-500">{deal.travel_date || "-"}</td>
                                            <td className="py-3 pr-3 text-slate-500">
                                                {deal.pax || 0} / {deal.nights || 0}
                                            </td>
                                            <td className="py-3 pr-3">
                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                                    {deal.stage}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-500">{deal.owner_name}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="border-b">
                                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                                            No key deals.{" "}
                                            <Link href="/opportunities" className="text-primary hover:underline">
                                                View opportunities
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
