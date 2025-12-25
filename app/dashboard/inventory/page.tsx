/**
 * Inventory Page
 * 
 * Manage inventory items (Purchase Officer: CRUD, Manager: Read-only, Site Engineer: Read-only + Add Images).
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { Card, CardContent } from "@/components/ui/card";
import { InventoryManagement } from "@/components/inventory/inventory-management";

export default async function InventoryPage() {
  // Check if user is Purchase Officer, Manager, or Site Engineer
  const role = await requireRole([
    ROLES.PURCHASE_OFFICER,
    ROLES.MANAGER,
    ROLES.SITE_ENGINEER,
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <InventoryManagement userRole={role} />
        </CardContent>
      </Card>
    </div>
  );
}

