"use client";

/**
 * User Sync Component
 * 
 * Automatically syncs the current user from Clerk to Convex
 * if they don't exist in Convex database.
 * Also checks if user is active and redirects disabled users.
 */

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function UserSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const syncUser = useMutation(api.users.syncCurrentUser);

  useEffect(() => {
    // Only sync if user is signed in and loaded
    if (!isLoaded || !isSignedIn) {
      return;
    }

    // If user doesn't exist in Convex, sync them
    if (currentUser === null) {
      // User exists in Clerk but not in Convex - sync them
      syncUser().catch((error) => {
        console.error("Failed to sync user:", error);
      });
      return;
    }

    // Check if user is disabled
    if (currentUser && !currentUser.isActive) {
      // User is disabled - sign them out and redirect to login
      signOut().then(() => {
        router.push("/login?disabled=true");
      });
    }
  }, [isLoaded, isSignedIn, currentUser, syncUser, signOut, router]);

  // This component doesn't render anything
  return null;
}

