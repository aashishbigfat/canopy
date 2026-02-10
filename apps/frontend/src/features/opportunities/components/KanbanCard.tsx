"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Opportunity } from "../types";
import { cn } from "@/lib/utils";
import {
    Calendar,
    DollarSign,
    User,
    Building2,
    GripVertical,
    Star
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface KanbanCardProps {
    opportunity: Opportunity;
    isDragging?: boolean;
    onClick?: () => void;
}

export function KanbanCard({ opportunity, isDragging, onClick }: KanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: opportunity.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        try {
            return format(new Date(dateString), "MMM dd");
        } catch {
            return null;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-white rounded-lg border shadow-sm p-3 cursor-pointer",
                "hover:shadow-md hover:border-blue-200 transition-all",
                "group",
                (isDragging || isSortableDragging) && "opacity-50 shadow-lg rotate-2",
            )}
            onClick={onClick}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
            >
                <GripVertical className="h-4 w-4 text-slate-400" />
            </div>

            {/* Card Content */}
            <div className="space-y-2">
                {/* Title & Key Deal Badge */}
                <div className="flex items-start gap-2">
                    <h4 className="font-medium text-slate-900 text-sm leading-tight flex-1 line-clamp-2">
                        {opportunity.name}
                    </h4>
                    {opportunity.key_deal && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                </div>

                {/* Amount */}
                {opportunity.amount ? (
                    <div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>{formatCurrency(opportunity.amount)}</span>
                    </div>
                ) : null}

                {/* Meta Info Row */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    {opportunity.close_date && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(opportunity.close_date)}</span>
                        </div>
                    )}

                    {opportunity.no_of_pax && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {opportunity.no_of_pax} pax
                        </Badge>
                    )}
                </div>

                {/* Probability Bar */}
                {opportunity.probability !== undefined && opportunity.probability > 0 && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500">Probability</span>
                            <span className="font-medium">{opportunity.probability}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    opportunity.probability >= 70 ? "bg-green-500" :
                                        opportunity.probability >= 40 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${opportunity.probability}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
