"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    User,
    Briefcase,
    Building2,
    FileText,
    Mail,
    Calendar,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    notificationsService,
    Notification,
} from "@/lib/api/services/notifications.service";

const getNotificationIcon = (type?: string, entityType?: string) => {
    const iconClass = "h-4 w-4";

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
            return <Bell className={cn(iconClass, "text-slate-400")} />;
    }
};

export function NotificationBell() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Fetch notifications
    const { data, isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => notificationsService.getNotifications({ limit: 10 }),
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    // Mark as read mutation
    const markAsRead = useMutation({
        mutationFn: notificationsService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    // Mark all as read mutation
    const markAllAsRead = useMutation({
        mutationFn: notificationsService.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const notifications = data?.notifications || [];
    const unreadCount = data?.unread_count || 0;

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read if not already
        if (!notification.is_read) {
            await markAsRead.mutateAsync(notification.id);
        }

        // Navigate to action URL if provided
        if (notification.action_url) {
            router.push(notification.action_url);
            setIsOpen(false);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-slate-300 hover:bg-white/10 hover:text-white h-11 w-11 rounded-full transition-all"
                >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 h-5 min-w-[20px] px-1.5 text-xs font-bold animate-pulse"
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
                <DropdownMenuLabel className="flex items-center justify-between py-3">
                    <span className="text-base font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => markAllAsRead.mutate()}
                            disabled={markAllAsRead.isPending}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Bell className="h-10 w-10 mb-2 opacity-50" />
                            <p className="text-sm">No notifications</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 cursor-pointer",
                                    !notification.is_read && "bg-blue-50/50 dark:bg-blue-950/20"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {getNotificationIcon(notification.type, notification.entity_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm",
                                        !notification.is_read && "font-medium"
                                    )}>
                                        {notification.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <div className="flex-shrink-0">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    </div>
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>

                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                            <Button
                                variant="ghost"
                                className="w-full text-sm"
                                onClick={() => {
                                    router.push("/notifications");
                                    setIsOpen(false);
                                }}
                            >
                                View all notifications
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
