/**
 * Site Engineer Dashboard
 *
 * Mobile-first dashboard for site engineers with quick actions and overview.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import SiteEngineerDashboardClient from "./client-dashboard";

export default async function SiteEngineerDashboard() {
  // Ensure user has site_engineer role
  await requireRole(ROLES.SITE_ENGINEER);

  return <SiteEngineerDashboardClient />;
}

