"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Opportunity } from "../types";
import { KanbanCard } from "./KanbanCard";
import { SalesStage } from "./KanbanBoard";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface KanbanColumnProps {
    stage: SalesStage;
    opportunities: Opportunity[];
    total: { count: number; amount: number };
    onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function KanbanColumn({ stage, opportunities, total, onOpportunityClick }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });

    const stageColor = stage.color || "#6366f1";

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);

    const getHeaderStyle = () => {
        if (stage.is_won) return "border-green-400";
        if (stage.is_lost) return "border-red-400";
        return "";
    };

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col w-80 min-w-[320px] shrink-0 rounded-lg border bg-slate-50 h-full transition-all duration-150",
                isOver && "ring-2 ring-blue-400 ring-offset-1 bg-blue-50/30",
                getHeaderStyle()
            )}
        >
            {/* Column Header */}
            <div
                className="p-4 border-b rounded-t-lg"
                style={{ backgroundColor: stage.color ? `${stage.color}15` : undefined }}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stageColor }}
                        />
                        <h3 className="font-semibold text-slate-800 text-sm truncate">{stage.name}</h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 bg-white rounded-full shadow-sm text-slate-600 border">
                        {total.count}
                    </span>
                </div>

                {/* Amount + Probability */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-medium">{formatCurrency(total.amount)}</span>
                    {stage.probability !== undefined && (
                        <div className="flex items-center gap-1 ml-auto">
                            <TrendingUp className="h-3 w-3" />
                            <span className="font-semibold" style={{ color: stageColor }}>
                                {stage.probability}%
                            </span>
                        </div>
                    )}
                </div>

                {/* Probability bar */}
                {stage.probability !== undefined && (
                    <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${stage.probability}%`, backgroundColor: stageColor }}
                        />
                    </div>
                )}
            </div>

            {/* Cards container */}
            <SortableContext items={opportunities.map(o => o.id)} strategy={verticalListSortingStrategy}>
                <div
                    className={cn(
                        "flex-1 p-3 space-y-3 overflow-y-auto transition-colors duration-150",
                        isOver && "bg-blue-50/20"
                    )}
                >
                    {opportunities.map(opportunity => (
                        <KanbanCard
                            key={opportunity.id}
                            opportunity={opportunity}
                            onClick={() => onOpportunityClick?.(opportunity)}
                        />
                    ))}

                    {opportunities.length === 0 && (
                        <div className={cn(
                            "flex items-center justify-center h-28 text-sm rounded-lg border-2 border-dashed transition-colors duration-150",
                            isOver
                                ? "border-blue-400 bg-blue-50 text-blue-500 font-medium"
                                : "border-slate-200 text-slate-400"
                        )}>
                            {isOver ? "↓ Drop here" : "Drop here"}
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
}
