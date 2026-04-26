/**
 * Purchase Officer Dashboard
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { PurchaseDashboardContent } from "@/components/purchase/purchase-dashboard-content";

export default async function PurchaseOfficerDashboard() {
  await requireRole(ROLES.PURCHASE_OFFICER);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Purchase Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of procurement pipeline and direct actions</p>
        </div>
      </div>

      <PurchaseDashboardContent />
    </div>
  );
}
