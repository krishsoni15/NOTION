"use client";

/**
 * useUserRole Hook - Custom Auth
 * Client-side hook to get the current user's role
 */

import { useAuth } from "@/app/providers/auth-provider";
import { Role, isValidRole } from "@/lib/auth/roles";

export function useUserRole(): Role | null {
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;
  if (role && isValidRole(role)) {
    return role as Role;
  }

  return null;
}
