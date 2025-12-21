/**
 * User Management Page (Manager Only)
 * 
 * Allows managers to create, edit, and manage users.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { UserManagement } from "@/components/user-management/user-management";

export default async function UserManagementPage() {
  // Ensure user has manager role
  await requireRole(ROLES.MANAGER);

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 md:px-6">
      <UserManagement />
    </div>
  );
}

