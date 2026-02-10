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
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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

    // Group opportunities by stage
    const opportunitiesByStage = useMemo(() => {
        const grouped: Record<string, Opportunity[]> = {};
        
        // Initialize all stages with empty arrays
        stages.forEach(stage => {
            grouped[stage.id] = [];
        });
        
        // Group opportunities
        opportunities.forEach(opp => {
            if (grouped[opp.sales_stage_id]) {
                grouped[opp.sales_stage_id].push(opp);
            }
        });
        
        return grouped;
    }, [opportunities, stages]);

    // Calculate totals per stage
    const stageTotals = useMemo(() => {
        const totals: Record<string, { count: number; amount: number }> = {};
        
        stages.forEach(stage => {
            const stageOpps = opportunitiesByStage[stage.id] || [];
            totals[stage.id] = {
                count: stageOpps.length,
                amount: stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0),
            };
        });
        
        return totals;
    }, [opportunitiesByStage, stages]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const opportunity = opportunities.find(opp => opp.id === active.id);
        if (opportunity) {
            setActiveOpportunity(opportunity);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveOpportunity(null);

        if (!over) return;

        const opportunityId = active.id as string;
        const newStageId = over.id as string;

        // Find the opportunity
        const opportunity = opportunities.find(opp => opp.id === opportunityId);
        if (!opportunity) return;

        // If dropped on same stage, do nothing
        if (opportunity.sales_stage_id === newStageId) return;

        // Update the stage
        try {
            await updateStage.mutateAsync({
                id: opportunityId,
                stageId: newStageId,
            });
            toast.success("Stage updated successfully");
        } catch (error) {
            toast.error("Failed to update stage");
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Optional: Handle drag over for visual feedback
    };

    // Sort stages by sorting field
    const sortedStages = useMemo(() => {
        return [...stages].sort((a, b) => (a.sorting || 0) - (b.sorting || 0));
    }, [stages]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
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
                    <KanbanCard
                        opportunity={activeOpportunity}
                        isDragging
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
