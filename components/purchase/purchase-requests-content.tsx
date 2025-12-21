"use client";

/**
 * Purchase Requests Content Component
 * 
 * Client component for purchase officer to view and manage requests.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { toast } from "sonner";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { Clock, FileText, ShoppingCart, Truck } from "lucide-react";
import { RequestCardWithCC } from "./request-card-with-cc";
import { CostComparisonDialog } from "./cost-comparison-dialog";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  ready_for_cc: { label: "Ready for CC", variant: "default", icon: FileText },
  cc_rejected: { label: "CC Rejected", variant: "destructive", icon: FileText },
  cc_pending: { label: "CC Pending", variant: "secondary", icon: Clock },
  ready_for_po: { label: "Ready for PO", variant: "default", icon: ShoppingCart },
  delivery_stage: { label: "Delivery Stage", variant: "outline", icon: Truck },
};

export function PurchaseRequestsContent() {
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const allRequests = useQuery(api.requests.getPurchaseRequestsByStatus, {});
  
  // Filter requests by status for each tab
  const getFilteredRequests = (tab: string) => {
    if (!allRequests) return [];
    if (tab === "all") return allRequests;
    if (tab === "new") {
      // New requests: ready_for_cc or cc_rejected (for resubmission)
      return allRequests.filter((r) => r.status === "ready_for_cc" || (r.status as string) === "cc_rejected");
    }
    if (tab === "cc_pending") {
      return allRequests.filter((r) => r.status === "cc_pending");
    }
    if (tab === "ready_for_po") {
      return allRequests.filter((r) => r.status === "ready_for_po");
    }
    if (tab === "delivery") {
      return allRequests.filter((r) => r.status === "delivery_stage");
    }
    return [];
  };

  // Calculate stats for each tab
  const stats = {
    all: allRequests?.length || 0,
    new: allRequests?.filter((r) => r.status === "ready_for_cc" || (r.status as string) === "cc_rejected").length || 0,
    cc_pending: allRequests?.filter((r) => r.status === "cc_pending").length || 0,
    ready_for_po: allRequests?.filter((r) => r.status === "ready_for_po").length || 0,
    delivery: allRequests?.filter((r) => r.status === "delivery_stage").length || 0,
  };


  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Requests</h1>
          <p className="text-muted-foreground">
            Manage requests through the purchase workflow
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All ({stats.all})
            </TabsTrigger>
            <TabsTrigger value="new">
              New Requests ({stats.new})
            </TabsTrigger>
            <TabsTrigger value="cc_pending">
              CC Pending ({stats.cc_pending})
            </TabsTrigger>
            <TabsTrigger value="ready_for_po">
              Ready for PO ({stats.ready_for_po})
            </TabsTrigger>
            <TabsTrigger value="delivery">
              Delivery ({stats.delivery})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {getFilteredRequests("all").length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No requests found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {getFilteredRequests("all").map((request) => {
                  const statusInfo = statusConfig[request.status] || statusConfig.ready_for_cc;
                  return (
                    <RequestCardWithCC
                      key={request._id}
                      request={request}
                      statusInfo={statusInfo}
                      onViewDetails={setSelectedRequestId}
                      onOpenCC={setCCRequestId}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            {getFilteredRequests("new").length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No new requests found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {getFilteredRequests("new").map((request) => {
                  const statusInfo = statusConfig[request.status] || statusConfig.ready_for_cc;
                  return (
                    <RequestCardWithCC
                      key={request._id}
                      request={request}
                      statusInfo={statusInfo}
                      onViewDetails={setSelectedRequestId}
                      onOpenCC={setCCRequestId}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cc_pending" className="space-y-4">
            {getFilteredRequests("cc_pending").length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No CC pending requests.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {getFilteredRequests("cc_pending").map((request) => {
                  const statusInfo = statusConfig[request.status] || statusConfig.ready_for_cc;
                  return (
                    <RequestCardWithCC
                      key={request._id}
                      request={request}
                      statusInfo={statusInfo}
                      onViewDetails={setSelectedRequestId}
                      onOpenCC={setCCRequestId}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ready_for_po" className="space-y-4">
            {getFilteredRequests("ready_for_po").length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No requests ready for PO.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {getFilteredRequests("ready_for_po").map((request) => {
                  const statusInfo = statusConfig[request.status] || statusConfig.ready_for_cc;
                  return (
                    <RequestCardWithCC
                      key={request._id}
                      request={request}
                      statusInfo={statusInfo}
                      onViewDetails={setSelectedRequestId}
                      onOpenCC={setCCRequestId}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            {getFilteredRequests("delivery").length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No requests in delivery stage.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {getFilteredRequests("delivery").map((request) => {
                  const statusInfo = statusConfig[request.status] || statusConfig.ready_for_cc;
                  return (
                    <RequestCardWithCC
                      key={request._id}
                      request={request}
                      statusInfo={statusInfo}
                      onViewDetails={setSelectedRequestId}
                      onOpenCC={setCCRequestId}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RequestDetailsDialog
        open={!!selectedRequestId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequestId(null);
          }
        }}
        requestId={selectedRequestId}
      />

      <CostComparisonDialog
        open={!!ccRequestId}
        onOpenChange={(open) => {
          if (!open) {
            setCCRequestId(null);
          }
        }}
        requestId={ccRequestId!}
      />
    </>
  );
}

