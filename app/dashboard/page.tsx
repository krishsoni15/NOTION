/**
 * Dashboard Root
 * 
 * Redirects users to their role-specific dashboard.
 */

import { redirectToDashboard } from "@/lib/auth/redirect";

export default async function DashboardPage() {
  // Redirect to role-specific dashboard
  await redirectToDashboard();
}

