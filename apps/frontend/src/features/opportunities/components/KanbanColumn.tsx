"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Opportunity } from "../types";
import { KanbanCard } from "./KanbanCard";
import { SalesStage } from "./KanbanBoard";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp } from "lucide-react";

interface KanbanColumnProps {
    stage: SalesStage;
    opportunities: Opportunity[];
    total: { count: number; amount: number };
    onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function KanbanColumn({ stage, opportunities, total, onOpportunityClick }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
    });

    // Default colors if not provided
    const stageColor = stage.color || "#6366f1";

    // Determine header style based on stage type
    const getHeaderStyle = () => {
        if (stage.is_won) return "bg-green-500/10 border-green-500";
        if (stage.is_lost) return "bg-red-500/10 border-red-500";
        return "";
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col w-80 min-w-[320px] bg-slate-50 rounded-lg border",
                isOver && "ring-2 ring-blue-400 bg-blue-50/50",
                getHeaderStyle()
            )}
        >
            {/* Column Header */}
            <div
                className="p-3 border-b rounded-t-lg"
                style={{ backgroundColor: stage.color ? `${stage.color}15` : undefined }}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stageColor }}
                        />
                        <h3 className="font-semibold text-slate-900 truncate">
                            {stage.name}
                        </h3>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full shadow-sm">
                        {total.count}
                    </span>
                </div>

                {/* Stage Stats */}
                <div className="flex items-center gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatCurrency(total.amount)}</span>
                    </div>
                    {stage.probability !== undefined && (
                        <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>{stage.probability}%</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Cards Container */}
            <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[200px]">
                <SortableContext
                    items={opportunities.map(o => o.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {opportunities.map(opportunity => (
                        <KanbanCard
                            key={opportunity.id}
                            opportunity={opportunity}
                            onClick={() => onOpportunityClick?.(opportunity)}
                        />
                    ))}
                </SortableContext>

                {opportunities.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    );
}
