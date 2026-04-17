"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Opportunity } from "../types";
import { cn } from "@/lib/utils";
import { Calendar, GripVertical, Star, MapPin, Users } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
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



    const isActiveDragging = isDragging || isSortableDragging;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative bg-white rounded-lg border shadow-sm group",
                "hover:shadow-md hover:border-blue-200 transition-all duration-150",
                isActiveDragging && "opacity-50 shadow-lg"
            )}
            onClick={!isActiveDragging ? onClick : undefined}
        >
            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 p-1 rounded cursor-grab active:cursor-grabbing text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 z-10 transition-colors"
                onClick={e => e.stopPropagation()}
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <div className="p-4 pr-8 space-y-3">
                {/* Title + Star */}
                <div className="flex items-start gap-2">
                    <h4 className="font-semibold text-slate-800 text-sm leading-snug flex-1 line-clamp-2">
                        {opportunity.name}
                    </h4>
                    {opportunity.key_deal && (
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                </div>

                {/* Amount */}
                {opportunity.amount ? (
                    <div className="text-green-600 font-bold text-sm">
                        {formatCurrency(opportunity.amount)}
                    </div>
                ) : null}

                {/* Destinations */}
                {(opportunity.destination_names?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{opportunity.destination_names!.join(", ")}</span>
                    </div>
                )}

                {/* Meta: date + pax */}
                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    {opportunity.close_date && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(opportunity.close_date)}</span>
                        </div>
                    )}
                    {opportunity.no_of_pax && (
                        <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{opportunity.no_of_pax} pax</span>
                        </div>
                    )}
                </div>

                {/* Probability bar */}
                {opportunity.probability !== undefined && opportunity.probability > 0 && (
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400">Probability</span>
                            <span className="font-semibold text-slate-600">{opportunity.probability}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    opportunity.probability >= 70 ? "bg-green-500" :
                                        opportunity.probability >= 40 ? "bg-amber-400" : "bg-red-400"
                                )}
                                style={{ width: `${opportunity.probability}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Account name footer */}
                {opportunity.account_name && (
                    <div className="text-xs text-slate-400 truncate pt-1.5 border-t border-slate-100">
                        {opportunity.account_name}
                    </div>
                )}
            </div>
        </div>
    );
}
