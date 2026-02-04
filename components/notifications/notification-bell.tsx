"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, Check, Trash2, StickyNote, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;
    const notifications = useQuery(api.notifications.getMyNotifications, { limit: 20 });

    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    const handleMarkAsRead = async (id: any) => {
        await markAsRead({ notificationId: id });
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "assignment":
                return <StickyNote className="h-4 w-4 text-blue-500" />;
            case "success":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "warning":
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case "error":
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Info className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background animate-pulse" />
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 pb-2">
                    <h4 className="font-semibold leading-none">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={handleMarkAllAsRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <Separator className="mt-2" />
                <ScrollArea className="h-[300px]">
                    {notifications === undefined ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    onClick={() => {
                                        if (!notification.isRead) {
                                            handleMarkAsRead(notification._id);
                                        }
                                        if (notification.link) {
                                            router.push(notification.link);
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={cn(
                                        "flex gap-3 p-4 transition-colors hover:bg-muted/50 relative border-b last:border-0 cursor-pointer",
                                        !notification.isRead && "bg-muted/30"
                                    )}
                                >
                                    <div className="mt-1 shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn("text-sm font-medium leading-none", !notification.isRead && "font-semibold")}>
                                                {notification.title}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                        {!notification.isRead && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent mt-1"
                                                onClick={() => handleMarkAsRead(notification._id)}
                                            >
                                                Mark as read
                                            </Button>
                                        )}
                                    </div>
                                    {!notification.isRead && (
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
