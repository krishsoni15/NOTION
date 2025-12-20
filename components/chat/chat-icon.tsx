/**
 * Chat Icon Component
 * 
 * Chat icon with notification badge for the header.
 */

"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { cn } from "@/lib/utils";

interface ChatIconProps {
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

export function ChatIcon({ onClick, isActive = false, className }: ChatIconProps) {
  const unreadCount = useUnreadCount();

  return (
    <Button
      onClick={onClick}
      size="icon"
      variant="ghost"
      className={cn(
        "relative transition-colors",
        isActive && "bg-primary/10 text-primary hover:bg-primary/20",
        className
      )}
      aria-label={`Chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <MessageCircle className={cn("h-5 w-5", isActive && "text-primary")} />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}

