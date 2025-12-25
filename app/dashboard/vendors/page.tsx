/**
 * Vendors Page
 * 
 * Manage vendors (Purchase Officer: CRUD, Manager: CRUD).
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { Card, CardContent } from "@/components/ui/card";
import { VendorManagement } from "@/components/vendors/vendor-management";

export default async function VendorsPage() {
  // Check if user is Purchase Officer or Manager
  const role = await requireRole([ROLES.PURCHASE_OFFICER, ROLES.MANAGER]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <VendorManagement />
        </CardContent>
      </Card>
    </div>
  );
}

