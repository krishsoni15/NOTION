/**
 * Purchase Officer Dashboard
 * 
 * Dashboard for purchase officers to manage POs and vendors.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { DirectActionsSection } from "@/components/direct-actions/direct-actions-section";

export default async function PurchaseOfficerDashboard() {
  // Ensure user has purchase_officer role
  await requireRole(ROLES.PURCHASE_OFFICER);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your purchase operations</p>
      </div>

      <DirectActionsSection />
    </div>
  );
}

