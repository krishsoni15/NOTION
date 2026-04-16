/**
 * Online Indicator Component
 * 
 * Shows online/offline status with a colored dot.
 */

import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  className?: string;
  showLabel?: boolean;
}

export function OnlineIndicator({ 
  isOnline, 
  className,
  showLabel = false 
}: OnlineIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isOnline ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
        )}
        aria-label={isOnline ? "Online" : "Offline"}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
}

