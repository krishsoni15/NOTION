"use client";

/**
 * User Sync Component
 * 
 * Checks if the current user exists in Convex database.
 * If user doesn't exist (not created by manager), redirects to login.
 * Also checks if user is active and redirects disabled users.
 */

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function UserSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    // Only sync if user is signed in and loaded
    if (!isLoaded || !isSignedIn) {
      return;
    }

    // Wait for the query to finish loading (undefined means still loading)
    // Only check if currentUser is explicitly null (user not found) or a user object
    if (currentUser === undefined) {
      // Query is still loading, don't do anything yet
      return;
    }

    // Check if user exists in Convex
    if (currentUser === null) {
      // User exists in Clerk but not in Convex
      // This means user was not created by a manager
      // Sign them out and redirect to login with error message
      signOut().then(() => {
        router.push("/login?error=not_found");
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
  }, [isLoaded, isSignedIn, currentUser, signOut, router]);

  // This component doesn't render anything
  return null;
}

