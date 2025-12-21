"use client";

/**
 * Site Requests Content Component
 * 
 * Client component for site engineer requests page.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialRequestForm } from "@/components/requests/material-request-form";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export function SiteRequestsContent() {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [activeTab, setActiveTab] = useState<string>("new");
  const allRequests = useQuery(api.requests.getUserRequests);

  // Separate new requests from history
  const newRequests = allRequests?.filter((r) => 
    ["pending", "ready_for_cc", "cc_pending", "ready_for_po", "delivery_stage"].includes(r.status)
  ) || [];
  
  const historyRequests = allRequests?.filter((r) => 
    ["approved", "rejected", "delivered"].includes(r.status)
  ) || [];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your site requests
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new">
            Active ({newRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({historyRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <RequestsTable
            requests={newRequests}
            onViewDetails={(requestId) => setSelectedRequestId(requestId)}
          />
        </TabsContent>

        <TabsContent value="history">
          <RequestsTable
            requests={historyRequests}
            onViewDetails={(requestId) => setSelectedRequestId(requestId)}
          />
        </TabsContent>
      </Tabs>

      <MaterialRequestForm
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <RequestDetailsDialog
        open={!!selectedRequestId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequestId(null);
          }
        }}
        requestId={selectedRequestId}
      />
    </>
  );
}

