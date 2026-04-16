/**
 * usePendingReminders Hook
 * 
 * Custom hook for getting pending reminder count.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to get count of pending reminders for current user
 */
export function usePendingReminders() {
  const count = useQuery(api.stickyNotes.getPendingReminders);
  return count ?? 0;
}

