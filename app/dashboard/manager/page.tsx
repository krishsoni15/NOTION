/**
 * Manager Dashboard
 *
 * Dashboard for managers to view all requests and manage users.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import ManagerDashboardClient from "./client-dashboard";

export default async function ManagerDashboard() {
  // Ensure user has manager role
  await requireRole(ROLES.MANAGER);

  return <ManagerDashboardClient />;
}

