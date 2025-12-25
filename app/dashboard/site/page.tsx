/**
 * Site Engineer Dashboard
 * 
 * Dashboard for site engineers to view their requests and deliveries.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Truck } from "lucide-react";
import Link from "next/link";

export default async function SiteEngineerDashboard() {
  // Ensure user has site_engineer role
  await requireRole(ROLES.SITE_ENGINEER);

  return (
    <div className="space-y-8">
      <WelcomeHeader role={ROLES.SITE_ENGINEER} />

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Requests
            </CardTitle>
            <CardDescription>
              Create and manage your site requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/site/requests">
              <Button className="w-full">View My Requests</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Deliveries
            </CardTitle>
            <CardDescription>
              Mark deliveries as received
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/site/requests">
              <Button variant="outline" className="w-full">
                Mark Delivery
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Stats placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent requests and deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity. Create your first request to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

