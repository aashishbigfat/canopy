"use client";

import { useState } from "react";
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
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Closed {formatCurrency(closedAmount)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                        Open {formatCurrency(openAmount)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span className="inline-block h-3 w-3 rounded border border-muted-foreground/50" />
                        Target
                    </span>
                </div>
                <div className="flex rounded-md border bg-muted/50 p-0.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab("my")}
                        className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                            activeTab === "my" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        My Sales
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("team")}
                        className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                            activeTab === "team" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                        }`}
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
                                tick={{ fontSize: 11 }}
                                tickFormatter={(d) => `${d}`}
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}`}
                                domain={[0, 100000000]}
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
