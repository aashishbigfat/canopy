"use client";

import { useState } from "react";
import { ClipboardList, Building2, Lightbulb, UserPlus, Users, Briefcase } from "lucide-react";
import { format } from "date-fns";
import type { UserActivity } from "@/features/dashboard/services/dashboardService";

const typeIcons: Record<UserActivity["type"], React.ReactNode> = {
    task: <ClipboardList className="h-4 w-4 text-blue-500" />,
    personal_account: <Building2 className="h-4 w-4 text-zinc-500" />,
    opportunity: <Lightbulb className="h-4 w-4 text-violet-500" />,
    lead: <UserPlus className="h-4 w-4 text-amber-500" />,
    contact: <Users className="h-4 w-4 text-sky-500" />,
    account: <Briefcase className="h-4 w-4 text-emerald-500" />,
};

function formatActivityTitle(type: UserActivity["type"]): string {
    const titles: Record<UserActivity["type"], string> = {
        task: "Created Task",
        personal_account: "Created Personalaccount",
        opportunity: "Created Opportunity",
        lead: "Updated Lead",
        contact: "Created Contact",
        account: "Created Account",
    };
    return titles[type];
}

export function UserActivities({ activities }: { activities: UserActivity[] }) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 600);
    };

    return (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">User Activities</h3>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
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
                                        {typeIcons[activity.type]}
                                    </div>
                                    <p className="text-sm font-medium">
                                        {formatActivityTitle(activity.type)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {activity.user_name} – {activity.description}
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
