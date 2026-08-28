"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Opportunity } from "../types";
import { cn } from "@/lib/utils";
import { Calendar, GripVertical, Star, MapPin, Users } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useIndustry } from "@/lib/industry-labels";

interface KanbanCardProps {
    opportunity: Opportunity;
    isDragging?: boolean;
    onClick?: () => void;
}

export function KanbanCard({ opportunity, isDragging, onClick }: KanbanCardProps) {
    const industry = useIndustry();
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
                "group relative rounded-lg border border-border bg-card shadow-sm",
                "transition-all duration-150 hover:border-primary/40 hover:shadow-md",
                isActiveDragging && "opacity-50 shadow-lg"
            )}
            onClick={!isActiveDragging ? onClick : undefined}
        >
            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute right-2 top-2 z-10 cursor-grab rounded bg-muted p-1 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
                onClick={e => e.stopPropagation()}
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <div className="space-y-3 p-4 pr-8">
                {/* Title + Star */}
                <div className="flex items-start gap-2">
                    <h4 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-foreground">
                        {opportunity.name}
                    </h4>
                    {opportunity.key_deal && (
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                </div>

                {/* Amount */}
                {opportunity.amount ? (
                    <div className="text-sm font-bold text-emerald-600">
                        {formatCurrency(opportunity.amount)}
                    </div>
                ) : null}

                {/* Destinations (travel only) */}
                {industry === "travel" && (opportunity.industry_data?.destination_names?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{opportunity.industry_data!.destination_names.join(", ")}</span>
                    </div>
                )}

                {/* Meta: date + pax */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {opportunity.close_date && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(opportunity.close_date)}</span>
                        </div>
                    )}
                    {industry === "travel" && opportunity.industry_data?.no_of_pax && (
                        <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{opportunity.industry_data.no_of_pax} pax</span>
                        </div>
                    )}
                </div>

                {/* Probability bar */}
                {opportunity.probability !== undefined && opportunity.probability > 0 && (
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Probability</span>
                            <span className="font-semibold text-foreground/90">{opportunity.probability}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
                    <div className="truncate border-t border-border pt-1.5 text-xs text-muted-foreground">
                        {opportunity.account_name}
                    </div>
                )}
            </div>
        </div>
    );
}
