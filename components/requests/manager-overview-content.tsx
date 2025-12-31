"use client";

/**
 * Manager Overview Content Component
 *
 * Simplified client component showing only Draft, Pending Requests, and History.
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { CostComparisonDialog } from "@/components/purchase/cost-comparison-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export function ManagerOverviewContent() {
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const allRequests = useQuery(api.requests.getAllRequests);

  // Filter requests based on category
  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];

    switch (categoryFilter) {
      case "draft":
        return allRequests.filter((r) => r.status === "draft");
      case "pending":
        return allRequests.filter((r) =>
          ["pending", "ready_for_cc", "cc_pending"].includes(r.status)
        );
      case "history":
        return allRequests.filter((r) =>
          !["draft", "pending", "ready_for_cc", "cc_pending"].includes(r.status)
        );
      default:
        return allRequests;
    }
  }, [allRequests, categoryFilter]);

  // Get counts for each category
  const categoryCounts = useMemo(() => {
    if (!allRequests) return { draft: 0, pending: 0, history: 0, all: 0 };

    const draft = allRequests.filter((r) => r.status === "draft").length;
    const pending = allRequests.filter((r) =>
      ["pending", "ready_for_cc", "cc_pending"].includes(r.status)
    ).length;
    const history = allRequests.filter((r) =>
      !["draft", "pending", "ready_for_cc", "cc_pending"].includes(r.status)
    ).length;
    const all = allRequests.length;

    return { draft, pending, history, all };
  }, [allRequests]);

  return (
    <>
      <div className="space-y-6">
        {/* Category Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Category:</span>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories ({categoryCounts.all})</SelectItem>
                  <SelectItem value="draft">Draft ({categoryCounts.draft})</SelectItem>
                  <SelectItem value="pending">Pending Requests ({categoryCounts.pending})</SelectItem>
                  <SelectItem value="history">History ({categoryCounts.history})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <RequestsTable
          requests={filteredRequests}
          onViewDetails={(requestId) => setSelectedRequestId(requestId)}
          onOpenCC={(requestId) => setCCRequestId(requestId)}
          showCreator={true}
          viewMode="card"
        />
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
