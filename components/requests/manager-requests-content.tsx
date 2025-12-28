"use client";

/**
 * Manager Requests Content Component
 * 
 * Client component for manager requests page with cost comparison support.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { CostComparisonDialog } from "@/components/purchase/cost-comparison-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from "@/convex/_generated/dataModel";

export function ManagerRequestsContent() {
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [activeTab, setActiveTab] = useState<string>("new");
  
  const allRequests = useQuery(api.requests.getAllRequests);
  
  // Separate drafts, new requests (pending approval/CC), and history
  const draftRequests = allRequests?.filter((r) => 
    r.status === "draft"
  ) || [];
  
  const newRequests = allRequests?.filter((r) => 
    ["pending", "cc_pending"].includes(r.status)
  ) || [];
  
  const historyRequests = allRequests?.filter((r) => 
    !["draft", "pending", "cc_pending"].includes(r.status)
  ) || [];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Requests</h1>
          <p className="text-muted-foreground">
            Review and approve site requests
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="drafts">
              Drafts ({draftRequests.length})
            </TabsTrigger>
            <TabsTrigger value="new">
              New Requests ({newRequests.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({historyRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drafts">
            <RequestsTable
              requests={draftRequests}
              onViewDetails={(requestId) => setSelectedRequestId(requestId)}
              onOpenCC={(requestId) => setCCRequestId(requestId)}
              showCreator={true}
            />
          </TabsContent>

          <TabsContent value="new">
            <RequestsTable
              requests={newRequests}
              onViewDetails={(requestId) => setSelectedRequestId(requestId)}
              onOpenCC={(requestId) => setCCRequestId(requestId)}
              showCreator={true}
            />
          </TabsContent>

          <TabsContent value="history">
            <RequestsTable
              requests={historyRequests}
              onViewDetails={(requestId) => setSelectedRequestId(requestId)}
              onOpenCC={(requestId) => setCCRequestId(requestId)}
              showCreator={true}
            />
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

