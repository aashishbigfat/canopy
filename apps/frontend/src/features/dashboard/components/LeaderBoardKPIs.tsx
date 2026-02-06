"use client";

import { cn } from "@/lib/utils";
import type { LeaderBoardKPIs as LeaderBoardKPIsType } from "@/features/dashboard/services/dashboardService";

const KPI_CARDS: { key: keyof LeaderBoardKPIsType; label: string; color: string; format?: "currency" }[] = [
    { key: "total_opportunities", label: "Total Opportunities", color: "bg-pink-500/90 text-white" },
    { key: "today_opportunities", label: "Today's Opportunities", color: "bg-blue-600 text-white" },
    { key: "open_opportunities", label: "Open Opportunities", color: "bg-sky-400 text-white" },
    { key: "b2c_open_opportunities", label: "B2C Open Opportunities", color: "bg-emerald-500 text-white" },
    { key: "b2b_open_opportunities", label: "B2B Open Opportunities", color: "bg-red-500 text-white" },
    { key: "today_checkout", label: "Today's Checkout", color: "bg-emerald-600 text-white" },
    { key: "tomorrow_departures", label: "Tomorrow's Departures", color: "bg-blue-600 text-white" },
    { key: "today_revenue", label: "Today's Revenue", color: "bg-pink-500/90 text-white", format: "currency" },
];

export function LeaderBoardKPIs({ kpis }: { kpis: LeaderBoardKPIsType }) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Leader Board Incentive</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {KPI_CARDS.map(({ key, label, color, format }) => {
                    const value = kpis[key] ?? 0;
                    const display =
                        format === "currency"
                            ? `₹ ${Number(value).toLocaleString("en-IN")}`
                            : Number(value).toLocaleString();
                    return (
                        <div
                            key={key}
                            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden group"
                        >
                            {/* Top accent bar */}
                            <div className={cn("absolute top-0 left-0 right-0 h-1.5", color.replace("text-white", ""))} />

                            <div className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-1 group-hover:text-slate-600 transition-colors">
                                {label}
                            </div>
                            <div className="text-2xl font-black tracking-tight text-indigo-600 md:text-3xl">
                                {display}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
