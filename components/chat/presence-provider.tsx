/**
 * Presence Provider Component
 * 
 * Automatically updates user's online status via heartbeat.
 * Should be included in the dashboard layout.
 */

"use client";

import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { useEffect, useState } from "react";

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure ConvexProvider is fully initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Enable presence heartbeat only after component is ready
  // This ensures ConvexProvider is available
  usePresenceHeartbeat(isReady);

  return <>{children}</>;
}

