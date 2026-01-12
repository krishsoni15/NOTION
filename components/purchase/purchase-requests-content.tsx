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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Check } from "lucide-react";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { ItemInfoDialog } from "@/components/requests/item-info-dialog";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";
import { toast } from "sonner";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { Clock, FileText, ShoppingCart, Truck, Search, Filter, LayoutGrid, Table as TableIcon, Eye, AlertCircle, FileText as FileTextIcon, Edit, Zap, CheckCircle, XCircle } from "lucide-react";
import { RequestCardWithCC } from "./request-card-with-cc";
import { PurchaseRequestGroupCard } from "./purchase-request-group-card";
import { CostComparisonDialog } from "./cost-comparison-dialog";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { cn } from "@/lib/utils";
import { DirectPODialog, type DirectPOInitialData } from "./direct-po-dialog";
import { CheckDialog } from "./check-dialog";
import { useViewMode } from "@/hooks/use-view-mode";
import { RequestsTable } from "@/components/requests/requests-table";
import { PDFPreviewDialog } from "./pdf-preview-dialog";

// Enhanced status configuration with better visual hierarchy
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; color: string }> = {
  draft: { label: "Draft", variant: "outline", icon: FileTextIcon, color: "gray" },
  pending: { label: "Pending Approval", variant: "secondary", icon: Clock, color: "yellow" },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle, color: "red" },
  recheck: { label: "Recheck", variant: "default", icon: AlertCircle, color: "orange" },
  ready_for_cc: { label: "Ready for CC", variant: "default", icon: FileText, color: "blue" },
  cc_pending: { label: "CC Pending", variant: "secondary", icon: Clock, color: "amber" },
  cc_rejected: { label: "CC Rejected", variant: "destructive", icon: XCircle, color: "red" },
  ready_for_po: { label: "Ready for PO", variant: "default", icon: ShoppingCart, color: "emerald" },
  pending_po: { label: "Pending PO", variant: "secondary", icon: Clock, color: "amber" },
  rejected_po: { label: "PO Rejected", variant: "destructive", icon: XCircle, color: "red" },
  ready_for_delivery: { label: "Ready for Delivery", variant: "default", icon: Truck, color: "indigo" },
  delivered: { label: "Delivered", variant: "secondary", icon: CheckCircle, color: "slate" },
  delivery_stage: { label: "Delivery Stage", variant: "outline", icon: Truck, color: "orange" },
  sign_pending: { label: "Sign Pending", variant: "secondary", icon: Clock, color: "amber" },
  sign_rejected: { label: "Sign Rejected", variant: "destructive", icon: XCircle, color: "red" },
};

