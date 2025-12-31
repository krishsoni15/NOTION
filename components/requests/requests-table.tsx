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
import { Eye, AlertCircle, FileText, Edit, Trash2, Send, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { LazyImage } from "@/components/ui/lazy-image";
import { cn, normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import { UserInfoDialog } from "./user-info-dialog";
import { ItemInfoDialog } from "./item-info-dialog";
import { SiteInfoDialog } from "./site-info-dialog";
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

// Enhanced status color mapping for view buttons with better visuals
const getStatusButtonStyles = (status: RequestStatus) => {
  const baseClasses = "border-2 font-medium shadow-sm hover:shadow-md transition-all duration-200";

  switch (status) {
    case "draft":
      return `${baseClasses} border-slate-300 text-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300 dark:from-slate-800 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-600`;
    case "pending":
      return `${baseClasses} border-amber-300 text-amber-800 bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 hover:border-amber-400 dark:border-amber-600 dark:text-amber-300 dark:from-amber-900 dark:to-amber-800 dark:hover:from-amber-800 dark:hover:to-amber-700`;
    case "approved":
      return `${baseClasses} border-emerald-300 text-emerald-800 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-400 dark:border-emerald-600 dark:text-emerald-300 dark:from-emerald-900 dark:to-emerald-800 dark:hover:from-emerald-800 dark:hover:to-emerald-700`;
    case "ready_for_cc":
      return `${baseClasses} border-sky-300 text-sky-800 bg-gradient-to-r from-sky-50 to-sky-100 hover:from-sky-100 hover:to-sky-200 hover:border-sky-400 dark:border-sky-600 dark:text-sky-300 dark:from-sky-900 dark:to-sky-800 dark:hover:from-sky-800 dark:hover:to-sky-700`;
    case "cc_pending":
      return `${baseClasses} border-violet-300 text-violet-800 bg-gradient-to-r from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-200 hover:border-violet-400 dark:border-violet-600 dark:text-violet-300 dark:from-violet-900 dark:to-violet-800 dark:hover:from-violet-800 dark:hover:to-violet-700`;
    case "cc_approved":
      return `${baseClasses} border-indigo-300 text-indigo-800 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 hover:border-indigo-400 dark:border-indigo-600 dark:text-indigo-300 dark:from-indigo-900 dark:to-indigo-800 dark:hover:from-indigo-800 dark:hover:to-indigo-700`;
    case "ready_for_po":
      return `${baseClasses} border-teal-300 text-teal-800 bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 hover:border-teal-400 dark:border-teal-600 dark:text-teal-300 dark:from-teal-900 dark:to-teal-800 dark:hover:from-teal-800 dark:hover:to-teal-700`;
    case "delivery_stage":
      return `${baseClasses} border-orange-300 text-orange-800 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 hover:border-orange-400 dark:border-orange-600 dark:text-orange-300 dark:from-orange-900 dark:to-orange-800 dark:hover:from-orange-800 dark:hover:to-orange-700`;
    case "rejected":
      return `${baseClasses} border-rose-300 text-rose-800 bg-gradient-to-r from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 hover:border-rose-400 dark:border-rose-600 dark:text-rose-300 dark:from-rose-900 dark:to-rose-800 dark:hover:from-rose-800 dark:hover:to-rose-700`;
    case "delivered":
      return `${baseClasses} border-blue-300 text-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 dark:border-blue-600 dark:text-blue-300 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700`;
    default:
      return `${baseClasses} border-blue-300 text-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 dark:border-blue-600 dark:text-blue-300 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700`;
  }
};

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
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);

  const handleOpenInMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

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
      // Sort items within group by itemOrder (latest first: 3, 2, 1) or createdAt as fallback
      const sortedItems = items.sort((a, b) => {
        const orderA = a.itemOrder ?? a.createdAt;
        const orderB = b.itemOrder ?? b.createdAt;
        return orderB - orderA; // Descending order: 3, 2, 1...
      });
      return {
      requestNumber,
        items: sortedItems,
        firstItem: sortedItems[0], // Use latest item for shared data (site, date, status, etc.)
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
        const urgentCount = items.filter((item) => item.isUrgent).length;
        const totalItems = items.length;

        // Check if all items in the group have the same status
        const allItemsHaveSameStatus = items.length > 0
          ? items.every((item) => item.status === items[0].status)
          : true;

        return (
          <div
            key={requestNumber}
            className={cn(
              "border rounded-lg p-3 sm:p-4 bg-card shadow-sm grouped-card-hover touch-manipulation",
              isNewlySent && "bg-primary/10 border-l-4 border-l-primary shadow-md"
            )}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-nowrap overflow-x-auto">
                  <span className="font-mono text-xs font-semibold text-primary flex-shrink-0">
                    #{requestNumber}
                  </span>
                  {allItemsHaveSameStatus && (
                    <div className="flex-shrink-0">
                      {getStatusBadge(firstItem.status)}
                    </div>
                  )}
                  {urgentCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="flex items-center gap-1 text-xs flex-shrink-0"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {urgentCount}/{totalItems} urgent{urgentCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {firstItem.site?.address && (
                      <button
                        onClick={() => handleOpenInMap(firstItem.site?.address || '')}
                        className="text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-2 transition-colors shrink-0 border border-primary/20 hover:border-primary/40"
                        title="Open in Maps"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {firstItem.site ? (
                      <button
                        onClick={() => setSelectedSiteId(firstItem.site!._id)}
                        className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left truncate flex-1 border border-transparent hover:border-primary/20"
                      >
                        {firstItem.site.name}
                      </button>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
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
                      <span className="hidden sm:inline">Expand ({items.length - 1})</span>
                      <span className="sm:hidden">+{items.length - 1}</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Items List */}
            <div
              className={cn("space-y-3 mb-3", hasMultipleItems && "cursor-pointer")}
              onClick={() => hasMultipleItems && toggleGroup(requestNumber)}
            >
              {isExpanded ? (
                items.map((item, idx) => {
                  const displayNumber = item.itemOrder ?? (items.length - idx);
                  return (
                  <div
                    key={item._id}
                    className={cn(
                      "p-3 rounded-lg border shadow-sm",
                      item.status === "approved" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                      item.status === "rejected" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                      item.status === "cc_rejected" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                      !["approved", "rejected", "cc_rejected"].includes(item.status) && "bg-card/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[24px] flex items-center justify-center flex-shrink-0">
                            {displayNumber}
                          </Badge>
                          <div className="space-y-1 text-sm flex-1 min-w-0">
                            <div className="break-words">
                              <span className="font-medium text-muted-foreground">Item:</span>{" "}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemName(item.itemName);
                                }}
                                className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20 whitespace-normal"
                              >
                                {item.itemName}
                              </button>
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
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <CompactImageGallery
                          images={item.photo ? [{ imageUrl: item.photo.imageUrl, imageKey: item.photo.imageKey }] : []}
                          maxDisplay={1}
                          size="md"
                        />
                      </div>
                    </div>
                    {/* Urgent and Status badges on new line */}
                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                      <div className="flex items-center gap-2">
                        {item.isUrgent && (
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                        {(item.status === 'approved' || item.status === 'cc_approved') && (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs flex-shrink-0">
                            ✓ Approved
                          </Badge>
                        )}
                        {(item.status === 'rejected' || item.status === 'cc_rejected') && (
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            ✗ Rejected
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === 'draft' && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800 text-xs flex-shrink-0">
                            Draft
                          </Badge>
                        )}
                        {item.status !== 'draft' && !['approved', 'rejected', 'cc_approved', 'cc_rejected'].includes(item.status) && getStatusBadge(item.status)}
                      </div>
                    </div>
                  </div>
                );
                })
              ) : (
                <div className="p-3 rounded-lg border bg-card/50 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[24px] flex items-center justify-center flex-shrink-0">
                        {items[0].itemOrder ?? items.length}
                      </Badge>
                      <div className="space-y-1 text-sm flex-1 min-w-0">
                      <div className="break-words">
                        <span className="font-medium text-muted-foreground">Item:</span>{" "}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemName(items[0].itemName);
                          }}
                          className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20 whitespace-normal"
                        >
                          {items[0].itemName}
                        </button>
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <CompactImageGallery
                        images={items[0].photo ? [{ imageUrl: items[0].photo.imageUrl, imageKey: items[0].photo.imageKey }] : []}
                        maxDisplay={1}
                        size="md"
                      />
                    </div>
                  </div>
                  {/* Urgent and Status badges on new line */}
                  <div className="flex items-center justify-between pt-2 border-t mt-2">
                    <div className="flex items-center gap-2">
                      {items[0].isUrgent && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {items[0].status === 'draft' && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800 text-xs flex-shrink-0">
                          Draft
                        </Badge>
                      )}
                      {items[0].status !== 'draft' && getStatusBadge(items[0].status)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <div className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">Required:</span> {format(new Date(firstItem.requiredBy), "dd/MM/yyyy")}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Created:</span> {format(new Date(firstItem.createdAt), "dd/MM/yyyy hh:mm a")}
                </div>
              </div>
              <div className="flex gap-0.5 flex-nowrap overflow-x-auto justify-end">
                {firstItem.status === "draft" && (
                  <div className="flex gap-0.5 flex-nowrap">
                    {onEditDraft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditDraft(requestNumber)}
                        className="h-6 sm:h-7 px-1.5 sm:px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                        title="Edit draft"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {onSendDraft && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onSendDraft(requestNumber)}
                        className="h-6 sm:h-7 px-1.5 sm:px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                        title="Send draft"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    {onDeleteDraft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteDraft(requestNumber)}
                        className="h-6 sm:h-7 px-1.5 sm:px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                        title="Delete draft"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(firstItem._id)}
                    className="h-6 sm:h-7 px-1.5 sm:px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 transition-colors duration-200"
                  >
                    <Eye className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
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
                    <TableHead className="text-xs sm:text-sm">Site Location</TableHead>
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
                const urgentCount = items.filter((item) => item.isUrgent).length;
                const totalItems = items.length;

                // Check if all items in the group have the same status
                const allItemsHaveSameStatus = items.length > 0
                  ? items.every((item) => item.status === items[0].status)
                  : true;
                
                return (
                  <Fragment key={requestNumber}>
                    {/* Group Header Row */}
                    <TableRow
                      className={cn(
                        "transition-all duration-300 hover:bg-muted/30",
                        isNewlySent && "border-l-2 border-l-primary",
                        hasMultipleItems && "border-b border-primary/10"
                      )}
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
                      <TableCell className="max-w-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {firstItem.site ? (
                              <button
                                onClick={() => setSelectedSiteId(firstItem.site!._id)}
                                className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer text-left truncate"
                              >
                                {firstItem.site.name}
                              </button>
                            ) : (
                              "—"
                            )}
                            {firstItem.site?.address && (
                              <button
                                onClick={() => handleOpenInMap(firstItem.site?.address || '')}
                                className="text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-2 transition-colors shrink-0 border border-primary/20 hover:border-primary/40"
                                title="Open in Maps"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="space-y-0.5">
                          <div><span className="font-medium text-muted-foreground">Required:</span> {format(new Date(firstItem.requiredBy), "dd/MM/yyyy")}</div>
                          <div className="text-xs text-muted-foreground"><span className="font-medium">Created:</span> {format(new Date(firstItem.createdAt), "dd/MM/yyyy hh:mm a")}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div
                          className={cn("space-y-2", hasMultipleItems && "cursor-pointer")}
                          onClick={() => hasMultipleItems && toggleGroup(requestNumber)}
                        >
                          {isExpanded ? (
                            <div className="space-y-2">
                              {items.map((item, idx) => {
                                const displayNumber = item.itemOrder ?? (items.length - idx);
                                return (
                                <div key={item._id} className="p-2 rounded-md border bg-card">
                                  <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start gap-2">
                                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[20px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {item.itemOrder ?? (items.length - idx)}
                                      </Badge>
                                      <div className="flex-1 min-w-0 space-y-1">
                                        <div className="break-words">
                                          <span className="font-medium text-muted-foreground">Item:</span>{" "}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedItemName(item.itemName);
                                            }}
                                            className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20 whitespace-normal"
                                          >
                                            {item.itemName}
                                          </button>
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
                                      <div className="flex-shrink-0">
                                        <CompactImageGallery
                                          images={item.photo ? [{ imageUrl: item.photo.imageUrl, imageKey: item.photo.imageKey }] : []}
                                          maxDisplay={1}
                                          size="sm"
                                        />
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
                                        {items[0].itemOrder ?? items.length}
                                      </Badge>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="text-sm break-words">
                                    <span className="font-medium text-muted-foreground">Item:</span>{" "}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItemName(items[0].itemName);
                                      }}
                                      className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20 whitespace-normal"
                                    >
                                      {items[0].itemName}
                                    </button>
                                  </div>
                                  {items[0].description && (
                                    <div className="text-xs text-muted-foreground break-words whitespace-normal">
                                      <span className="font-medium">Dis:</span> {items[0].description}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span><span className="font-medium">Quantity:</span> {items[0].quantity} {items[0].unit}</span>
                                    <div className="flex-shrink-0">
                                      {getStatusBadge(items[0].status)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  <CompactImageGallery
                                    images={items[0].photo ? [{ imageUrl: items[0].photo.imageUrl, imageKey: items[0].photo.imageKey }] : []}
                                    maxDisplay={1}
                                    size="sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{allItemsHaveSameStatus ? getStatusBadge(firstItem.status) : null}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-2 flex-wrap">
                          {urgentCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1 text-xs"
                            >
                              <AlertCircle className="h-3 w-3" />
                              {urgentCount}/{totalItems} urgent{urgentCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {showCreator && (
                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                          {firstItem.creator ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserId(firstItem.creator!._id);
                              }}
                              className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20"
                            >
                              {firstItem.creator.fullName}
                            </button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                      {onViewDetails && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2 flex-nowrap overflow-x-auto">
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
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950"
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
                              variant={showCreator && firstItem.status === "pending" ? "default" : "outline"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(firstItem._id);
                              }}
                              className={getStatusButtonStyles(firstItem.status)}
                            >
                              <Eye className="h-4 w-4 mr-2 text-current" />
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

      {/* User Info Dialog */}
      <UserInfoDialog
        open={!!selectedUserId}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
        userId={selectedUserId}
      />

      {/* Item Info Dialog */}
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


