"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import {
    Bell,
    CheckCheck,
    Trash2,
    User,
    Briefcase,
    Building2,
    FileText,
    Mail,
    Calendar,
    Loader2,
    Filter,
    MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
    notificationsService,
    Notification,
} from "@/lib/api/services/notifications.service";

const getNotificationIcon = (type?: string, entityType?: string) => {
    const iconClass = "h-5 w-5";

    switch (entityType) {
        case "lead":
            return <User className={cn(iconClass, "text-blue-500")} />;
        case "opportunity":
            return <Briefcase className={cn(iconClass, "text-amber-500")} />;
        case "account":
            return <Building2 className={cn(iconClass, "text-indigo-500")} />;
        case "quote":
            return <FileText className={cn(iconClass, "text-green-500")} />;
        case "task":
            return <Calendar className={cn(iconClass, "text-purple-500")} />;
        case "email":
            return <Mail className={cn(iconClass, "text-red-500")} />;
        default:
            return <Bell className={cn(iconClass, "text-slate-500")} />;
    }
};

export default function NotificationsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<"all" | "unread">("all");

    const { data, isLoading } = useQuery({
        queryKey: ["notifications", filter],
        queryFn: () => notificationsService.getNotifications({
            unread_only: filter === "unread",
            limit: 100
        }),
    });

    const markAsRead = useMutation({
        mutationFn: notificationsService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: notificationsService.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const clearAll = useMutation({
        mutationFn: notificationsService.clearAll,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const deleteNotification = useMutation({
        mutationFn: notificationsService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const notifications = data?.notifications || [];
    const unreadCount = data?.unread_count || 0;

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead.mutateAsync(notification.id);
        }
        if (notification.action_url) {
            router.push(notification.action_url);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground">
                        {unreadCount > 0
                            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                            : "You're all caught up!"
                        }
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => markAllAsRead.mutate()}
                            disabled={markAllAsRead.isPending}
                        >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark all as read
                        </Button>
                    )}
                    {notifications.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => clearAll.mutate()}
                            disabled={clearAll.isPending}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear all
                        </Button>
                    )}
                </div>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">
                        Unread
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {unreadCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Bell className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No notifications</p>
                            <p className="text-sm">
                                {filter === "unread"
                                    ? "You've read all your notifications"
                                    : "You don't have any notifications yet"
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                                        !notification.is_read && "bg-blue-50/50 dark:bg-blue-950/20"
                                    )}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="p-2 bg-muted rounded-full">
                                            {getNotificationIcon(notification.type, notification.entity_type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className={cn(
                                                    "text-sm break-words whitespace-normal",
                                                    !notification.is_read && "font-semibold"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1 break-words whitespace-normal">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                {!notification.is_read && (
                                                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {!notification.is_read && (
                                                            <DropdownMenuItem
                                                                onClick={() => markAsRead.mutate(notification.id)}
                                                            >
                                                                Mark as read
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => deleteNotification.mutate(notification.id)}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
