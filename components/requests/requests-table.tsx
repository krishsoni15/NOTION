"use client";

/**
 * Requests Table Component
 * 
 * Displays material requests in a table with status badges, urgent tags, and filtering.
 */

import { useState, Fragment, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { Eye, AlertCircle, FileText, Edit, Trash2, Send, ChevronDown, ChevronRight, MapPin, Package, PackageX, Sparkles, NotebookPen, LayoutGrid, Table as TableIcon, ShoppingCart, Truck, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { LazyImage } from "@/components/ui/lazy-image";
import { cn, normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import { UserInfoDialog } from "./user-info-dialog";
import { ItemInfoDialog } from "./item-info-dialog";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";
import { NotesTimelineDialog } from "./notes-timeline-dialog";
import { PDFPreviewDialog } from "@/components/purchase/pdf-preview-dialog";
import type { Id } from "@/convex/_generated/dataModel";

type RequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "recheck"
  | "ready_for_cc"
  | "cc_rejected"
  | "cc_pending"
  | "cc_approved"
  | "ready_for_po"
  | "pending_po"
  | "rejected_po"
  | "ready_for_delivery"
  | "delivery_processing"
  | "delivered"
  | "partially_processed"
  | "direct_po"
  | "sign_pending"
  | "sign_rejected";

// Helper to get card border/bg styles based on status
const getCardStyles = (status: RequestStatus) => {
  const baseClasses = "border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200";

  switch (status) {
    case "draft":
      return `${baseClasses} bg-slate-50/50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800`;
    case "pending":
      return `${baseClasses} bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800`;
    case "approved":
    case "recheck":
    case "ready_for_cc":
    case "cc_pending":
    case "cc_approved":
    case "ready_for_po":
    case "pending_po":
    case "ready_for_delivery":
    case "sign_pending":
    case "partially_processed":
      return `${baseClasses} bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800`;
    case "delivery_processing":
      return `${baseClasses} bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800`;
    case "delivered":
      return `${baseClasses} bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800`;
    case "rejected":
    case "cc_rejected":
    case "rejected_po":
    case "sign_rejected":
      return `${baseClasses} bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800`;
    default:
      return `${baseClasses} bg-card border-border`;
  }
};

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
    case "delivery_processing":
      return `${baseClasses} border-orange-300 text-orange-800 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 hover:border-orange-400 dark:border-orange-600 dark:text-orange-300 dark:from-orange-900 dark:to-orange-800 dark:hover:from-orange-800 dark:hover:to-orange-700`;
    case "rejected":
      return `${baseClasses} border-rose-300 text-rose-800 bg-gradient-to-r from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 hover:border-rose-400 dark:border-rose-600 dark:text-rose-300 dark:from-rose-900 dark:to-rose-800 dark:hover:from-rose-800 dark:hover:to-rose-700`;
    case "delivered":
      return `${baseClasses} border-blue-300 text-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 dark:border-blue-600 dark:text-blue-300 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700`;
    case "partially_processed":
      return `${baseClasses} border-purple-300 text-purple-800 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 hover:border-purple-400 dark:border-purple-600 dark:text-purple-300 dark:from-purple-900 dark:to-purple-800 dark:hover:from-purple-800 dark:hover:to-purple-700`;
    case "sign_pending":
      return `${baseClasses} border-orange-300 text-orange-800 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 hover:border-orange-400 dark:border-orange-600 dark:text-orange-300 dark:from-orange-900 dark:to-orange-800 dark:hover:from-orange-800 dark:hover:to-orange-700`;
    case "sign_rejected":
      return `${baseClasses} border-rose-300 text-rose-800 bg-gradient-to-r from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 hover:border-rose-400 dark:border-rose-600 dark:text-rose-300 dark:from-rose-900 dark:to-rose-800 dark:hover:from-rose-800 dark:hover:to-rose-700`;
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
  photos?: Array<{
    imageUrl: string;
    imageKey: string;
  }>;
  itemOrder?: number; // Order of item within the request (1, 2, 3...)
  status: RequestStatus;
  approvedBy?: Id<"users">;
  approvedAt?: number;
  rejectionReason?: string;
  deliveryMarkedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  directAction?: "po" | "delivery"; // Flag for direct action
  site?: {
    _id: Id<"sites">;
    name: string;
    code?: string;
    address?: string;
  } | null;
  creator?: {
    _id: Id<"users">;
    fullName: string;
    role: string;
  } | null;
  approver?: {
    _id: Id<"users">;
    fullName: string;
  } | null;
  notesCount?: number;
}

interface RequestsTableProps {
  requests: Request[] | undefined;
  onViewDetails?: (requestId: Id<"requests">) => void;
  onOpenCC?: (requestId: Id<"requests">, requestIds?: Id<"requests">[]) => void; // Open cost comparison dialog
  onDirectPO?: (requestId: Id<"requests">) => void; // Handle Direct PO action
  onDirectDelivery?: (requestId: Id<"requests">) => void; // Handle Direct Delivery action
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
  onDirectPO,
  onDirectDelivery,
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

  const [selectedRequestNumberForNotes, setSelectedRequestNumberForNotes] = useState<string | null>(null);
  const [pdfPreviewPoNumber, setPdfPreviewPoNumber] = useState<string | null>(null);

  // Collect all unique item names from requests
  const uniqueItemNames = useMemo(() => {
    if (!requests) return [];
    const names = new Set<string>();
    requests.forEach((req) => names.add(req.itemName));
    return Array.from(names);
  }, [requests]);

  // Query inventory status for all items
  const inventoryStatus = useQuery(
    api.inventory.getInventoryStatusForItems,
    uniqueItemNames.length > 0 ? { itemNames: uniqueItemNames } : "skip"
  );

  // Helper function to get inventory status badge for an item
  const getInventoryStatusBadge = (itemName: string, requestedQuantity: number, unit: string) => {
    if (!inventoryStatus) return null;

    const status = inventoryStatus[itemName];
    const encodedItemName = encodeURIComponent(itemName);

    // Handler for New Item - Redirect to Inventory
    const handleNewItemClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      window.location.href = `/dashboard/inventory?search=${encodedItemName}`;
    };

    // Handler for Existing Item - Open Info Dialog
    const handleExistingItemClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedItemName(itemName);
    };

    if (!status) return null;

    if (status.status === "new_item") {
      return (
        <Badge
          variant="outline"
          className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 text-[10px] px-2 py-0.5 h-6 gap-1.5 hover:bg-indigo-100 cursor-pointer transition-colors shadow-sm"
          onClick={handleNewItemClick}
          title="This item is not in inventory. Click to add it."
        >
          <Sparkles className="h-3 w-3" />
          New Item
        </Badge>
      );
    }

    if (status.status === "out_of_stock") {
      return (
        <Badge
          variant="destructive"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900 text-[10px] px-2 py-0.5 h-6 gap-1.5 hover:bg-red-100 cursor-pointer transition-colors shadow-sm"
          onClick={handleExistingItemClick}
        >
          <PackageX className="h-3 w-3" />
          Out of Stock
        </Badge>
      );
    }

    // In stock - show remaining quantity
    const stockAvailable = status.centralStock;
    const remaining = stockAvailable - requestedQuantity;
    const stockUnit = status.unit || unit;

    // Determine color based on how much stock remains
    const isInsufficient = remaining < 0;
    const isLowStock = !isInsufficient && (remaining < stockAvailable * 0.2);

    if (isInsufficient) {
      // Requested more than available
      return (
        <Badge
          variant="outline"
          className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-[10px] px-2 py-0.5 h-6 gap-1.5 hover:bg-orange-100 cursor-pointer transition-colors shadow-sm"
          onClick={handleExistingItemClick}
          title={`Insufficient stock. Available: ${stockAvailable}, Requested: ${requestedQuantity}`}
        >
          <AlertCircle className="h-3 w-3" />
          Low Stock: {stockAvailable}/{requestedQuantity}
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-2 py-0.5 h-6 gap-1.5 cursor-pointer hover:opacity-80 transition-all shadow-sm",
          isLowStock
            ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
        )}
        onClick={handleExistingItemClick}
        title={`Stock Available: ${stockAvailable}`}
      >
        <Package className="h-3 w-3" />
        {stockAvailable} {stockUnit} Available
      </Badge>
    );
  };

  // Helper function to collect photos from both photo and photos fields
  const getItemPhotos = (item: Request) => {
    const photos: Array<{ imageUrl: string; imageKey: string }> = [];

    // Check for new photos array first
    if (item.photos && item.photos.length > 0) {
      item.photos.forEach((photo) => {
        photos.push({
          imageUrl: photo.imageUrl,
          imageKey: photo.imageKey,
        });
      });
    }
    // Fallback to legacy photo field
    else if (item.photo) {
      photos.push({
        imageUrl: item.photo.imageUrl,
        imageKey: item.photo.imageKey,
      });
    }

    return photos;
  };

  const handleOpenInMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

  // Get all photos from all items in a request group
  const getRequestPhotos = (items: Request[]) => {
    const photos: Array<{ imageUrl: string; imageKey: string }> = [];

    items.forEach((item) => {
      // Check for new photos array first
      if (item.photos && item.photos.length > 0) {
        item.photos.forEach((photo) => {
          photos.push({
            imageUrl: photo.imageUrl,
            imageKey: photo.imageKey,
          });
        });
      }
      // Fallback to legacy photo field
      else if (item.photo) {
        photos.push({
          imageUrl: item.photo.imageUrl,
          imageKey: item.photo.imageKey,
        });
      }
    });

    return photos;
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

  // Get status badge variant with simplified categories and icons
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800 gap-1.5 pl-1.5 pr-2.5">
            <FileText className="h-3.5 w-3.5" />
            Draft
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 gap-1.5 pl-1.5 pr-2.5">
            <Clock className="h-3.5 w-3.5" />
            Pending
          </Badge>
        );
      case "approved":
      case "recheck":
      case "ready_for_cc":
      case "cc_pending":
      case "cc_approved":
      case "ready_for_po":
      case "pending_po":
      case "ready_for_delivery":
      case "sign_pending":
      case "partially_processed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800 gap-1.5 pl-1.5 pr-2.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin-slow" />
            Processing
          </Badge>
        );
      case "delivery_processing":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800 gap-1.5 pl-1.5 pr-2.5">
            <Truck className="h-3.5 w-3.5" />
            Out for Delivery
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 gap-1.5 pl-1.5 pr-2.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Delivered
          </Badge>
        );
      case "rejected":
      case "cc_rejected":
      case "rejected_po":
      case "sign_rejected":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800 gap-1.5 pl-1.5 pr-2.5">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "text-slate-600 dark:text-slate-400";
      case "pending":
        return "text-amber-600 dark:text-amber-400";
      case "approved":
      case "recheck":
      case "ready_for_cc":
      case "cc_pending":
      case "cc_approved":
      case "ready_for_po":
      case "pending_po":
      case "ready_for_delivery":
      case "sign_pending":
      case "partially_processed":
        return "text-blue-600 dark:text-blue-400";
      case "delivery_processing":
        return "text-orange-600 dark:text-orange-400";
      case "delivered":
        return "text-emerald-600 dark:text-emerald-400";
      case "rejected":
      case "cc_rejected":
      case "rejected_po":
      case "sign_rejected":
        return "text-rose-600 dark:text-rose-400";
      default:
        return "text-muted-foreground";
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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupedRequestsArray.map((group) => {
          const { requestNumber, items, firstItem } = group;
          const isExpanded = expandedGroups.has(requestNumber);
          const isNewlySent = newlySentRequestNumbers.has(requestNumber);
          const hasMultipleItems = items.length > 1;
          const urgentCount = items.filter((item) => item.isUrgent).length;

          // Count items with cc_pending status for group CC button
          const ccPendingItems = items.filter((item) => item.status === 'cc_pending');
          const ccPendingCount = ccPendingItems.length;

          // Count items requiring review for the Review button
          const reviewableItemsCount = items.filter((item) =>
            ["pending", "sign_pending", "ready_for_cc"].includes(item.status)
          ).length;

          const allItemsHaveSameStatus = items.length > 0
            ? items.every((item) => item.status === items[0].status)
            : true;

          const getOverallStatus = () => {
            if (allItemsHaveSameStatus) return items[0].status;
            const processedStatuses = items.filter(item => !["pending", "draft"].includes(item.status));
            if (processedStatuses.length > 0 && processedStatuses.length < items.length) return "partially_processed";
            return null;
          };

          const overallStatus = getOverallStatus();

          // Helper to render a single item row
          const renderItemRow = (item: Request, isFirst: boolean = false) => (
            <div className="flex gap-3 relative">
              <div className="shrink-0 pt-1">
                <CompactImageGallery images={getItemPhotos(item)} maxDisplay={1} size="sm" />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Item Name</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedItemName(item.itemName); }}
                      className="font-bold text-base text-foreground hover:text-primary hover:underline leading-tight text-left block w-full truncate"
                    >
                      {item.itemName}
                    </button>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Quantity</span>
                    <Badge variant="secondary" className="text-sm font-bold px-2 py-0.5 bg-slate-100 text-slate-900 border-slate-200">
                      {item.quantity} <span className="text-xs font-normal ml-1 text-slate-500">{item.unit}</span>
                    </Badge>
                  </div>
                </div>

                {item.description && (
                  <div className="relative group/desc">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Specs/Desc</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed group-hover/desc:line-clamp-none transition-all duration-200 bg-muted/20 p-1.5 rounded-md border border-transparent group-hover/desc:border-border group-hover/desc:bg-card group-hover/desc:shadow-sm">
                      {item.description}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {getInventoryStatusBadge(item.itemName, item.quantity, item.unit)}
                  {!allItemsHaveSameStatus && getStatusBadge(item.status)}
                  {isFirst && urgentCount > 0 && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1 animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                      Urgent
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );

          return (
            <div
              key={requestNumber}
              className={cn(
                getCardStyles(overallStatus || firstItem.status),
                isNewlySent && "ring-2 ring-primary ring-offset-2"
              )}
            >
              {/* Card Header with Labels */}
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Request ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-primary tracking-tight">#{requestNumber}</span>
                    <div className="scale-90 origin-left">
                      {(allItemsHaveSameStatus || overallStatus === "partially_processed") && (
                        getStatusBadge(overallStatus || firstItem.status)
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Required By</div>
                    <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-foreground">
                      <span className={cn(
                        new Date(firstItem.requiredBy) < new Date() ? "text-red-600" : ""
                      )}>
                        {format(new Date(firstItem.requiredBy), "dd MMM, yyyy")}
                      </span>
                    </div>
                  </div>

                  {firstItem.site && (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Site Location</div>
                      <div className="flex items-center justify-end gap-1.5 text-xs font-medium" title={firstItem.site.name}>
                        <MapPin className="h-3.5 w-3.5 text-primary/70" />
                        <span className="max-w-[120px] truncate">{firstItem.site.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List - Always show first item */}
              <div className="space-y-4 mb-4">
                {/* First Item */}
                <div className="p-3.5 rounded-xl border bg-card/60 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/20"></div>
                  {renderItemRow(items[0], true)}
                </div>

                {/* Additional Items Area */}
                {hasMultipleItems && (
                  <div className="space-y-3">
                    {!isExpanded ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleGroup(requestNumber); }}
                        className="w-full py-2 px-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2 text-primary font-medium text-sm transition-colors group"
                      >
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-xs font-bold">
                          +{items.length - 1}
                        </span>
                        <span>More Items in this Request...</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                      </button>
                    ) : (
                      <div className="pl-3 space-y-3 border-l-2 border-dashed border-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {items.slice(1).map((item, idx) => (
                          <div key={item._id} className="p-3 rounded-lg border bg-muted/20 relative">
                            <div className="absolute top-2 right-2 text-[10px] text-muted-foreground font-mono">#{idx + 2}</div>
                            {renderItemRow(item)}
                          </div>
                        ))}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleGroup(requestNumber); }}
                          className="w-full py-1 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                        >
                          Show Less <ChevronDown className="h-3 w-3 rotate-180" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between p-3 -mx-4 -mb-4 mt-4 bg-slate-50/80 dark:bg-slate-900/40 border-t border-border/50 rounded-b-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 pl-1">
                  <Clock className="h-3 w-3 text-muted-foreground/70" />
                  <span className="text-[10px] font-medium text-muted-foreground">Created: {format(new Date(firstItem.createdAt), "dd MMM, yyyy")}</span>
                </div>

                <div className="flex items-center gap-1.5 pr-1">
                  {/* Notes Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setSelectedRequestNumberForNotes(firstItem.requestNumber); }}
                    className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-slate-800 relative shadow-sm border border-transparent hover:border-border transition-all"
                    title="View Notes"
                  >
                    <NotebookPen className="h-4 w-4" />
                    {items[0].notesCount && items[0].notesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-950" />
                    )}
                  </Button>

                  {/* Draft Actions */}
                  {(firstItem.status === "draft" || firstItem.status === "rejected" || firstItem.status === "sign_rejected") && (
                    <>
                      {onEditDraft && (
                        <Button variant="ghost" size="sm" onClick={() => onEditDraft(requestNumber)} className="h-8 w-8 p-0 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeleteDraft && (
                        <Button variant="ghost" size="sm" onClick={() => onDeleteDraft(requestNumber)} className="h-8 w-8 p-0 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {onSendDraft && (
                        <Button variant="default" size="sm" onClick={() => onSendDraft(requestNumber)} className="h-8 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200 dark:shadow-none ml-1">
                          <Send className="h-3 w-3 mr-1.5" /> Send Request
                        </Button>
                      )}
                    </>
                  )}

                  {/* Main Action Button */}
                  {onViewDetails && !["draft", "rejected", "sign_rejected"].includes(firstItem.status) && (
                    <Button
                      variant={showCreator && reviewableItemsCount > 0 ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onViewDetails(firstItem._id); }}
                      className={cn(
                        "h-8 px-4 text-xs font-semibold ml-1 shadow-sm transition-all",
                        showCreator && reviewableItemsCount > 0
                          ? "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200 dark:shadow-none"
                          : "bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 hover:border-slate-300 dark:border-slate-700"
                      )}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      {showCreator && reviewableItemsCount > 0 ? "Review Request" : "View Details"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  // Table View
  return (
    <>
      {viewMode === "card" ? (
        <CardView />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[100px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Request #</TableHead>
                  <TableHead className="min-w-[140px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Location</TableHead>
                  <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Dates</TableHead>
                  <TableHead className="min-w-[250px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Item Details</TableHead>
                  <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right w-[100px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRequestsArray.map((group) => {
                  const { requestNumber, items, firstItem } = group;
                  const isExpanded = expandedGroups.has(requestNumber);
                  const hasMultipleItems = items.length > 1;
                  const isNewlySent = newlySentRequestNumbers.has(requestNumber);

                  // Helper for overall status
                  const allItemsHaveSameStatus = items.every(i => i.status === items[0].status);
                  const overallStatus = allItemsHaveSameStatus ? items[0].status : (
                    items.some(i => !["pending", "draft"].includes(i.status)) ? "partially_processed" : null
                  );

                  return (
                    <Fragment key={requestNumber}>
                      <TableRow
                        className={cn(
                          "hover:bg-muted/30 transition-colors cursor-pointer",
                          isNewlySent && "bg-primary/5",
                          hasMultipleItems && isExpanded && "border-b-0 bg-muted/10"
                        )}
                        onClick={() => hasMultipleItems ? toggleGroup(requestNumber) : null}
                      >
                        {/* Expand/Collapse Header */}
                        <TableCell className="text-center p-2">
                          {hasMultipleItems && (
                            <div className="flex justify-center items-center h-6 w-6 rounded-full hover:bg-muted transition-colors">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          )}
                        </TableCell>

                        {/* Request # */}
                        <TableCell className="font-mono text-sm font-medium">
                          #{requestNumber}
                          {hasMultipleItems && <div className="text-[10px] text-muted-foreground mt-0.5">{items.length} Items</div>}
                        </TableCell>

                        {/* Location */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 max-w-[180px]">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate text-sm" title={firstItem.site?.name}>{firstItem.site?.name || "—"}</span>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Required</span>
                              <span className={cn("font-medium", new Date(firstItem.requiredBy) < new Date() ? "text-red-600" : "text-foreground")}>
                                {format(new Date(firstItem.requiredBy), "dd MMM")}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Created</span>
                              <span className="text-muted-foreground text-xs">{format(new Date(firstItem.createdAt), "dd/MM")}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Items Preview */}
                        <TableCell>
                          {isExpanded ? (
                            <span className="text-xs font-medium text-muted-foreground italic flex items-center gap-1">
                              <ChevronDown className="h-3 w-3" /> Viewing details below...
                            </span>
                          ) : (
                            <div className="flex items-start gap-3 py-1">
                              <div className="shrink-0 pt-0.5">
                                <CompactImageGallery images={getItemPhotos(firstItem)} maxDisplay={1} size="sm" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="font-semibold text-sm truncate text-foreground leading-tight" title={firstItem.itemName}>{firstItem.itemName}</div>
                                {firstItem.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">{firstItem.description}</p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    {firstItem.quantity} {firstItem.unit}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {getStatusBadge(overallStatus || firstItem.status)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            {onViewDetails && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onViewDetails(firstItem._id); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}

                            {(firstItem.status === "draft" || firstItem.status === "rejected") && onEditDraft && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={(e) => { e.stopPropagation(); onEditDraft(requestNumber); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details Row */}
                      {hasMultipleItems && isExpanded && (
                        <TableRow className="bg-muted/5 hover:bg-muted/5 border-t-0">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-3 pl-12 grid gap-2">
                              {items.map((item, idx) => (
                                <div key={item._id} className="flex items-center gap-4 p-2 rounded-lg border bg-card text-sm">
                                  <div className="w-6 text-center text-xs text-muted-foreground">#{idx + 1}</div>
                                  <div className="shrink-0"><CompactImageGallery images={getItemPhotos(item)} maxDisplay={1} size="sm" /></div>
                                  <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                                    <div>
                                      <div className="font-medium truncate" title={item.itemName}>{item.itemName}</div>
                                      {item.description && <div className="text-xs text-muted-foreground truncate max-w-[300px]">{item.description}</div>}
                                    </div>
                                    <div className="text-sm text-nowrap">{item.quantity} {item.unit}</div>

                                    <div className="flex items-center gap-2">
                                      {getInventoryStatusBadge(item.itemName, item.quantity, item.unit)}
                                      {!allItemsHaveSameStatus && getStatusBadge(item.status)}
                                      {onViewDetails && (
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onViewDetails(item._id); }}>View</Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
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

      <LocationInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        locationId={selectedSiteId}
      />

      {/* Notes Timeline Dialog */}
      {
        selectedRequestNumberForNotes && (
          <NotesTimelineDialog
            requestNumber={selectedRequestNumberForNotes}
            open={!!selectedRequestNumberForNotes}
            onOpenChange={(open) => {
              if (!open) setSelectedRequestNumberForNotes(null);
            }}
          />
        )
      }
      <PDFPreviewDialog
        open={!!pdfPreviewPoNumber}
        onOpenChange={(open) => !open && setPdfPreviewPoNumber(null)}
        poNumber={pdfPreviewPoNumber}
      />
    </>
  );
}


