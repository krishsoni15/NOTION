/**
 * Welcome Header Component
 * 
 * Role-based welcome message for dashboard pages.
 */

import { Role, getRoleLabel } from "@/lib/auth/roles";

interface WelcomeHeaderProps {
  role: Role;
}

export function WelcomeHeader({ role }: WelcomeHeaderProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome, {getRoleLabel(role)}
      </h1>
      <p className="text-muted-foreground">
        {getWelcomeMessage(role)}
      </p>
    </div>
  );
}

function getWelcomeMessage(role: Role): string {
  switch (role) {
    case "site_engineer":
      return "Create and manage your site requests, and mark deliveries.";
    case "manager":
      return "Review and approve requests, and manage system users.";
    case "purchase_officer":
      return "Create purchase orders and manage vendor relationships.";
    default:
      return "Welcome to NOTION CRM.";
  }
}

