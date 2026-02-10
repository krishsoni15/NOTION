"use client";

/**
 * Purchase Dashboard Content Component
 * 
 * Client component for purchase officer dashboard with stats and requests.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ClipboardList, CheckCircle, Clock, Truck, Store, Warehouse } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CostComparisonDialog } from "./cost-comparison-dialog";
import type { Id } from "@/convex/_generated/dataModel";

export function PurchaseDashboardContent() {
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const allRequests = useQuery(api.requests.getPurchaseRequestsByStatus, {});

  // Calculate stats
  const stats = {
    newRequests: allRequests?.filter((r) => r.status === "ready_for_cc").length || 0,
    ccPending: allRequests?.filter((r) => r.status === "cc_pending").length || 0,
    readyForPO: allRequests?.filter((r) => r.status === "ready_for_po").length || 0,
    ccApproved: allRequests?.filter((r) => r.status === "cc_approved").length || 0,
    deliveryStage: allRequests?.filter((r) => r.status === "delivery_stage").length || 0,
  };

  // Get requests ready for CC (new requests)
  const newRequests = allRequests?.filter((r) => r.status === "ready_for_cc") || [];

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newRequests}</div>
            <p className="text-xs text-muted-foreground">Need CC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CC Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ccPending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for PO</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyForPO}</div>
            <p className="text-xs text-muted-foreground">Can create PO</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CC Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ccApproved}</div>
            <p className="text-xs text-muted-foreground">CC completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryStage}</div>
            <p className="text-xs text-muted-foreground">In delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Vendors
            </CardTitle>
            <CardDescription>
              Manage vendor relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/purchase/vendors">
              <Button variant="outline" className="w-full">
                Manage Vendors
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              All Requests
            </CardTitle>
            <CardDescription>
              View all purchase requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/purchase/requests">
              <Button variant="outline" className="w-full">
                View Requests
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Create Cost Comparisons Section */}
      {newRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Cost Comparisons</CardTitle>
            <CardDescription>
              Requests ready for cost comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {newRequests.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">
                        {request.itemName}
                      </span>
                      <Badge variant="outline">
                        {request.quantity} {request.unit}
                      </Badge>
                      {request.isUrgent && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>Req ID: {request.requestNumber}</span>
                      {" • "}
                      <span>Site: {request.site?.name || "N/A"}{request.site?.code ? ` (${request.site.code})` : ""}</span>
                    </div>
                  </div>
                  <Button onClick={() => setCCRequestId(request._id)}>
                    Compare & Submit
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <CostComparisonDialog
        open={!!ccRequestId}
        onOpenChange={(open) => {
          if (!open) {
            setCCRequestId(null);
          }
        }}
        requestId={ccRequestId!}
      />
    </div>
  );
}

