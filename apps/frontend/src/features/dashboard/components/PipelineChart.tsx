"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { GitBranch } from "lucide-react";

interface PipelineStage {
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

const formatCurrency = (v: number) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(v);
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0]?.payload as PipelineStage;
    return (
        <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
            <p className="mb-1 text-sm font-bold text-slate-700">{data.stage}</p>
            <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{data.count}</span> opportunities
            </p>
            <p className="text-xs text-slate-500">
                Value: <span className="font-semibold text-emerald-600">{formatCurrency(data.value)}</span>
            </p>
        </div>
    );
};

export function PipelineChart({ stages }: { stages: PipelineStage[] }) {
    if (!stages || stages.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Pipeline by Stage</h3>
                <div className="flex h-[280px] flex-col items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <GitBranch className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-400">No pipeline data yet</p>
                    <p className="text-xs text-slate-300">
                        Stage distribution will appear as opportunities are created
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Pipeline by Stage</h3>
                <span className="text-xs font-semibold text-slate-400">
                    {stages.reduce((s, st) => s + st.count, 0)} total opportunities
                </span>
            </div>
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={stages}
                        margin={{ top: 8, right: 8, left: 0, bottom: 30 }}
                        barSize={36}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="stage"
                            tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            angle={-25}
                            textAnchor="end"
                            dy={10}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                        <Bar dataKey="count" name="Opportunities" radius={[8, 8, 0, 0]}>
                            {stages.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
