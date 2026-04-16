/**
 * useUnreadCount Hook
 * 
 * Custom hook for getting unread message count.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to get total unread message count for current user
 */
export function useUnreadCount() {
  const unreadCount = useQuery(api.chat.getUnreadCount);
  return unreadCount ?? 0;
}

