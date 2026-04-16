/**
 * Role Constants and Types
 * 
 * Defines the three roles in the system and provides type-safe role checking.
 */

export const ROLES = {
  SITE_ENGINEER: "site_engineer",
  MANAGER: "manager",
  PURCHASE_OFFICER: "purchase_officer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SITE_ENGINEER]: "Site Engineer",
  [ROLES.MANAGER]: "Manager",
  [ROLES.PURCHASE_OFFICER]: "Purchase Officer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.SITE_ENGINEER]: "Create requests and mark deliveries",
  [ROLES.MANAGER]: "Approve requests and manage users",
  [ROLES.PURCHASE_OFFICER]: "Create purchase orders and manage vendors",
};

export const ROLE_ROUTES: Record<Role, string> = {
  [ROLES.SITE_ENGINEER]: "/dashboard/site",
  [ROLES.MANAGER]: "/dashboard/manager",
  [ROLES.PURCHASE_OFFICER]: "/dashboard/purchase",
};

/**
 * Check if a string is a valid role
 */
export function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

/**
 * Get the dashboard route for a given role
 */
export function getRoleDashboardRoute(role: Role): string {
  return ROLE_ROUTES[role];
}

/**
 * Get the display label for a role
 */
export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/**
 * Get the description for a role
 */
export function getRoleDescription(role: Role): string {
  return ROLE_DESCRIPTIONS[role];
}

