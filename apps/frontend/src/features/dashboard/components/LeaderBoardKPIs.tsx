"use client";

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
            <h2 className="text-xl font-semibold tracking-tight">Dashboard Leader Board Incentive</h2>
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
                            className={`rounded-lg px-4 py-3 text-center shadow-sm ${color}`}
                        >
                            <div className="text-xl font-bold">{display}</div>
                            <div className="text-xs font-medium opacity-95">{label}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
