/**
 * Read Receipt Component
 * 
 * Shows read status with check marks:
 * - Double grey check (✓✓) = Delivered (message delivered, receiver hasn't seen it)
 * - Double blue check (✓✓) = Read (receiver has seen the message)
 */

import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadReceiptProps {
  isRead: boolean; // True if receiver has read the message
  isDelivered?: boolean; // True if message has been delivered
  className?: string;
}

export function ReadReceipt({ isRead, isDelivered = true, className }: ReadReceiptProps) {
  return (
    <span className={cn("inline-flex items-center shrink-0", className)}>
      {isRead ? (
        // Double blue check - Message read by receiver
        <span title="Read">
          <CheckCheck 
            className="h-4 w-4 text-blue-500 dark:text-blue-400" 
            aria-label="Read"
          />
        </span>
      ) : (
        // Double grey check - Message delivered but not read
        <span title="Delivered">
          <CheckCheck 
            className="h-4 w-4 text-muted-foreground" 
            aria-label="Delivered"
          />
        </span>
      )}
    </span>
  );
}

