"use client";

/**
 * User Sync Component - Custom Auth
 * Checks if the current user exists in Convex and is active.
 * Redirects disabled or missing users to login.
 */

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/providers/auth-provider";
import { useRouter } from "next/navigation";

export function UserSync() {
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const hasCheckedRef = useRef(false);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated || !authUser) {
      hasCheckedRef.current = false;
      return;
    }

    // Wait for Convex query to resolve
    if (currentUser === undefined) return;

    if (hasCheckedRef.current) return;

    // Give Convex time to load
    const timeSinceMount = Date.now() - mountTimeRef.current;
    const delay = Math.max(0, 2000 - timeSinceMount);

    const timer = setTimeout(() => {
      if (currentUser === null) {
        // User not in Convex — logout
        console.warn("User not found in Convex, logging out");
        hasCheckedRef.current = true;
        logout().then(() => router.push("/login?error=not_found"));
        return;
      }

      if (currentUser && !currentUser.isActive) {
        // User disabled
        hasCheckedRef.current = true;
        logout().then(() => router.push("/login?disabled=true"));
        return;
      }

      hasCheckedRef.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authUser, currentUser, logout, router]);

  return null;
}
