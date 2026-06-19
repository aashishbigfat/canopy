"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
    Activity,
    User,
    FileText,
    Settings,
    Shield,
    Mail,
    Phone,
    Calendar,
    CheckCircle2,
    PlusCircle,
    Trash2,
    Edit2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { activityLogsService } from "@/lib/api/services/activity-logs.service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityTimelineProps {
    entityType?: string;
    entityId?: string;
    userId?: string;
    limit?: number;
    className?: string;
}

const getActivityIcon = (action: string, entityType: string) => {
    // Determine icon based on action
    if (action.includes("create")) return <PlusCircle className="h-4 w-4 text-green-500" />;
    if (action.includes("update")) return <Edit2 className="h-4 w-4 text-amber-500" />;
    if (action.includes("delete")) return <Trash2 className="h-4 w-4 text-red-500" />;
    if (action.includes("login")) return <Shield className="h-4 w-4 text-blue-500" />;

    // Fallback to entity type
    switch (entityType) {
        case "user": return <User className="h-4 w-4 text-blue-500" />;
        case "lead": case "contact": return <User className="h-4 w-4 text-emerald-500" />;
        case "opportunity": case "quote": return <FileText className="h-4 w-4 text-amber-500" />;
        case "email": return <Mail className="h-4 w-4 text-purple-500" />;
        case "call": return <Phone className="h-4 w-4 text-indigo-500" />;
        case "meeting": case "event": return <Calendar className="h-4 w-4 text-rose-500" />;
        case "task": return <CheckCircle2 className="h-4 w-4 text-cyan-500" />;
        default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
};

const formatActionText = (action: string, entityName?: string) => {
    // Make action text more human readable
    const readableAction = action.replace(/_/g, " ");
    if (entityName) {
        return (
            <span>
                <span className="font-medium text-foreground">{readableAction}</span>
                {" "}
                <span className="font-medium text-primary">{entityName}</span>
            </span>
        );
    }
    return <span className="font-medium text-foreground">{readableAction}</span>;
};

export function ActivityTimeline({ entityType, entityId, userId, limit = 10, className }: ActivityTimelineProps) {
    const { data, isLoading } = useQuery({
        queryKey: ["activity-logs", entityType, entityId, userId, limit],
        queryFn: () => activityLogsService.getLogs({
            entity_type: entityType,
            entity_id: entityId,
            user_id: userId,
            limit
        }),
    });

    if (isLoading) {
        return (
            <div className={cn("space-y-4", className)}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const logs = data?.logs || [];

    if (logs.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No activity recorded yet</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-0", className)}>
            {logs.map((log, index) => (
                <div key={log.id} className="relative pl-6 pb-6 last:pb-0 group">
                    {/* Vertical Line */}
                    {index !== logs.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border group-last:hidden" />
                    )}

                    {/* Icon */}
                    <div className="absolute left-0 top-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted shadow-sm ring-4 ring-background">
                        {getActivityIcon(log.action, log.entity_type)}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-1">
                        <div className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{log.user_name}</span>
                            {" "}
                            {formatActionText(log.action, log.entity_name)}
                        </div>

                        {log.details && (
                            <p className="text-sm text-muted-foreground">
                                {log.details}
                            </p>
                        )}

                        <time className="text-xs text-muted-foreground/60">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </time>
                    </div>
                </div>
            ))}
        </div>
    );
}
