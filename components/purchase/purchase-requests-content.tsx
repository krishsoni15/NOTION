"use client";

/**
 * Purchase Requests Content Component
 * 
 * Client component for purchase officer to view and manage requests.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { ItemInfoDialog } from "@/components/requests/item-info-dialog";
import { SiteInfoDialog } from "@/components/requests/site-info-dialog";
import { toast } from "sonner";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { Clock, FileText, ShoppingCart, Truck, Search, Filter, LayoutGrid, Table as TableIcon, Eye, AlertCircle, FileText as FileTextIcon, Edit } from "lucide-react";
import { RequestCardWithCC } from "./request-card-with-cc";
import { PurchaseRequestGroupCard } from "./purchase-request-group-card";
import { CostComparisonDialog } from "./cost-comparison-dialog";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { cn } from "@/lib/utils";

// Enhanced status configuration with better visual hierarchy
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; color: string }> = {
  ready_for_cc: { label: "Ready for CC", variant: "default", icon: FileText, color: "blue" },
  cc_rejected: { label: "CC Rejected", variant: "destructive", icon: FileText, color: "red" },
  cc_pending: { label: "CC Pending", variant: "secondary", icon: Clock, color: "amber" },
  ready_for_po: { label: "Ready for PO", variant: "default", icon: ShoppingCart, color: "emerald" },
  delivery_stage: { label: "Delivery Stage", variant: "outline", icon: Truck, color: "orange" },
};

// Stage configuration for better UI
const stageConfig = [
  {
    id: "all",
    label: "All Requests",
    icon: Eye,
    description: "View all purchase requests",
    color: "slate"
  },
  {
    id: "new",
    label: "New Requests",
    icon: FileText,
    description: "Ready for CC or rejected items",
    color: "blue"
  },
  {
    id: "cc_pending",
    label: "CC Pending",
    icon: Clock,
    description: "Under cost comparison review",
    color: "amber"
  },
  {
    id: "ready_for_po",
    label: "Ready for PO",
    icon: ShoppingCart,
    description: "Approved, ready for purchase order",
    color: "emerald"
  },
  {
    id: "delivery",
    label: "Delivery Stage",
    icon: Truck,
    description: "Items in delivery process",
    color: "orange"
  }
];

export function PurchaseRequestsContent() {
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ready_for_po");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);
  
  const allRequests = useQuery(api.requests.getPurchaseRequestsByStatus, {});
  
  // Enhanced filtering with search - group by requestNumber like manager pages
  const filteredRequestGroups = useMemo(() => {
    if (!allRequests) return [];

    let filtered = allRequests;

    // Filter by active tab
    if (activeTab !== "all") {
      if (activeTab === "new") {
        filtered = filtered.filter((r) => r.status === "ready_for_cc" || (r.status as string) === "cc_rejected");
      } else if (activeTab === "cc_pending") {
        filtered = filtered.filter((r) => r.status === "cc_pending");
      } else if (activeTab === "ready_for_po") {
        filtered = filtered.filter((r) => r.status === "ready_for_po");
      } else if (activeTab === "delivery") {
        filtered = filtered.filter((r) => r.status === "delivery_stage");
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((request) => {
        const matchesRequestNumber = request.requestNumber.toLowerCase().includes(query);
        const matchesItemName = request.itemName.toLowerCase().includes(query);
        const matchesSiteName = request.site?.name.toLowerCase().includes(query);
        const matchesCreatorName = request.creator?.fullName.toLowerCase().includes(query);
        const matchesDescription = request.description?.toLowerCase().includes(query);

        return matchesRequestNumber || matchesItemName || matchesSiteName || matchesCreatorName || matchesDescription;
      });
    }

    // Group by requestNumber like manager pages
    const groupedRequests = new Map<string, typeof filtered>();

    filtered.forEach((request) => {
      const group = groupedRequests.get(request.requestNumber) || [];
      group.push(request);
      groupedRequests.set(request.requestNumber, group);
    });

    // Convert to array and sort like manager pages
    const groupedRequestsArray = Array.from(groupedRequests.entries())
      .map(([requestNumber, items]) => {
        // Sort items within group by itemOrder or createdAt
        const sortedItems = items.sort((a, b) => {
          const orderA = a.itemOrder ?? a.createdAt;
          const orderB = b.itemOrder ?? b.createdAt;
          return orderA - orderB; // Ascending order
        });
        return {
          requestNumber,
          items: sortedItems,
          firstItem: sortedItems[0], // Use first item for shared data
        };
      })
      .sort((a, b) => {
        // Sort groups by the newest item's updatedAt
        const aLatest = Math.max(...a.items.map((i) => i.updatedAt || i.createdAt));
        const bLatest = Math.max(...b.items.map((i) => i.updatedAt || i.createdAt));
        return bLatest - aLatest;
      });

    return groupedRequestsArray;
  }, [allRequests, activeTab, searchQuery]);

  // Calculate stats for each tab (counting unique request groups)
  const stats = useMemo(() => {
    if (!allRequests) return { all: 0, new: 0, cc_pending: 0, ready_for_po: 0, delivery: 0 };

    // Group requests by requestNumber to count unique requests
    const requestGroups = new Map<string, any[]>();
    allRequests.forEach((request) => {
      const group = requestGroups.get(request.requestNumber) || [];
      group.push(request);
      requestGroups.set(request.requestNumber, group);
    });

    // Count groups by status
    let newCount = 0;
    let ccPendingCount = 0;
    let readyForPoCount = 0;
    let deliveryCount = 0;

    requestGroups.forEach((items) => {
      const firstItem = items[0];
      if (firstItem.status === "ready_for_cc" || firstItem.status === "cc_rejected") {
        newCount++;
      } else if (firstItem.status === "cc_pending") {
        ccPendingCount++;
      } else if (firstItem.status === "ready_for_po") {
        readyForPoCount++;
      } else if (firstItem.status === "delivery_stage") {
        deliveryCount++;
      }
    });

    return {
      all: requestGroups.size,
      new: newCount,
      cc_pending: ccPendingCount,
      ready_for_po: readyForPoCount,
      delivery: deliveryCount,
    };
  }, [allRequests]);


  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Purchase Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and process material purchase requests
            </p>
          </div>
        </div>

        {/* Enhanced Stages - Card-based approach */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {stageConfig.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeTab === stage.id;
            const count = stats[stage.id as keyof typeof stats] || 0;

            return (
              <Card
                key={stage.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md touch-manipulation",
                  isActive
                    ? "ring-2 ring-primary shadow-md bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => setActiveTab(stage.id)}
              >
                <CardContent className="p-4 text-center">
                  <div className={cn(
                    "inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 mx-auto",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm leading-tight">{stage.label}</h3>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="text-xs font-medium"
                    >
                      {count}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by request number, item, site, or requester..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground hidden sm:inline">View:</span>
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
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {filteredRequestGroups.length} {filteredRequestGroups.length === 1 ? 'request' : 'requests'} found
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Display */}
        {filteredRequestGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No requests found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : `No ${activeTab === "all" ? "" : stageConfig.find(s => s.id === activeTab)?.label.toLowerCase() + " "}requests at this stage`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequestGroups.map((group) => {
              const { requestNumber, items, firstItem } = group;
              const hasMultipleItems = items.length > 1;

              // Determine overall status for the group
              const allItemsHaveSameStatus = items.length > 0
                ? items.every((item) => item.status === items[0].status)
                : true;

              const overallStatus = allItemsHaveSameStatus ? items[0].status : "partially_processed";
              const statusInfo = statusConfig[overallStatus] || statusConfig.ready_for_cc;

              // Count urgent items
              const urgentCount = items.filter((item) => item.isUrgent).length;

              return (
                <PurchaseRequestGroupCard
                  key={requestNumber}
                  requestNumber={requestNumber}
                  items={items}
                  firstItem={firstItem}
                  statusInfo={statusInfo}
                  hasMultipleItems={hasMultipleItems}
                  urgentCount={urgentCount}
                  onViewDetails={setSelectedRequestId}
                  onOpenCC={setCCRequestId}
                  onSiteClick={setSelectedSiteId}
                  onItemClick={setSelectedItemName}
                  canEditVendor={true}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
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

      <ItemInfoDialog
        open={!!selectedItemName}
        onOpenChange={(open) => {
          if (!open) setSelectedItemName(null);
        }}
        itemName={selectedItemName}
      />

      <SiteInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        siteId={selectedSiteId}
      />
    </>
  );
}

