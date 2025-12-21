/**
 * Site Engineer Requests Page
 * 
 * View and create material requests.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { SiteRequestsContent } from "@/components/requests/site-requests-content";

export default async function SiteRequestsPage() {
  await requireRole(ROLES.SITE_ENGINEER);

  return (
    <div className="space-y-6">
      <SiteRequestsContent />
    </div>
  );
}
