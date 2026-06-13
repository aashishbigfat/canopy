"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Line,
    ReferenceLine,
    Legend,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import type { SalesChartPoint } from "@/features/dashboard/services/dashboardService";
import { useMounted } from "@/hooks/use-mounted";

const formatCurrency = (v: number) => {
    if (v >= 10_000_000) return `₹ ${(v / 10_000_000).toFixed(1)}Cr`;
    if (v >= 100_000) return `₹ ${(v / 100_000).toFixed(1)}L`;
    if (v >= 1_000) return `₹ ${(v / 1_000).toFixed(1)}K`;
    return `₹ ${v}`;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="rounded-xl border bg-popover px-4 py-3 shadow-xl">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Day {label}</p>
            {payload.map((entry: any, idx: number) => (
                <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
                    {entry.name}: {formatCurrency(Number(entry.value || 0))}
                </p>
            ))}
        </div>
    );
};

export function SalesChart({
    data,
    closedAmount = 0,
    openAmount = 0,
}: {
    data: SalesChartPoint[];
    closedAmount?: number;
    openAmount?: number;
}) {
    const [activeTab, setActiveTab] = useState<"my" | "team">("my");
    const mounted = useMounted();

    // Month labels derived from the current date so the chart always reflects
    // the live "this month" vs "last month" comparison and rolls over on its
    // own when the month changes — no hardcoded month names.
    const now = new Date();
    const thisMonthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthLabel = lastMonthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

    return (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
            {/* Header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                        <span className="text-sm font-semibold text-foreground">
                            Closed {formatCurrency(closedAmount)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                        <span className="text-sm font-semibold text-foreground">
                            Open {formatCurrency(openAmount)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-slate-500" />
                        <span className="text-sm font-semibold text-muted-foreground">Target</span>
                    </div>
                </div>
                <div className="flex rounded-full border bg-muted/40 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab("my")}
                        className={cn(
                            "rounded-full px-5 py-1.5 text-sm font-bold transition-all duration-300",
                            activeTab === "my"
                                ? "bg-card text-primary shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        My Sales
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("team")}
                        className={cn(
                            "rounded-full px-5 py-1.5 text-sm font-bold transition-all duration-300",
                            activeTab === "team"
                                ? "bg-card text-primary shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Team Sales
                    </button>
                </div>
            </div>

            {/* Chart */}
            {data.length === 0 ? (
                <div className="flex h-[280px] flex-col items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">
                        No chart data available yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Sales data will appear here as deals are closed
                    </p>
                </div>
            ) : (
                <div className="h-[300px] w-full">
                    {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradientLastMonth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="gradientThisMonth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }}
                                tickFormatter={(d) => `${d}`}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }}
                                tickFormatter={(v) => formatCurrency(v)}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="top"
                                height={32}
                                iconType="plainline"
                                wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                            />
                            <ReferenceLine
                                y={100000000}
                                stroke="#cbd5e1"
                                strokeDasharray="4 4"
                                label={{
                                    value: "Target",
                                    position: "insideTopRight",
                                    fill: "#94a3b8",
                                    fontSize: 11,
                                    fontWeight: 600,
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="sale_last_month"
                                name={lastMonthLabel}
                                stroke="#818cf8"
                                fill="url(#gradientLastMonth)"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, fill: "#818cf8", strokeWidth: 2, stroke: "#fff" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="sale_this_month"
                                name={thisMonthLabel}
                                stroke="#06b6d4"
                                fill="url(#gradientThisMonth)"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 2, stroke: "#fff" }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    )}
                </div>
            )}
        </div>
    );
}
