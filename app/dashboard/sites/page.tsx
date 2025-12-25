/**
 * Sites Page
 * 
 * Manage sites (Manager only).
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { Card, CardContent } from "@/components/ui/card";
import { SiteManagement } from "@/components/sites/site-management";

export default async function SitesPage() {
  // Check if user is Manager
  const role = await requireRole([ROLES.MANAGER]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <SiteManagement />
        </CardContent>
      </Card>
    </div>
  );
}

