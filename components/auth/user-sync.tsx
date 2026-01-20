"use client";

/**
 * User Sync Component
 * 
 * Checks if the current user exists in Convex database.
 * If user doesn't exist (not created by manager), redirects to login.
 * Also checks if user is active and redirects disabled users.
 */

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function UserSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const syncUser = useMutation(api.users.syncCurrentUser);
  const hasCheckedRef = useRef(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountTimeRef = useRef(Date.now());
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    // Sync user details when authenticated
    if (isLoaded && isSignedIn && user && !hasSyncedRef.current) {
      console.log("Syncing user with Convex...");
      const metadata = user.publicMetadata as Record<string, unknown> | undefined;
      syncUser({
        clerkRole: (metadata?.role as string),
        clerkUsername: user.username || undefined,
        clerkName: user.fullName || undefined,
      })
        .then(() => {
          console.log("User sync successful");
          hasSyncedRef.current = true;
        })
        .catch(e => console.error("Auto-sync failed:", e));
    }

    // Only sync if user is signed in and loaded
    if (!isLoaded || !isSignedIn) {
      hasCheckedRef.current = false;
      // Clear any existing timeouts
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
      return;
    }

    // Clear any existing timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }

    // Wait for the query to finish loading (undefined means still loading)
    if (currentUser === undefined) {
      // Query is still loading - set up a longer timeout for initial load
      if (!initialLoadTimeoutRef.current) {
        initialLoadTimeoutRef.current = setTimeout(() => {
          // If still undefined after 5 seconds, there might be a connectivity issue
          // But don't sign out - just log it and continue
          console.warn("User data still loading after 5 seconds - continuing to wait");
          initialLoadTimeoutRef.current = null;
        }, 5000); // Increased from 2 seconds to 5 seconds
      }
      return;
    }

    // Clear initial load timeout since query has resolved
    if (initialLoadTimeoutRef.current) {
      clearTimeout(initialLoadTimeoutRef.current);
      initialLoadTimeoutRef.current = null;
    }

    // Prevent multiple checks on the same render cycle
    if (hasCheckedRef.current) {
      return;
    }

    // Add a longer delay to ensure Convex has fully loaded and stabilized
    // This prevents false positives during page refresh
    checkTimeoutRef.current = setTimeout(() => {
      // Triple-check that user is still signed in after delay
      if (!isSignedIn) {
        return;
      }

      // Check if user exists in Convex
      if (currentUser === null) {
        // User exists in Clerk but not in Convex
        // This means user was not created by a manager

        // Don't sign out immediately after page load - give more time for Convex to sync
        const timeSinceMount = Date.now() - mountTimeRef.current;
        if (timeSinceMount < 3000) { // Wait at least 3 seconds after mount
          console.log(`User not found in Convex, but only ${timeSinceMount}ms since mount - waiting longer`);
          checkTimeoutRef.current = setTimeout(() => {
            // Re-run the check after additional delay
            if (currentUser === null && isSignedIn) {
              console.log("User still not found after additional delay - signing out");
              hasCheckedRef.current = true;
              signOut().then(() => {
                router.push("/login?error=not_found");
              });
            }
          }, 3000 - timeSinceMount);
          return;
        }

        console.log("User not found in Convex database, preparing to sign out");
        // Add extra confirmation before signing out
        setTimeout(() => {
          // Final check - if still null after another delay, then sign out
          if (currentUser === null && isSignedIn) {
            console.log("Confirming user sign out due to missing Convex record");
            hasCheckedRef.current = true;
            signOut().then(() => {
              router.push("/login?error=not_found");
            });
          }
        }, 1000); // Additional 1 second delay for confirmation
        return;
      }

      // Check if user is disabled
      if (currentUser && !currentUser.isActive) {
        // User is disabled - sign them out and redirect to login
        hasCheckedRef.current = true;
        signOut().then(() => {
          router.push("/login?disabled=true");
        });
        return;
      }

      // User exists and is active - mark as checked
      console.log("User authentication successful - user exists and is active");
      hasCheckedRef.current = true;
    }, 1000); // Increased from 500ms to 1000ms for more stability

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
    };
  }, [isLoaded, isSignedIn, currentUser, signOut, router, user, syncUser]);

  // Reset check flag when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      hasCheckedRef.current = false;
    }
  }, [isSignedIn]);

  // This component doesn't render anything
  return null;
}

