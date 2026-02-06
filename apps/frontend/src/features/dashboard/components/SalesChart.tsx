"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    ReferenceLine,
} from "recharts";
import type { SalesChartPoint } from "@/features/dashboard/services/dashboardService";

const formatCurrency = (v: number) => `₹ ${(v / 1_000_000).toFixed(0)}L`;

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

    return (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
                        <span className="text-sm font-bold text-slate-600">
                            Closed {formatCurrency(closedAmount)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                        <span className="text-sm font-bold text-slate-600">
                            Open {formatCurrency(openAmount)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                        <span className="text-sm font-bold text-slate-400">Target</span>
                    </div>
                </div>
                <div className="flex rounded-full border bg-slate-100/50 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab("my")}
                        className={cn(
                            "rounded-full px-6 py-1.5 text-sm font-bold transition-all duration-300",
                            activeTab === "my"
                                ? "bg-white text-indigo-700 shadow-md ring-1 ring-black/5"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        My Sales
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("team")}
                        className={cn(
                            "rounded-full px-6 py-1.5 text-sm font-bold transition-all duration-300",
                            activeTab === "team"
                                ? "bg-white text-indigo-700 shadow-md ring-1 ring-black/5"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Team Sales
                    </button>
                </div>
            </div>
            {data.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No chart data available yet.
                </div>
            ) : (
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(d) => `${d}`}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}`}
                                domain={[0, 100000000]}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(value: number | undefined) => [formatCurrency(Number(value || 0)), "Value"]}
                                labelFormatter={(label) => `Day ${label}`}
                            />
                            <ReferenceLine y={100000000} stroke="var(--muted-foreground)" strokeDasharray="2 2" />
                            <Area
                                type="monotone"
                                dataKey="sale_last_month"
                                name="Sale last month"
                                stroke="hsl(var(--chart-2))"
                                fill="hsl(var(--chart-2) / 0.3)"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="sale_this_month"
                                name="Sale this month"
                                stroke="hsl(var(--chart-1))"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
