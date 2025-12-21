/**
 * Manager Requests Page
 * 
 * View and approve/reject all requests from site engineers.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { ManagerRequestsContent } from "@/components/requests/manager-requests-content";

export default async function ManagerRequestsPage() {
  await requireRole(ROLES.MANAGER);

  return (
    <div className="space-y-6">
      <ManagerRequestsContent />
    </div>
  );
}
