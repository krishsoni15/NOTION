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
import { CheckDialog } from "@/components/purchase/check-dialog";
import { useViewMode } from "@/hooks/use-view-mode";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, LayoutGrid, Table as TableIcon, Check, Package } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  | "delivered"
  | "partially_processed"
  | "sign_pending"
  | "sign_rejected";

export function ManagerRequestsContent() {
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [checkRequestId, setCheckRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestIds, setCCRequestIds] = useState<Id<"requests">[] | undefined>(undefined); // For batch CC viewing
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [workFilter, setWorkFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState<string>("all");
  const { viewMode, toggleViewMode } = useViewMode();

  const allRequests = useQuery(api.requests.getAllRequests);

  // Collect all unique item names from requests to fetch inventory
  const uniqueItemNames = useMemo(() => {
    if (!allRequests) return [];
    const names = new Set<string>();
    allRequests.forEach((req) => names.add(req.itemName));
    return Array.from(names);
  }, [allRequests]);

  // Query inventory status for all items
  const inventoryStatus = useQuery(
    api.inventory.getInventoryStatusForItems,
    uniqueItemNames.length > 0 ? { itemNames: uniqueItemNames } : "skip"
  );

  // Filter requests based on category, status, search query, and inventory status
  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];

    return allRequests.filter((request) => {
      // Work Filter (Inbox vs All)
      if (workFilter === "work_pending") {
        // Detail Review: 
        // 1. General: Pending (Inbox) + CC Pending (Purchase Review)
        // 2. Site Engineer Context: Strictly "Pending" (Initial Approval) - user request
        const validStatuses = categoryFilter === "site_engineer"
          ? ["pending"]
          : ["pending", "cc_pending", "sign_pending", "sign_rejected"];

        if (!validStatuses.includes(request.status)) {
          return false;
        }
      }

      // Category filter (Source/Phase based)
      if (categoryFilter !== "all") {
        let matchesCategory = false;
        switch (categoryFilter) {
          case "site_engineer":
            // Incoming from Site Engineer (All statuses)
            matchesCategory = request.creator?.role === "site_engineer";
            break;
          case "purchases":
            // Purchase Phase: Approved by Manager (Ready for CC), Incoming from Purchase (CC Pending),
            // or Post-Purchase processing (Ready for PO, Delivered, etc.) OR Created by Purchase Officer
            matchesCategory = request.creator?.role === "purchase_officer" ||
              ["ready_for_cc", "cc_pending", "cc_approved", "cc_rejected", "ready_for_po", "delivery_stage", "delivered", "partially_processed", "sign_pending", "sign_rejected"].includes(request.status);
            break;
        }
        if (!matchesCategory) {
          return false;
        }
      }

      // Detailed Status filter (Multi-select)
      if (statusFilter.length > 0) {
        if (!statusFilter.includes(request.status)) {
          return false;
        }
      }

      // Inventory Status Filter
      if (inventoryFilter !== "all") {
        if (!inventoryStatus) return false; // If loading, maybe show nothing or all? Safe to return false if strict
        const status = inventoryStatus[request.itemName];
        if (!status) return false;

        if (inventoryFilter === "new_item") {
          if (status.status !== "new_item") return false;
        } else if (inventoryFilter === "out_of_stock") {
          // Explicit out of stock status or 0 stock (and not new item)
          const isOutOfStock = status.status === "out_of_stock" || (status.status !== "new_item" && (status.centralStock || 0) <= 0);
          if (!isOutOfStock) return false;
        } else if (inventoryFilter === "partially_stocked") {
          // Has stock but less than requested
          const stock = status.centralStock || 0;
          const isPartial = status.status !== "new_item" && stock > 0 && stock < request.quantity;
          if (!isPartial) return false;
        } else if (inventoryFilter === "in_stock") {
          // Has sufficient stock
          const stock = status.centralStock || 0;
          const isSufficient = status.status !== "new_item" && stock >= request.quantity;
          if (!isSufficient) return false;
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
  }, [allRequests, searchQuery, workFilter, categoryFilter, statusFilter, inventoryFilter, inventoryStatus]);

  // --- Smart Counts Logic ---

  // 1. Available requests for Work Filter (Filtered by Category & Status)
  const requestsForWorkCounts = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter(req => {
      // Apply Category Filter
      if (categoryFilter !== "all") {
        if (categoryFilter === "site_engineer" && req.creator?.role !== "site_engineer") return false;
        if (categoryFilter === "purchases" && !(req.creator?.role === "purchase_officer" || ["ready_for_cc", "cc_pending", "cc_approved", "cc_rejected", "ready_for_po", "delivery_stage", "delivered", "partially_processed", "sign_pending", "sign_rejected"].includes(req.status))) return false;
      }
      // Apply Status Filter
      if (statusFilter.length > 0 && !statusFilter.includes(req.status)) return false;
      // Apply Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return req.requestNumber.toLowerCase().includes(query) ||
          req.itemName.toLowerCase().includes(query) ||
          req.creator?.fullName.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allRequests, categoryFilter, statusFilter, searchQuery]);

  const workCounts = useMemo(() => {
    return {
      work_pending: requestsForWorkCounts.filter(r => {
        // If Site Engineer category is active, Detail Review only implies 'pending'
        if (categoryFilter === "site_engineer") return r.status === "pending";
        return ["pending", "cc_pending", "sign_pending", "sign_rejected"].includes(r.status);
      }).length
    };
  }, [requestsForWorkCounts, categoryFilter]);

  // 2. Available requests for Category Filter (Filtered by Work & Status)
  const requestsForCategoryCounts = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter(req => {
      // Apply Work Filter (Base logic, refined in counts)
      if (workFilter === "work_pending") {
        // We allow broader here, and filter strictly in the count step if needed
        if (!["pending", "cc_pending", "sign_pending", "sign_rejected"].includes(req.status)) return false;
      }
      // Apply Status Filter
      if (statusFilter.length > 0 && !statusFilter.includes(req.status)) return false;
      // Apply Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return req.requestNumber.toLowerCase().includes(query) ||
          req.itemName.toLowerCase().includes(query) ||
          req.creator?.fullName.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allRequests, workFilter, statusFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    const siteEngReqs = requestsForCategoryCounts.filter(r => r.creator?.role === "site_engineer");
    // If Detail Review is active, Site Engineer count is strictly 'pending'
    const siteEngCount = workFilter === "work_pending"
      ? siteEngReqs.filter(r => r.status === "pending").length
      : siteEngReqs.length;

    const purchasesReqs = requestsForCategoryCounts.filter(r => r.creator?.role === "purchase_officer" || ["ready_for_cc", "cc_pending", "cc_approved", "cc_rejected", "ready_for_po", "delivery_stage", "delivered", "partially_processed", "sign_pending", "sign_rejected"].includes(r.status));

    return {
      site_engineer: siteEngCount,
      purchases: purchasesReqs.length
    };
  }, [requestsForCategoryCounts, workFilter]);

  // 3. Available requests for Status Filter (Filtered by Work & Category)
  const requestsForStatusCounts = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter(req => {
      // Apply Work Filter
      if (workFilter === "work_pending" && !["pending", "cc_pending", "sign_pending", "sign_rejected"].includes(req.status)) return false;
      // Apply Category Filter
      if (categoryFilter !== "all") {
        if (categoryFilter === "site_engineer" && req.creator?.role !== "site_engineer") return false;
        if (categoryFilter === "purchases" && !(req.creator?.role === "purchase_officer" || ["ready_for_cc", "cc_pending", "cc_approved", "cc_rejected", "ready_for_po", "delivery_stage", "delivered", "partially_processed", "sign_pending", "sign_rejected"].includes(req.status))) return false;
      }
      // Apply Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return req.requestNumber.toLowerCase().includes(query) ||
          req.itemName.toLowerCase().includes(query) ||
          req.creator?.fullName.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allRequests, workFilter, categoryFilter, searchQuery]);

  // Helper to get count for a specific status from the smart list
  const getSmartStatusCount = (status: string) => {
    return requestsForStatusCounts.filter(r => r.status === status).length;
  };

  // Individual status options for detailed filtering with colors
  const detailedStatusOptions = [
    { value: "draft", label: "Draft", count: getSmartStatusCount("draft"), color: "text-gray-500" },
    { value: "pending", label: "Pending", count: getSmartStatusCount("pending"), color: "text-amber-600" },
    { value: "partially_processed", label: "Partially Processed", count: getSmartStatusCount("partially_processed"), color: "text-blue-600" },
    { value: "approved", label: "Approved", count: getSmartStatusCount("approved"), color: "text-emerald-600" },
    { value: "ready_for_cc", label: "Ready for CC", count: getSmartStatusCount("ready_for_cc"), color: "text-indigo-600" },
    { value: "cc_pending", label: "CC Pending", count: getSmartStatusCount("cc_pending"), color: "text-purple-600" },
    { value: "cc_approved", label: "CC Approved", count: getSmartStatusCount("cc_approved"), color: "text-green-600" },
    { value: "ready_for_po", label: "Ready for PO", count: getSmartStatusCount("ready_for_po"), color: "text-teal-600" },
    { value: "delivery_stage", label: "Delivery Stage", count: getSmartStatusCount("delivery_stage"), color: "text-orange-600" },
    { value: "delivered", label: "Delivered", count: getSmartStatusCount("delivered"), color: "text-sky-600" },
    { value: "rejected", label: "Rejected", count: getSmartStatusCount("rejected"), color: "text-red-600" },
    { value: "cc_rejected", label: "CC Rejected", count: getSmartStatusCount("cc_rejected"), color: "text-red-500" },
    { value: "sign_pending", label: "Sign Pending", count: getSmartStatusCount("sign_pending"), color: "text-amber-600" },
    { value: "sign_rejected", label: "Sign Rejected", count: getSmartStatusCount("sign_rejected"), color: "text-red-600" },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by request number, item, site, or creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="w-full sm:w-[180px]">
                    <Select value={workFilter} onValueChange={setWorkFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="work_pending">Detail Review ({workCounts.work_pending || 0})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-[200px]">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="site_engineer">Site Engineer ({categoryCounts.site_engineer || 0})</SelectItem>
                        <SelectItem value="purchases">Purchases ({categoryCounts.purchases || 0})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-[180px]">
                    <Select value={inventoryFilter} onValueChange={setInventoryFilter}>
                      <SelectTrigger className="h-9">
                        <Package className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Inventory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Inventory</SelectItem>
                        <SelectItem value="new_item">New Item</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                        <SelectItem value="partially_stocked">Partially Stocked</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-[180px]">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 w-full justify-between px-3 text-left font-normal">
                          <span className="truncate">
                            {statusFilter.length === 0
                              ? "All Statuses"
                              : `${statusFilter.length} Selected`}
                          </span>
                          <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search status..." />
                          <CommandList>
                            <CommandEmpty>No status found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => setStatusFilter([])}
                                className="cursor-pointer"
                              >
                                <div className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  statusFilter.length === 0
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}>
                                  <Check className={cn("h-4 w-4")} />
                                </div>
                                <span>All Statuses</span>
                              </CommandItem>
                              <CommandSeparator className="my-1" />
                              {detailedStatusOptions.map((option) => {
                                const isSelected = statusFilter.includes(option.value);
                                return (
                                  <CommandItem
                                    key={option.value}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setStatusFilter(statusFilter.filter((s) => s !== option.value));
                                      } else {
                                        setStatusFilter([...statusFilter, option.value]);
                                      }
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className={cn(
                                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                      isSelected
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "opacity-50 [&_svg]:invisible border-input",
                                      // If not selected, tint the border slightly with the color (optional), or just keep standard.
                                      // Here we keep standard border but colored text. 
                                    )}>
                                      <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <span className={cn("flex-1", option.color)}>{option.label}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                      {option.count}
                                    </span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              {/* View Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground mr-2">View:</span>
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
          onOpenCC={(requestId, requestIds) => {
            setCCRequestId(requestId);
            setCCRequestIds(requestIds);
          }}
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
        onCheck={(requestId) => setCheckRequestId(requestId)}
      />

      <CostComparisonDialog
        open={!!ccRequestId}
        onOpenChange={(open) => {
          if (!open) {
            setCCRequestId(null);
            setCCRequestIds(undefined);
          }
        }}
        requestId={ccRequestId!}
        requestIds={ccRequestIds}
      />

      {checkRequestId && (
        <CheckDialog
          open={!!checkRequestId}
          onOpenChange={(open) => !open && setCheckRequestId(null)}
          requestId={checkRequestId}
        />
      )}
    </>
  );
}

