/**
 * Manager Overview Page
 *
 * Simplified view showing only Draft, Pending Requests, and History.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { ManagerOverviewContent } from "@/components/requests/manager-overview-content";

export default async function ManagerOverviewPage() {
  await requireRole(ROLES.MANAGER);

  return (
    <div className="space-y-6">
      <ManagerOverviewContent />
    </div>
  );
}
