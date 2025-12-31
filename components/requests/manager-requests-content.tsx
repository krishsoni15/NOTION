"use client";

/**
 * Manager Requests Content Component
 *
 * Client component for manager requests page with cost comparison support.
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { CostComparisonDialog } from "@/components/purchase/cost-comparison-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, LayoutGrid, Table as TableIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

type RequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "ready_for_cc"
  | "cc_rejected"
  | "cc_pending"
  | "cc_approved"
  | "ready_for_po"
  | "delivery_stage"
  | "delivered";

export function ManagerRequestsContent() {
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const allRequests = useQuery(api.requests.getAllRequests);

  // Filter requests based on category, status, and search query
  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];

    return allRequests.filter((request) => {
      // Category filter (Draft/Pending/History)
      if (categoryFilter !== "all") {
        let matchesCategory = false;
        switch (categoryFilter) {
          case "draft":
            matchesCategory = request.status === "draft";
            break;
          case "pending":
            matchesCategory = ["pending", "ready_for_cc", "cc_pending"].includes(request.status);
            break;
          case "history":
            matchesCategory = !["draft", "pending", "ready_for_cc", "cc_pending"].includes(request.status);
            break;
        }
        if (!matchesCategory) {
          return false;
        }
      }

      // Detailed Status filter
      if (statusFilter !== "all") {
        if (request.status !== statusFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRequestNumber = request.requestNumber.toLowerCase().includes(query);
        const matchesItemName = request.itemName.toLowerCase().includes(query);
        const matchesSiteName = request.site?.name.toLowerCase().includes(query);
        const matchesCreatorName = request.creator?.fullName.toLowerCase().includes(query);
        const matchesDescription = request.description?.toLowerCase().includes(query);

        return matchesRequestNumber || matchesItemName || matchesSiteName || matchesCreatorName || matchesDescription;
      }

      return true;
    });
  }, [allRequests, searchQuery, categoryFilter, statusFilter]);

  // Get status counts for filter options
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (allRequests) {
      allRequests.forEach((request) => {
        counts[request.status] = (counts[request.status] || 0) + 1;
      });
    }

    // Calculate grouped counts
    const groupedCounts = {
      ...counts,
      pending_group: (counts.pending || 0) + (counts.ready_for_cc || 0) + (counts.cc_pending || 0),
      approved_group: (counts.approved || 0) + (counts.cc_approved || 0) + (counts.ready_for_po || 0),
      rejected_group: (counts.rejected || 0) + (counts.cc_rejected || 0),
    };

    return groupedCounts;
  }, [allRequests]);

  // Calculate individual status counts
  const getStatusCount = (status: string) => {
    if (!allRequests) return 0;
    return allRequests.filter((request) => request.status === status).length;
  };

  // Individual status options for detailed filtering
  const detailedStatusOptions = [
    { value: "draft", label: "Draft", count: getStatusCount("draft") },
    { value: "pending", label: "Pending", count: getStatusCount("pending") },
    { value: "approved", label: "Approved", count: getStatusCount("approved") },
    { value: "ready_for_cc", label: "Ready for CC", count: getStatusCount("ready_for_cc") },
    { value: "cc_pending", label: "CC Pending", count: getStatusCount("cc_pending") },
    { value: "cc_approved", label: "CC Approved", count: getStatusCount("cc_approved") },
    { value: "ready_for_po", label: "Ready for PO", count: getStatusCount("ready_for_po") },
    { value: "delivery_stage", label: "Delivery Stage", count: getStatusCount("delivery_stage") },
    { value: "delivered", label: "Delivered", count: getStatusCount("delivered") },
    { value: "rejected", label: "Rejected", count: getStatusCount("rejected") },
    { value: "cc_rejected", label: "CC Rejected", count: getStatusCount("cc_rejected") },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by request number, item, site, or creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="sm:w-48">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending Requests</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {detailedStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* View Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">View:</span>
                  <div className="flex rounded-lg border p-1">
                    <Button
                      variant={viewMode === "card" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("card")}
                      className="h-8 px-3"
                    >
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Cards
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                      className="h-8 px-3"
                    >
                      <TableIcon className="h-4 w-4 mr-2" />
                      Table
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <RequestsTable
          requests={filteredRequests}
          onViewDetails={(requestId) => setSelectedRequestId(requestId)}
          onOpenCC={(requestId) => setCCRequestId(requestId)}
          showCreator={true}
          viewMode={viewMode}
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

