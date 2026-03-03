"use client";

import React, { useState, useMemo } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Opportunity } from "../types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { useUpdateOpportunityStage } from "../api/useOpportunities";
import { toast } from "sonner";

export interface SalesStage {
    id: string;
    name: string;
    color?: string;
    probability?: number;
    is_won?: boolean;
    is_lost?: boolean;
    sorting?: number;
}

interface KanbanBoardProps {
    opportunities: Opportunity[];
    stages: SalesStage[];
    onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function KanbanBoard({ opportunities, stages, onOpportunityClick }: KanbanBoardProps) {
    const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
    const updateStage = useUpdateOpportunityStage();

    // Sort stages by sorting field
    const sortedStages = useMemo(() =>
        [...stages].sort((a, b) => (a.sorting || 0) - (b.sorting || 0)),
        [stages]
    );

    // Build a quick lookup: stageId → stage
    const stageById = useMemo(() => {
        const m: Record<string, SalesStage> = {};
        sortedStages.forEach(s => { m[s.id] = s; });
        return m;
    }, [sortedStages]);

    // Build a quick lookup: opportunityId → stageId (for resolving card drops)
    const oppStageMap = useMemo(() => {
        const m: Record<string, string> = {};
        opportunities.forEach(o => { m[o.id] = o.sales_stage_id; });
        return m;
    }, [opportunities]);

    // Group opportunities by stage
    const opportunitiesByStage = useMemo(() => {
        const grouped: Record<string, Opportunity[]> = {};
        sortedStages.forEach(s => { grouped[s.id] = []; });
        opportunities.forEach(opp => {
            if (grouped[opp.sales_stage_id]) {
                grouped[opp.sales_stage_id].push(opp);
            }
        });
        return grouped;
    }, [opportunities, sortedStages]);

    // Totals per stage
    const stageTotals = useMemo(() => {
        const totals: Record<string, { count: number; amount: number }> = {};
        sortedStages.forEach(stage => {
            const stageOpps = opportunitiesByStage[stage.id] || [];
            totals[stage.id] = {
                count: stageOpps.length,
                amount: stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0),
            };
        });
        return totals;
    }, [opportunitiesByStage, sortedStages]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        const opp = opportunities.find(o => o.id === event.active.id);
        if (opp) setActiveOpportunity(opp);
    };

    const handleDragOver = (_event: DragOverEvent) => {
        // Visual feedback is handled by KanbanColumn's isOver state from useDroppable
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveOpportunity(null);

        if (!over) return;

        const opportunityId = active.id as string;
        let targetStageId = over.id as string;

        // If dropped on a card (not a column), resolve to that card's stage
        if (!stageById[targetStageId]) {
            const mappedStage = oppStageMap[targetStageId];
            if (!mappedStage) return;
            targetStageId = mappedStage;
        }

        // Find the opportunity being moved
        const opp = opportunities.find(o => o.id === opportunityId);
        if (!opp) return;

        // Same stage → nothing to do
        if (opp.sales_stage_id === targetStageId) return;

        const targetStage = stageById[targetStageId];

        // Trigger mutation without awaiting it for immediate feel
        updateStage.mutate({ id: opportunityId, stageId: targetStageId });

        // Show toast immediately
        toast.success(
            `Moved to "${targetStage?.name ?? "new stage"}"` +
            (targetStage?.probability !== undefined
                ? ` · Probability → ${targetStage.probability}%`
                : "")
        );
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 px-4 pt-4 h-[calc(100vh-220px)] items-start">
                {sortedStages.map(stage => (
                    <KanbanColumn
                        key={stage.id}
                        stage={stage}
                        opportunities={opportunitiesByStage[stage.id] || []}
                        total={stageTotals[stage.id]}
                        onOpportunityClick={onOpportunityClick}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeOpportunity ? (
                    <KanbanCard opportunity={activeOpportunity} isDragging />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
