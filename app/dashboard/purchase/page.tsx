/**
 * Purchase Officer Dashboard
 * 
 * Dashboard for purchase officers to manage POs and vendors.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";

export default async function PurchaseOfficerDashboard() {
  // Ensure user has purchase_officer role
  await requireRole(ROLES.PURCHASE_OFFICER);

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Welcome Purchase</h1>
    </div>
  );
}

