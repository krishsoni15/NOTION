/**
 * Vendors Page
 * 
 * Manage vendors (placeholder for now).
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { Card, CardContent } from "@/components/ui/card";

export default async function VendorsPage() {
  await requireRole(ROLES.PURCHASE_OFFICER);

  return (
    <div className="space-y-6">

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">
            No vendors yet. Add your first vendor to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

