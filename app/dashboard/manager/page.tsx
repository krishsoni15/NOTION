/**
 * Manager Dashboard
 * 
 * Dashboard for managers to view all requests and manage users.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Users, CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function ManagerDashboard() {
  // Ensure user has manager role
  await requireRole(ROLES.MANAGER);

  return (
    <div className="space-y-8">
      <WelcomeHeader role={ROLES.MANAGER} />

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              All Requests
            </CardTitle>
            <CardDescription>
              Review and approve requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/manager/requests">
              <Button className="w-full">View All Requests</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Create and manage users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/manager/users">
              <Button variant="outline" className="w-full">
                Manage Users
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              Requests awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">pending requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Latest requests from site engineers</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No requests yet. Users will create requests soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
            <CardDescription>Total active users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              Navigate to User Management to view all users.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

