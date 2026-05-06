"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Opportunity } from "../types";
import { KanbanCard } from "./KanbanCard";
import { SalesStage } from "./KanbanBoard";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface KanbanColumnProps {
    stage: SalesStage;
    opportunities: Opportunity[];
    total: { count: number; amount: number };
    onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function KanbanColumn({ stage, opportunities, total, onOpportunityClick }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });

    const stageColor = stage.color || "#6366f1";


    const getHeaderStyle = () => {
        if (stage.is_won) return "border-green-400";
        if (stage.is_lost) return "border-red-400";
        return "";
    };

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex h-full w-80 min-w-[320px] shrink-0 flex-col rounded-lg border border-border bg-card transition-all duration-150",
                isOver && "bg-primary/5 ring-2 ring-primary/40 ring-offset-1",
                getHeaderStyle()
            )}
        >
            {/* Column Header */}
            <div
                className="rounded-t-lg border-b border-border p-4"
                style={{ backgroundColor: stage.color ? `${stage.color}15` : undefined }}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stageColor }}
                        />
                        <h3 className="truncate text-sm font-semibold text-foreground">{stage.name}</h3>
                    </div>
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-bold text-foreground">
                        {total.count}
                    </span>
                </div>

                {/* Amount + Probability */}
                <div className="flex items-center gap-4 text-xs text-foreground/80">
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
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80">
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
                        isOver && "bg-primary/5"
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
                                ? "border-primary/60 bg-primary/10 font-medium text-primary"
                                : "border-border text-muted-foreground"
                        )}>
                            {isOver ? "↓ Drop here" : "Drop here"}
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
}
