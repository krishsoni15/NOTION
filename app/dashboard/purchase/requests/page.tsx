/**
 * Purchase Approved Requests Page
 * 
 * View approved requests for creating POs (placeholder for now).
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { PurchaseRequestsContent } from "@/components/purchase/purchase-requests-content";

export default async function PurchaseRequestsPage() {
  await requireRole(ROLES.PURCHASE_OFFICER);

  return <PurchaseRequestsContent />;
}

