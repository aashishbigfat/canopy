"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    dashboardService,
    getLeaderBoardKPIs,
    getSalesChartData,
    type DashboardData,
} from "@/features/dashboard/services/dashboardService";
import { LeaderBoardKPIs } from "@/features/dashboard/components/LeaderBoardKPIs";
import { SalesChart } from "@/features/dashboard/components/SalesChart";
import { UserActivities } from "@/features/dashboard/components/UserActivities";
import { PipelineChart } from "@/features/dashboard/components/PipelineChart";

export default function DashboardClientPage() {
    const { data: queryData, isLoading: loading, error } = useQuery({
        queryKey: ["dashboard", "overview"],
        queryFn: async () => {
            const [data, stats, activityLogs, deals, tasks, pipeline] = await Promise.all([
                dashboardService.getDashboardData(),
                dashboardService.getStats(),
                dashboardService.getActivityLogs(),
                dashboardService.getKeyDeals().catch(() => []),
                dashboardService.getTaskSummary().catch(() => ({ missed_count: 0, payment_reminder_count: 0 })),
                dashboardService.getOpportunitiesByStage().catch(() => []),
            ]);

            // Merge real-time stats into the dashboard data if available
            if (data && stats) {
                data.stats = { ...data.stats, ...stats };
            }

            return {
                dashboardData: data,
                activities: activityLogs,
                keyDeals: deals,
                taskSummary: tasks || { missed_count: 0, payment_reminder_count: 0 },
                pipelineStages: pipeline || [],
            };
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Skeleton KPI cards */}
                <div className="space-y-4">
                    <div className="h-7 w-80 animate-pulse rounded-lg bg-slate-200" />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                        ))}
                    </div>
                </div>
                {/* Skeleton charts */}
                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2 h-[360px] animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-[360px] animate-pulse rounded-2xl bg-slate-100" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex h-96 items-center justify-center">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="mb-2 text-xl font-bold text-slate-800">Failed to load dashboard</h2>
                        <p className="mb-4 text-sm text-slate-500">Something went wrong while fetching your data</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { dashboardData, activities, keyDeals, taskSummary, pipelineStages } = queryData || {};

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
    const openAmount = (dashboardData.stats?.active_opportunities ?? 0) * 10000;

    const safeActivities = activities || [];
    const safeKeyDeals = keyDeals || [];
    const safePipelineStages = Array.isArray(pipelineStages) ? pipelineStages : [];

    return (
        <div className="space-y-6">
            {/* Leader Board KPIs */}
            <LeaderBoardKPIs kpis={kpis} />

            {/* Sales chart + Activity stream */}
            <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <SalesChart
                        data={chartData}
                        closedAmount={closedAmount}
                        openAmount={openAmount}
                    />
                </div>
                <div>
                    <UserActivities activities={safeActivities} />
                </div>
            </div>

            {/* Pipeline chart + Tasks row */}
            <div className="grid gap-6 lg:grid-cols-2">
                <PipelineChart stages={safePipelineStages} />

                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Recent Tasks</h3>
                        <p className="text-sm font-semibold text-slate-400 mt-1">
                            Missed ({taskSummary?.missed_count ?? 0}) | Payment ({taskSummary?.payment_reminder_count ?? 0})
                        </p>
                    </div>
                    <div className="space-y-3">
                        <Link
                            href="/tasks"
                            className="flex w-full items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-5 py-4 text-sm font-bold text-amber-900 transition-all hover:bg-amber-100 hover:shadow-sm"
                        >
                            <span className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200/60 text-amber-700">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </span>
                                Missed Tasks ({taskSummary?.missed_count ?? 0})
                            </span>
                            <span className="text-amber-400 font-bold text-lg">→</span>
                        </Link>
                        <Link
                            href="/tasks"
                            className="flex w-full items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm font-bold text-blue-900 transition-all hover:bg-blue-100 hover:shadow-sm"
                        >
                            <span className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-200/60 text-blue-700">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </span>
                                Today&apos;s Payment Reminder ({taskSummary?.payment_reminder_count ?? 0})
                            </span>
                            <span className="text-blue-400 font-bold text-lg">→</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Key Deals table */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm overflow-hidden">
                <h3 className="mb-5 text-lg font-bold text-slate-900">Key Deals</h3>
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
                            {safeKeyDeals.length > 0 ? (
                                safeKeyDeals.map((deal: any) => (
                                    <tr key={deal.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="py-3.5 pr-3 text-slate-500">
                                            <Link href={`/opportunities/${deal.id}`} className="hover:text-indigo-600 hover:underline">
                                                #{deal.id.substring(deal.id.length - 4)}
                                            </Link>
                                        </td>
                                        <td className="py-3.5 pr-3 font-semibold text-slate-900">
                                            <Link href={`/opportunities/${deal.id}`} className="hover:text-indigo-600 hover:underline">
                                                {deal.name}
                                            </Link>
                                        </td>
                                        <td className="py-3.5 pr-3 text-slate-500">{deal.travel_date || "-"}</td>
                                        <td className="py-3.5 pr-3 text-slate-500">
                                            {deal.pax || 0} / {deal.nights || 0}
                                        </td>
                                        <td className="py-3.5 pr-3">
                                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                                                {deal.stage}
                                            </span>
                                        </td>
                                        <td className="py-3.5 text-slate-500">{deal.owner_name}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr className="border-b">
                                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                        No key deals.{" "}
                                        <Link href="/opportunities" className="text-indigo-600 hover:underline font-semibold">
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
    );
}