export function PurchaseRequestsContent() {
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [checkRequestId, setCheckRequestId] = useState<Id<"requests"> | null>(null);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const { viewMode, toggleViewMode } = useViewMode();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);
  const [showDirectPODialog, setShowDirectPODialog] = useState(false);
  const [directPOInitialData, setDirectPOInitialData] = useState<DirectPOInitialData | null>(null);
  const [pdfPreviewPoNumber, setPdfPreviewPoNumber] = useState<string | null>(null);

  const allRequests = useQuery(api.requests.getPurchaseRequestsByStatus, {});

  // Enhanced filtering with search - group by requestNumber like manager pages
  const filteredRequestGroups = useMemo(() => {
    if (!allRequests) return [];

    let filtered = allRequests;

    // Filter by status dropdown
    // Filter by status dropdown
    if (filterStatus.length > 0) {
      filtered = filtered.filter((r) => filterStatus.includes(r.status));
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
  }, [allRequests, filterStatus, searchQuery]);

  const directToPO = useMutation(api.requests.directToPO);
  const updatePurchaseStatus = useMutation(api.requests.updatePurchaseRequestStatus);

  const handleDirectPO = async (requestId: Id<"requests">) => {
    try {
      await directToPO({ requestId });
      toast.success("Request moved to Ready for PO");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDirectDelivery = async (requestId: Id<"requests">) => {
    try {
      await updatePurchaseStatus({ requestId, status: "ready_for_delivery" });
      toast.success("Request moved to Delivery Stage");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleMoveToCC = async (requestId: Id<"requests">) => {
    try {
      await updatePurchaseStatus({ requestId, status: "ready_for_cc" });
      toast.success("Request moved to Ready for CC");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleCheck = (requestId: Id<"requests">) => {
    setCheckRequestId(requestId);
  };

  const handleCreatePO = (requestId: Id<"requests">) => {
    const request = allRequests?.find(r => r._id === requestId);

    if (request) {
      let unitPrice = 0;
      let vendorId = request.selectedVendorId;

      // Try to find price from selected vendor quote
      if (vendorId && request.vendorQuotes) {
        const quote = request.vendorQuotes.find(q => q.vendorId === vendorId);
        if (quote) {
          unitPrice = quote.unitPrice || 0;
        }
      }

      setDirectPOInitialData({
        requestNumber: request.requestNumber,
        vendorId: vendorId || undefined,
        deliverySiteId: request.site?._id,
        deliverySiteName: request.site?.name,
        items: [{
          requestId: request._id,
          itemDescription: request.itemName,
          description: request.description,
          quantity: request.quantity,
          unit: request.unit,
          unitPrice: unitPrice,
        }]
      });
    } else {
      setDirectPOInitialData(null);
    }

    setShowDirectPODialog(true);
  };

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
          <Button
            onClick={() => setShowDirectPODialog(true)}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Zap className="h-4 w-4 mr-2" />
            Create Direct PO
          </Button>
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

                {/* Status Filter */}
                <div className="w-full sm:w-[250px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {filterStatus.length > 0
                          ? `${filterStatus.length} selected`
                          : "Filter by status"}
                        <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search status..." />
                        <CommandList>
                          <CommandEmpty>No status found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setFilterStatus([])}
                              className="font-medium"
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  filterStatus.length === 0
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}
                              >
                                <Check className={cn("h-4 w-4")} />
                              </div>
                              All Statuses
                            </CommandItem>
                            {/* Draft (My Drafts) Special Case */}
                            <CommandItem
                              onSelect={() => {
                                setFilterStatus((prev) =>
                                  prev.includes("draft")
                                    ? prev.filter((s) => s !== "draft")
                                    : [...prev, "draft"]
                                );
                              }}
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  filterStatus.includes("draft")
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}
                              >
                                <Check className={cn("h-4 w-4")} />
                              </div>
                              Draft (My Drafts)
                            </CommandItem>
                            {Object.entries(statusConfig)
                              .filter(([key]) => key !== "draft") // Already handled above
                              .map(([key, config]) => (
                                <CommandItem
                                  key={key}
                                  onSelect={() => {
                                    setFilterStatus((prev) =>
                                      prev.includes(key)
                                        ? prev.filter((s) => s !== key)
                                        : [...prev, key]
                                    );
                                  }}
                                >
                                  <div
                                    className={cn(
                                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                      filterStatus.includes(key)
                                        ? "bg-primary text-primary-foreground"
                                        : "opacity-50 [&_svg]:invisible"
                                    )}
                                  >
                                    <Check className={cn("h-4 w-4")} />
                                  </div>
                                  {config.label}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                          {filterStatus.length > 0 && (
                            <>
                              <CommandSeparator />
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => setFilterStatus([])}
                                  className="justify-center text-center"
                                >
                                  Clear filters
                                </CommandItem>
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground hidden sm:inline mr-2">View:</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleViewMode}
                    className="h-8 w-8"
                    title={viewMode === "card" ? "Show Table" : "Show Cards"}
                  >
                    {viewMode === "card" ? (
                      <TableIcon className="h-4 w-4" />
                    ) : (
                      <LayoutGrid className="h-4 w-4" />
                    )}
                  </Button>
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
                      : "No requests found with current status filter"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <RequestsTable
            requests={filteredRequestGroups.flatMap(group => group.items)}
            viewMode="table"
            onViewDetails={setSelectedRequestId}
            onOpenCC={(requestId, requestIds) => setCCRequestId(requestId)}
            onDirectPO={handleDirectPO}
            onDirectDelivery={handleDirectDelivery}
            showCreator={true}
          />
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
              const statusInfo = statusConfig[overallStatus] || { label: overallStatus, variant: "outline", icon: FileText, color: "gray" };

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
                  onDirectPO={handleDirectPO}
                  onDirectDelivery={handleDirectDelivery}
                  onMoveToCC={handleMoveToCC}
                  onCheck={handleCheck}
                  onCreatePO={handleCreatePO}
                  onViewPDF={setPdfPreviewPoNumber}
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

      {ccRequestId && (
        <CostComparisonDialog
          open={!!ccRequestId}
          onOpenChange={(open) => {
            if (!open) {
              setCCRequestId(null);
            }
          }}
          requestId={ccRequestId}
        />
      )}

      {checkRequestId && (
        <CheckDialog
          open={!!checkRequestId}
          onOpenChange={(open) => !open && setCheckRequestId(null)}
          requestId={checkRequestId}
        />
      )}

      <ItemInfoDialog
        open={!!selectedItemName}
        onOpenChange={(open) => {
          if (!open) setSelectedItemName(null);
        }}
        itemName={selectedItemName}
      />

      <LocationInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        locationId={selectedSiteId}
      />

      <DirectPODialog
        open={showDirectPODialog}
        onOpenChange={(open) => {
          setShowDirectPODialog(open);
          if (!open) setDirectPOInitialData(null);
        }}
        initialData={directPOInitialData}
      />

      <PDFPreviewDialog
        open={!!pdfPreviewPoNumber}
        onOpenChange={(open) => !open && setPdfPreviewPoNumber(null)}
        poNumber={pdfPreviewPoNumber}
      />
    </>
  );
}

