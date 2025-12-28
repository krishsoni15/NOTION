"use client";

/**
 * Requests Table Component
 * 
 * Displays material requests in a table with status badges, urgent tags, and filtering.
 */

import { useState, Fragment } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Eye, AlertCircle, FileText, Edit, Trash2, Send, ChevronDown, ChevronRight } from "lucide-react";
import { cn, normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
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

interface Request {
  _id: Id<"requests">;
  requestNumber: string;
  createdBy: Id<"users">;
  siteId: Id<"sites">;
  itemName: string;
  description: string;
  specsBrand?: string;
  quantity: number;
  unit: string;
  requiredBy: number;
  isUrgent: boolean;
  photo?: {
    imageUrl: string;
    imageKey: string;
  };
  itemOrder?: number; // Order of item within the request (1, 2, 3...)
  status: RequestStatus;
  approvedBy?: Id<"users">;
  approvedAt?: number;
  rejectionReason?: string;
  deliveryMarkedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  site?: {
    _id: Id<"sites">;
    name: string;
    code?: string;
    address?: string;
  } | null;
  creator?: {
    _id: Id<"users">;
    fullName: string;
  } | null;
  approver?: {
    _id: Id<"users">;
    fullName: string;
  } | null;
}

interface RequestsTableProps {
  requests: Request[] | undefined;
  onViewDetails?: (requestId: Id<"requests">) => void;
  onOpenCC?: (requestId: Id<"requests">) => void; // Open cost comparison dialog
  showCreator?: boolean; // Show creator column (for manager view)
  onEditDraft?: (requestNumber: string) => void; // Edit draft request
  onDeleteDraft?: (requestNumber: string) => void; // Delete draft request
  onSendDraft?: (requestNumber: string) => void; // Send draft request
  newlySentRequestNumbers?: Set<string>; // Request numbers that were just sent (for animation)
  viewMode?: "card" | "table"; // View mode: card or table
}

export function RequestsTable({
  requests,
  onViewDetails,
  onOpenCC,
  showCreator = false,
  onEditDraft,
  onDeleteDraft,
  onSendDraft,
  newlySentRequestNumbers = new Set(),
  viewMode = "table",
}: RequestsTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (!requests) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  // Group requests by requestNumber (requests are already filtered by parent)
  const groupedRequests = new Map<string, Request[]>();
  requests.forEach((req) => {
    const group = groupedRequests.get(req.requestNumber) || [];
    group.push(req);
    groupedRequests.set(req.requestNumber, group);
  });

  // Convert to array and sort by request number (newest first)
  const groupedRequestsArray = Array.from(groupedRequests.entries())
    .map(([requestNumber, items]) => {
      // Sort items within group by itemOrder (1, 2, 3...) or createdAt as fallback
      const sortedItems = items.sort((a, b) => {
        const orderA = a.itemOrder ?? a.createdAt;
        const orderB = b.itemOrder ?? b.createdAt;
        return orderA - orderB; // Ascending order: 1, 2, 3...
      });
      return {
        requestNumber,
        items: sortedItems,
        firstItem: sortedItems[0], // Use first item for shared data (site, date, status, etc.)
      };
    })
    .sort((a, b) => {
      // Sort groups by the newest item's updatedAt
      const aLatest = Math.max(...a.items.map((i) => i.updatedAt));
      const bLatest = Math.max(...b.items.map((i) => i.updatedAt));
      return bLatest - aLatest;
    });

  const toggleGroup = (requestNumber: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(requestNumber)) {
        next.delete(requestNumber);
      } else {
        next.add(requestNumber);
      }
      return next;
    });
  };

  // Get status badge variant
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800">
            Draft
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            Approved
          </Badge>
        );
      case "ready_for_cc":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            Ready for CC
          </Badge>
        );
      case "cc_pending":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            CC Pending
          </Badge>
        );
      case "cc_approved":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
            CC Approved
          </Badge>
        );
      case "ready_for_po":
        return (
          <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800">
            Ready for PO
          </Badge>
        );
      case "delivery_stage":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
            Delivery Stage
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
            Rejected
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            Delivered
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (groupedRequestsArray.length === 0 && requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No requests yet. Create your first request to get started.
      </div>
    );
  }

  if (groupedRequestsArray.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No requests found matching your filters.
      </div>
    );
  }

  // Card View Component
  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
      {groupedRequestsArray.map((group) => {
        const { requestNumber, items, firstItem } = group;
        const isExpanded = expandedGroups.has(requestNumber);
        const isNewlySent = newlySentRequestNumbers.has(requestNumber);
        const hasMultipleItems = items.length > 1;

        return (
          <div
            key={requestNumber}
            className={cn(
              "border rounded-lg p-3 sm:p-4 bg-card shadow-sm grouped-card-hover touch-manipulation",
              isNewlySent && "bg-primary/10 border-l-4 border-l-primary shadow-md",
              hasMultipleItems && "cursor-pointer"
            )}
            onClick={() => hasMultipleItems && toggleGroup(requestNumber)}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-primary">
                    #{requestNumber}
                  </span>
                  {getStatusBadge(firstItem.status)}
                  {hasMultipleItems && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {items.length} items
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-medium text-foreground truncate">
                  {firstItem.site?.name || "—"}
                </div>
                {firstItem.site?.code && (
                  <div className="text-xs text-muted-foreground">
                    Code: {firstItem.site.code}
                  </div>
                )}
              </div>
              {hasMultipleItems && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs touch-manipulation min-h-[32px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(requestNumber);
                  }}
                >
                  {isExpanded ? (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Collapse</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Expand ({items.length - 1} more)</span>
                      <span className="sm:hidden">+{items.length - 1}</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-3 mb-3">
              {isExpanded ? (
                items.map((item, idx) => {
                  const displayNumber = item.itemOrder ?? idx + 1;
                  return (
                  <div
                    key={item._id}
                    className="p-3 rounded-lg border bg-card/50 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[24px] flex items-center justify-center flex-shrink-0">
                            {displayNumber}
                          </Badge>
                          <div className="space-y-1 text-sm flex-1 min-w-0">
                            <div className="break-words">
                              <span className="font-medium text-muted-foreground">Item:</span> <span className="whitespace-normal">{item.itemName}</span>
                            </div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground break-words whitespace-normal">
                                <span className="font-medium">Dis:</span> {item.description}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                              <span><span className="font-medium">Quantity:</span> {item.quantity} {item.unit}</span>
                              {item.specsBrand && (
                                <span className="text-primary">• {item.specsBrand}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-7">
                          {item.isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                          {item.photo && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              📷
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between flex-shrink-0">
                        <div className="text-xs">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })
              ) : (
                <div className="p-3 rounded-lg border bg-card/50 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[24px] flex items-center justify-center flex-shrink-0">
                      {items[0].itemOrder ?? 1}
                    </Badge>
                    <div className="space-y-1 text-sm flex-1 min-w-0">
                      <div className="break-words">
                        <span className="font-medium text-muted-foreground">Item:</span> <span className="whitespace-normal">{items[0].itemName}</span>
                      </div>
                      {items[0].description && (
                        <div className="text-xs text-muted-foreground break-words whitespace-normal">
                          <span className="font-medium">Dis:</span> {items[0].description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Quantity:</span> {items[0].quantity} {items[0].unit}
                      </div>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <div className="text-xs text-primary font-medium border-t pt-2 mt-2 cursor-pointer hover:underline">
                      +{items.length - 1} more item{items.length - 1 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
              {!isExpanded && hasMultipleItems && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(requestNumber);
                  }}
                  className="w-full p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 active:bg-primary/15 transition-colors text-sm font-medium text-primary touch-manipulation"
                >
                  <div className="flex items-center justify-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    <span>Show {items.length - 1} more item{items.length - 1 > 1 ? "s" : ""}</span>
                  </div>
                </button>
              )}
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">Required:</span> {format(new Date(firstItem.requiredBy), "dd/MM/yyyy")}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Created:</span> {format(new Date(firstItem.createdAt), "dd/MM/yyyy hh:mm a")}
                </div>
              </div>
              <div className="flex gap-1">
                {firstItem.status === "draft" && (
                  <>
                    {onEditDraft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditDraft(requestNumber)}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {onSendDraft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSendDraft(requestNumber)}
                        className="h-7 px-2 text-xs"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    {onDeleteDraft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteDraft(requestNumber)}
                        className="h-7 px-2 text-xs text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(firstItem._id)}
                    className="h-7 px-2 text-xs"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Table View
  return (
    <>
      {viewMode === "card" ? (
        <CardView />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] hidden sm:table-cell">
                      <span className="sr-only">Group Indicator</span>
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm">Request #</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Site Location</TableHead>
                    <TableHead className="text-xs sm:text-sm">Dates</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[200px] max-w-[400px]">Items</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Tags</TableHead>
                    {showCreator && <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Created By</TableHead>}
                    {onViewDetails && <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
            <TableBody>
              {groupedRequestsArray.map((group) => {
                const { requestNumber, items, firstItem } = group;
                const isExpanded = expandedGroups.has(requestNumber);
                const isNewlySent = newlySentRequestNumbers.has(requestNumber);
                const hasMultipleItems = items.length > 1;
                
                return (
                  <Fragment key={requestNumber}>
                    {/* Group Header Row */}
                    <TableRow
                      className={cn(
                        "transition-all duration-300 cursor-pointer hover:bg-muted/50",
                        isNewlySent && "bg-primary/10 border-l-4 border-l-primary shadow-md",
                        hasMultipleItems && "border-b-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent"
                      )}
                      onClick={() => hasMultipleItems && toggleGroup(requestNumber)}
                    >
                      <TableCell className="w-[50px] hidden sm:table-cell">
                        {hasMultipleItems && (
                          <div className="flex items-center justify-center">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
                                {items.length}
                              </Badge>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span>#{requestNumber}</span>
                          {hasMultipleItems && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">
                              {items.length} items
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          {firstItem.site?.name || "—"}
                          {firstItem.site?.code && (
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({firstItem.site.code})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="space-y-0.5">
                          <div><span className="font-medium text-muted-foreground">Required:</span> {format(new Date(firstItem.requiredBy), "dd/MM/yyyy")}</div>
                          <div className="text-xs text-muted-foreground"><span className="font-medium">Created:</span> {format(new Date(firstItem.createdAt), "dd/MM/yyyy hh:mm a")}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div className="space-y-2">
                          {isExpanded ? (
                            <div className="space-y-2">
                              {items.map((item, idx) => {
                                const displayNumber = item.itemOrder ?? idx + 1;
                                return (
                                <div key={item._id} className="p-2 rounded-md border bg-card">
                                  <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start gap-2">
                                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[20px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {displayNumber}
                                      </Badge>
                                      <div className="flex-1 min-w-0 space-y-1">
                                        <div className="break-words">
                                          <span className="font-medium text-muted-foreground">Item:</span> <span className="whitespace-normal">{item.itemName}</span>
                                        </div>
                                        {item.description && (
                                          <div className="text-xs text-muted-foreground break-words whitespace-normal">
                                            <span className="font-medium">Dis:</span> {item.description}
                                          </div>
                                        )}
                                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                                          <span><span className="font-medium">Quantity:</span> {item.quantity} {item.unit}</span>
                                          {item.isUrgent && (
                                            <Badge variant="destructive" className="text-xs px-1 py-0 h-4 flex-shrink-0">
                                              Urgent
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[20px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {items[0].itemOrder ?? 1}
                                </Badge>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="text-sm break-words">
                                    <span className="font-medium text-muted-foreground">Item:</span> <span className="whitespace-normal">{items[0].itemName}</span>
                                  </div>
                                  {items[0].description && (
                                    <div className="text-xs text-muted-foreground break-words whitespace-normal">
                                      <span className="font-medium">Dis:</span> {items[0].description}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Quantity:</span> {items[0].quantity} {items[0].unit}
                                  </div>
                                </div>
                              </div>
                              {items.length > 1 && (
                                <div className="text-xs text-primary font-medium border-t pt-1 cursor-pointer hover:underline">
                                  +{items.length - 1} more item{items.length - 1 > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(firstItem.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-2 flex-wrap">
                          {items.some((item) => item.isUrgent) && (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1 text-xs"
                            >
                              <AlertCircle className="h-3 w-3" />
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {showCreator && (
                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                          {firstItem.creator?.fullName || "—"}
                        </TableCell>
                      )}
                      {onViewDetails && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {/* Draft action buttons */}
                            {firstItem.status === "draft" && (
                              <>
                                {onEditDraft && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditDraft(requestNumber);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                )}
                                {onSendDraft && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSendDraft(requestNumber);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Send
                                  </Button>
                                )}
                                {onDeleteDraft && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteDraft(requestNumber);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                )}
                              </>
                            )}
                            {/* CC button for cost comparison statuses */}
                            {(firstItem.status === "cc_pending" || firstItem.status === "ready_for_cc") && onOpenCC && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCC(firstItem._id);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                CC
                              </Button>
                            )}
                            {/* View button - show for first item */}
                            <Button
                              variant={showCreator && firstItem.status === "pending" ? "default" : "ghost"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(firstItem._id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {showCreator && firstItem.status === "pending" ? "Review" : "View"}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


