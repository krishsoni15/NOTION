"use client";

/**
 * Client Component for Manager Dashboard
 *
 * Simple welcome message for managers.
 */

import { ROLES } from "@/lib/auth/roles";
import { ManagerDashboardView } from "@/components/dashboard/manager-dashboard-view";
import { DirectActionsSection } from "@/components/direct-actions/direct-actions-section";

export default function ManagerDashboardClient() {
  return (
    <div className="space-y-6">
      <ManagerDashboardView />
      <DirectActionsSection compact={true} />
    </div>
  );
}
