"use client";

import { useState } from "react";
import { ClipboardList, Building2, Lightbulb, UserPlus, Users, Briefcase } from "lucide-react";
import { format } from "date-fns";
import type { ActivityLog } from "@/features/dashboard/services/dashboardService";

const typeIcons: Record<string, React.ReactNode> = {
    task: <ClipboardList className="h-4 w-4 text-blue-500" />,
    personal_account: <Building2 className="h-4 w-4 text-zinc-500" />,
    opportunity: <Lightbulb className="h-4 w-4 text-violet-500" />,
    lead: <UserPlus className="h-4 w-4 text-amber-500" />,
    contact: <Users className="h-4 w-4 text-sky-500" />,
    account: <Briefcase className="h-4 w-4 text-emerald-500" />,
    event: <ClipboardList className="h-4 w-4 text-rose-500" />,
};

function formatActivityTitle(action: string, entityType: string): string {
    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
    const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1).replace("_", " ");

    // Custom labels for common actions
    if (action === "create") return `Created ${entityLabel}`;
    if (action === "update") return `Updated ${entityLabel}`;
    if (action === "delete") return `Deleted ${entityLabel}`;

    return `${actionLabel} ${entityLabel}`;
}

export function UserActivities({ activities }: { activities: ActivityLog[] }) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 600);
    };

    return (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex items-center justify-between font-bold text-slate-800 pb-2 border-b border-slate-100">
                <span className="text-lg tracking-tight">Recent Activity Stream</span>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="text-slate-400 hover:text-cyan-500 transition-colors"
                    aria-label="Refresh activities"
                >
                    <svg
                        className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            </div>
            <div className="relative max-h-[320px] overflow-y-auto">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                <ul className="space-y-0">
                    {activities.length === 0 ? (
                        <li className="relative pl-8 pb-4 text-sm text-muted-foreground">
                            No recent activities
                        </li>
                    ) : (
                        activities.map((activity) => {
                            let dateStr = activity.created_at;
                            try {
                                dateStr = format(new Date(activity.created_at), "dd MMM yyyy | hh:mm a");
                            } catch {
                                // keep original
                            }
                            return (
                                <li key={activity.id} className="relative pl-8 pb-4">
                                    <div className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background">
                                        {typeIcons[activity.entity_type] || <ClipboardList className="h-4 w-4 text-slate-400" />}
                                    </div>
                                    <p className="text-sm font-medium">
                                        {formatActivityTitle(activity.action, activity.entity_type)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {activity.user_name} – {activity.entity_name ? `[${activity.entity_name}] ` : ""}{activity.description}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{dateStr}</p>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>
        </div>
    );
}
