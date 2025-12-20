/**
 * Sticky Notes Icon Component
 * 
 * Icon with notification badge for pending reminders.
 */

"use client";

import { StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePendingReminders } from "@/hooks/use-pending-reminders";
import { cn } from "@/lib/utils";

interface StickyNotesIconProps {
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

export function StickyNotesIcon({ onClick, isActive = false, className }: StickyNotesIconProps) {
  const pendingCount = usePendingReminders();

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
      aria-label={`Sticky Notes${pendingCount > 0 ? ` (${pendingCount} pending reminders)` : ""}`}
    >
      <StickyNote className={cn("h-5 w-5", isActive && "text-primary")} />
      {pendingCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
        >
          {pendingCount > 99 ? "99+" : pendingCount}
        </Badge>
      )}
    </Button>
  );
}

