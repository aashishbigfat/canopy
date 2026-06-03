"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { GitBranch } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export interface PipelineStage {
    stage: string;
    count: number;
    value: number;
}

const STAGE_COLORS = [
    "#8b5cf6", // violet
    "#6366f1", // indigo
    "#3b82f6", // blue
    "#06b6d4", // cyan
    "#14b8a6", // teal
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
];

interface PieDatum extends PipelineStage {
    color: string;
    share: number; // percentage (0-100) among the currently selected stages
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0]?.payload as PieDatum;
    return (
        <div className="rounded-xl border bg-popover px-4 py-3 shadow-xl">
            <p className="mb-1 text-sm font-semibold text-foreground">{data.stage}</p>
            <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{data.count}</span> opportunities
                {" "}
                <span className="font-semibold text-foreground">({data.share.toFixed(2)}%)</span>
            </p>
            <p className="text-xs text-muted-foreground">
                Value: <span className="font-semibold text-emerald-600">{formatCurrency(data.value)}</span>
            </p>
        </div>
    );
};

export function PipelineChart({ stages }: { stages: PipelineStage[] }) {
    // Stages the user has deselected via the legend.
    const [hidden, setHidden] = useState<Set<string>>(new Set());

    if (!stages || stages.length === 0) {
        return (
            <div className="rounded-lg border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Pipeline by Stage</h3>
                <div className="flex h-[280px] flex-col items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <GitBranch className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">No pipeline data yet</p>
                    <p className="text-xs text-muted-foreground">
                        Stage distribution will appear as opportunities are created
                    </p>
                </div>
            </div>
        );
    }

    const toggle = (name: string) => {
        setHidden((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    // Stable colour per stage (index in the full list) so colours don't shift on toggle.
    const colorOf = (name: string) =>
        STAGE_COLORS[stages.findIndex((s) => s.stage === name) % STAGE_COLORS.length];

    // Only selected stages contribute to the pie + percentage base.
    const activeTotal = stages
        .filter((s) => !hidden.has(s.stage))
        .reduce((sum, s) => sum + s.count, 0);

    const pieData: PieDatum[] = stages
        .filter((s) => !hidden.has(s.stage))
        .map((s) => ({
            ...s,
            color: colorOf(s.stage),
            share: activeTotal ? (s.count / activeTotal) * 100 : 0,
        }));

    const totalCount = stages.reduce((sum, s) => sum + s.count, 0);

    return (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Pipeline by Stage</h3>
                <span className="text-xs font-semibold text-muted-foreground">
                    {totalCount} total opportunities
                </span>
            </div>

            {/* Interactive legend — click to toggle a stage in/out of the chart. */}
            <div className="mb-2 flex flex-wrap gap-x-5 gap-y-2">
                {stages.map((s) => {
                    const isHidden = hidden.has(s.stage);
                    const pct = activeTotal && !isHidden ? (s.count / activeTotal) * 100 : 0;
                    return (
                        <button
                            key={s.stage}
                            type="button"
                            onClick={() => toggle(s.stage)}
                            className="flex items-center gap-2 text-xs font-medium transition-opacity"
                            style={{ opacity: isHidden ? 0.4 : 1 }}
                        >
                            <span
                                className="inline-block h-3 w-3 rounded-sm"
                                style={{ backgroundColor: colorOf(s.stage) }}
                            />
                            <span
                                className={
                                    isHidden
                                        ? "text-muted-foreground line-through"
                                        : "text-foreground"
                                }
                            >
                                {s.stage} {pct.toFixed(2)}%
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="h-[280px] w-full">
                {pieData.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                            Select a stage to see the distribution
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Pie
                                data={pieData}
                                dataKey="count"
                                nameKey="stage"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                innerRadius={0}
                                stroke="var(--card)"
                                strokeWidth={2}
                                isAnimationActive={false}
                                label={(entry: any) =>
                                    `${Number(entry.share ?? 0).toFixed(1)}%`
                                }
                                labelLine={false}
                            >
                                {pieData.map((entry) => (
                                    <Cell key={entry.stage} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
