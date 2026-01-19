/**
 * Role-Based Redirect Logic
 * 
 * Handles redirecting users to their appropriate dashboards based on role.
 */

import { redirect } from "next/navigation";
import { Role, getRoleDashboardRoute } from "./roles";
import { getUserRole, getUserClerkId } from "./get-user-role";

/**
 * Redirect user to their role-specific dashboard
 * Server-side only
 * 
 * Note: User existence in Convex is checked client-side by UserSync component
 * to avoid using browser clients in server-side code.
 */
export async function redirectToDashboard(): Promise<never> {
  // Check if user is authenticated
  const clerkUserId = await getUserClerkId();

  if (!clerkUserId) {
    console.error("Redirect failed: User not authenticated");
    redirect("/login?error=not_authenticated");
  }

  // Get the user's role
  // If user doesn't exist in Convex, they won't have a role
  const role = await getUserRole();

  if (!role) {
    // User authenticated but no role - UserSync component will handle
    // checking Convex existence and redirecting if needed
    console.warn("Redirect failed: User has no role assigned", { clerkUserId });
    redirect("/login?error=no_role");
  }

  const dashboardRoute = getRoleDashboardRoute(role);
  redirect(dashboardRoute);
}

/**
 * Ensure user has the required role, otherwise redirect to login or their dashboard
 * Server-side only
 */
export async function requireRole(requiredRole: Role | Role[]): Promise<Role> {
  const role = await getUserRole();

  if (!role) {
    redirect("/login");
  }

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!allowedRoles.includes(role)) {
    // Redirect to their own dashboard
    const dashboardRoute = getRoleDashboardRoute(role);
    redirect(dashboardRoute);
  }

  return role;
}

/**
 * Ensure user has one of the required roles, otherwise redirect
 * Server-side only
 */
export async function requireAnyRole(requiredRoles: Role[]): Promise<Role> {
  const role = await getUserRole();

  if (!role) {
    redirect("/login");
  }

  if (!requiredRoles.includes(role)) {
    // Redirect to their own dashboard
    const dashboardRoute = getRoleDashboardRoute(role);
    redirect(dashboardRoute);
  }

  return role;
}

