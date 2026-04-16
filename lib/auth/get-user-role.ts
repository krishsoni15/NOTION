/**
 * Get User Role Helpers - Custom Auth
 * Server-side utilities to fetch the current user's role from JWT cookie
 */

import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { Role, isValidRole } from "./roles";

/**
 * Get the current user's role from JWT cookie (Server-side only)
 */
export async function getUserRole(): Promise<Role | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const role = payload.role;
    if (role && isValidRole(role)) {
      return role as Role;
    }

    return null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Get the current user's auth ID (Server-side only)
 */
export async function getUserClerkId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    return payload?.userId || null;
  } catch {
    return null;
  }
}

/**
 * Check if the current user has a specific role (Server-side only)
 */
export async function hasRole(requiredRole: Role): Promise<boolean> {
  const role = await getUserRole();
  return role === requiredRole;
}

/**
 * Check if the current user is authenticated (Server-side only)
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getUserClerkId();
  return !!userId;
}
