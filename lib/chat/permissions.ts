/**
 * Chat Permission Logic
 * 
 * Defines role-based chat permissions for the NOTION CRM system.
 * 
 * Rules:
 * - Site Engineer: Can chat with Purchase Officers and Managers (NO internal chat)
 * - Purchase Officer: Can chat with Site Engineers, Managers, and other Purchase Officers
 * - Manager: Can chat with Site Engineers, Purchase Officers, and other Managers
 */

import { ROLES, type Role } from "@/lib/auth/roles";

/**
 * Check if a user with a given role can chat with another user with a given role
 * 
 * @param userRole - The role of the current user
 * @param targetRole - The role of the user they want to chat with
 * @returns true if chat is allowed, false otherwise
 */
export function canChatWith(userRole: Role, targetRole: Role): boolean {
  // Site Engineers can chat with Purchase Officers and Managers
  // But NOT with other Site Engineers
  if (userRole === ROLES.SITE_ENGINEER) {
    return (
      targetRole === ROLES.PURCHASE_OFFICER ||
      targetRole === ROLES.MANAGER
    );
  }

  // Purchase Officers can chat with everyone
  if (userRole === ROLES.PURCHASE_OFFICER) {
    return true;
  }

  // Managers can chat with everyone
  if (userRole === ROLES.MANAGER) {
    return true;
  }

  return false;
}

/**
 * Get a list of roles that a user with a given role can chat with
 * 
 * @param userRole - The role of the current user
 * @returns Array of roles that can be chatted with
 */
export function getChattableRoles(userRole: Role): Role[] {
  if (userRole === ROLES.SITE_ENGINEER) {
    return [ROLES.PURCHASE_OFFICER, ROLES.MANAGER];
  }

  if (userRole === ROLES.PURCHASE_OFFICER) {
    return [ROLES.SITE_ENGINEER, ROLES.PURCHASE_OFFICER, ROLES.MANAGER];
  }

  if (userRole === ROLES.MANAGER) {
    return [ROLES.SITE_ENGINEER, ROLES.PURCHASE_OFFICER, ROLES.MANAGER];
  }

  return [];
}

/**
 * Check if internal chat is allowed for a given role
 * (i.e., can they chat with users of the same role)
 * 
 * @param role - The role to check
 * @returns true if internal chat is allowed, false otherwise
 */
export function canChatInternally(role: Role): boolean {
  // Only Site Engineers cannot chat internally
  return role !== ROLES.SITE_ENGINEER;
}

/**
 * Get a human-readable description of chat permissions for a role
 * 
 * @param role - The role to describe
 * @returns Description string
 */
export function getChatPermissionDescription(role: Role): string {
  if (role === ROLES.SITE_ENGINEER) {
    return "Can chat with Purchase Officers and Managers";
  }

  if (role === ROLES.PURCHASE_OFFICER) {
    return "Can chat with Site Engineers, Managers, and other Purchase Officers";
  }

  if (role === ROLES.MANAGER) {
    return "Can chat with Site Engineers, Purchase Officers, and other Managers";
  }

  return "No chat permissions";
}

