/**
 * usePresence Hook
 * 
 * Custom hook for tracking and updating user online/offline status.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";

/**
 * Hook to get presence for a specific user
 */
export function useUserPresence(userId: Id<"users"> | null) {
  const presence = useQuery(
    api.presence.getUserPresence,
    userId ? { userId } : "skip"
  );

  return presence;
}

/**
 * Hook to get presence for multiple users
 */
export function useMultipleUserPresence(userIds: Id<"users">[]) {
  const presence = useQuery(
    api.presence.getMultipleUserPresence,
    userIds.length > 0 ? { userIds } : "skip"
  );

  return presence;
}

/**
 * Hook to get all online users
 */
export function useOnlineUsers() {
  const onlineUsers = useQuery(api.presence.getOnlineUsers);
  return onlineUsers;
}

/**
 * Hook to automatically update presence (heartbeat)
 * Call this in your main app layout to keep presence updated
 */
export function usePresenceHeartbeat(enabled: boolean = true) {
  const updatePresence = useMutation(api.presence.updatePresence);
  const setOffline = useMutation(api.presence.setOffline);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Update presence immediately
    updatePresence({ isOnline: true }).catch((error) => {
      // Silently handle errors (Convex might not be ready yet)
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to update presence:", error);
      }
    });

    // Set up heartbeat interval (every 30 seconds)
    intervalRef.current = setInterval(() => {
      updatePresence({ isOnline: true }).catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to update presence:", error);
        }
      });
    }, 30000);

    // Set offline on unmount or page unload
    const handleBeforeUnload = () => {
      setOffline().catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to set offline:", error);
        }
      });
    };

    if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      }
      setOffline().catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to set offline:", error);
        }
      });
    };
  }, [enabled, updatePresence, setOffline]);
}

/**
 * Hook to manually update presence
 */
export function useUpdatePresence() {
  const updatePresence = useMutation(api.presence.updatePresence);
  const setOffline = useMutation(api.presence.setOffline);

  return {
    setOnline: () => updatePresence({ isOnline: true }),
    setOffline: () => setOffline(),
  };
}

