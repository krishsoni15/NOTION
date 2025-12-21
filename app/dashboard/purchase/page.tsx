/**
 * Purchase Officer Dashboard
 * 
 * Dashboard for purchase officers to manage POs and vendors.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { PurchaseDashboardContent } from "@/components/purchase/purchase-dashboard-content";

export default async function PurchaseOfficerDashboard() {
  // Ensure user has purchase_officer role
  await requireRole(ROLES.PURCHASE_OFFICER);

  return (
    <div className="space-y-8">
      <WelcomeHeader role={ROLES.PURCHASE_OFFICER} />
      <PurchaseDashboardContent />
    </div>
  );
}

