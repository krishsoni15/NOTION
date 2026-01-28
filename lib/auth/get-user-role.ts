/**
 * Get User Role Helpers
 * 
 * Server-side utilities to fetch the current user's role.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Role, isValidRole } from "./roles";

/**
 * Get the current user's role from Clerk metadata
 * Server-side only
 */
export async function getUserRole(): Promise<Role | null> {
  try {
    // Try to read the role directly from the session claims first to
    // avoid an extra Clerk API request (and potential API errors)
    const { sessionClaims, userId } = await auth();
    const claimsRole =
      (sessionClaims?.metadata as Record<string, unknown> | undefined)?.role ??
      (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)
        ?.role;

    if (claimsRole && isValidRole(String(claimsRole))) {
      return claimsRole as Role;
    }

    // Fallback to fetching the full user from Clerk
    if (!userId) {
      return null;
    }

    const user = await currentUser();
    if (!user) {
      return null;
    }

    const role = user.publicMetadata?.role as string | undefined;
    if (!role || !isValidRole(role)) {
      return null;
    }

    return role;
  } catch (error) {
    if (isClerkAPIResponseError(error)) {
      console.error("Failed to fetch Clerk user", {
        code: error.code,
        status: error.status,
        message: error.message,
        traceId: error.clerkTraceId,
        errors: error.errors,
      });
    } else {
      console.error("Unexpected error while fetching user role", error);
    }
    // Gracefully fall back to no role so callers can redirect to login
    return null;
  }
}

/**
 * Get the current user's Clerk ID
 * Server-side only
 */
export async function getUserClerkId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Check if the current user has a specific role
 * Server-side only
 */
export async function hasRole(requiredRole: Role): Promise<boolean> {
  const role = await getUserRole();
  return role === requiredRole;
}

/**
 * Check if the current user is authenticated
 * Server-side only
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}

