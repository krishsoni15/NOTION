"use client";

/**
 * Client Component for Manager Dashboard
 *
 * Simple welcome message for managers.
 */

import { ROLES } from "@/lib/auth/roles";

import { ManagerDashboardView } from "@/components/dashboard/manager-dashboard-view";

export default function ManagerDashboardClient() {
  return (
    <div className="space-y-6">

      <ManagerDashboardView />
    </div>
  );
}
