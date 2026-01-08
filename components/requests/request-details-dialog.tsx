"use client";

/**
 * Request Details Dialog Component
 * 
 * Shows full request details with photo display.
 * Managers can approve/reject requests.
 * Site Engineers can mark delivery.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, XCircle, Package, ShoppingCart, MapPin, PackageX, Sparkles, FileText, PieChart } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { ROLES } from "@/lib/auth/roles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserInfoDialog } from "./user-info-dialog";
import { ItemInfoDialog } from "./item-info-dialog";
import { SiteInfoDialog } from "./site-info-dialog";
import { NotesTimelineDialog } from "./notes-timeline-dialog";
import type { Id } from "@/convex/_generated/dataModel";

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: Id<"requests"> | null;
  onCheck?: (requestId: Id<"requests">) => void;
}

export function RequestDetailsDialog({
  open,
  onOpenChange,
  requestId,
  onCheck,
}: RequestDetailsDialogProps) {
  const userRole = useUserRole();
  const request = useQuery(
    api.requests.getRequestById,
    requestId ? { requestId } : "skip"
  );
  // Get all requests with the same requestNumber to show all items
  const allRequests = useQuery(
    api.requests.getRequestsByRequestNumber,
    request?.requestNumber ? { requestNumber: request.requestNumber } : "skip"
  );
  const updateStatus = useMutation(api.requests.updateRequestStatus);
  const bulkUpdateStatus = useMutation(api.requests.bulkUpdateRequestStatus);
  const markDelivery = useMutation(api.requests.markDelivery);
  const upsertCC = useMutation(api.costComparisons.upsertCostComparison);
  const approveSplit = useMutation(api.costComparisons.approveSplitFulfillment);
  // Fetch latest note for this request
  const notes = useQuery(api.notes.getNotes, request?.requestNumber ? { requestNumber: request.requestNumber } : "skip");
  const latestNote = notes && notes.length > 0 ? notes[0] : null;

  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [itemRejectionReasons, setItemRejectionReasons] = useState<Record<string, string>>({});
  const [showItemRejectionInput, setShowItemRejectionInput] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);
  const [selectedItemsForAction, setSelectedItemsForAction] = useState<Set<Id<"requests">>>(new Set());
  const [itemActions, setItemActions] = useState<Record<Id<"requests">, "approve" | "reject" | "direct_po" | null>>({});
  const [showBatchProcessDialog, setShowBatchProcessDialog] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDirectPOConfirm, setShowDirectPOConfirm] = useState(false);
  const [showItemApproveConfirm, setShowItemApproveConfirm] = useState<Id<"requests"> | null>(null);
  const [showItemDirectPOConfirm, setShowItemDirectPOConfirm] = useState<Id<"requests"> | null>(null);
  const [showDirectDeliveryConfirm, setShowDirectDeliveryConfirm] = useState(false);
  const [showItemDirectDeliveryConfirm, setShowItemDirectDeliveryConfirm] = useState<Id<"requests"> | null>(null);
  const [showSplitConfirm, setShowSplitConfirm] = useState<Id<"requests"> | null>(null);
  const [showBulkSplitConfirm, setShowBulkSplitConfirm] = useState(false);
  const [showNotesTimeline, setShowNotesTimeline] = useState(false);
  const hasRefreshedRef = useRef(false);

  // Helper function to collect photos from both photo and photos fields
  const getItemPhotos = (item: any) => {
    const photos: Array<{ imageUrl: string; imageKey: string }> = [];

    // Check for new photos array first
    if (item.photos && item.photos.length > 0) {
      item.photos.forEach((photo: { imageUrl: string; imageKey: string }) => {
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

  // Collect all unique item names from requests
  const uniqueItemNames = useMemo(() => {
    if (!allRequests) return [];
    const names = new Set<string>();
    allRequests.forEach((item) => names.add(item.itemName));
    return Array.from(names);
  }, [allRequests]);

  // Query inventory status for all items
  const inventoryStatus = useQuery(
    api.inventory.getInventoryStatusForItems,
    uniqueItemNames.length > 0 ? { itemNames: uniqueItemNames } : "skip"
  );

  // Helper function to get inventory status badge for an item
  const getInventoryStatusBadge = (itemName: string, requestedQuantity: number, unit: string) => {
    if (!inventoryStatus) return null;

    const status = inventoryStatus[itemName];
    if (!status) return null;

    if (status.status === "new_item") {
      const encodedItemName = encodeURIComponent(itemName);

      // Logic to redirect/navigate to inventory page
      const handleInventoryClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        window.location.href = `/dashboard/inventory?search=${encodedItemName}`;
      };

      return (
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 text-[10px] px-1.5 py-0.5 h-5 gap-1 cursor-default"
          >
            <Sparkles className="h-3 w-3" />
            New Item
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            onClick={handleInventoryClick}
            title="Go to Inventory to Add Item"
          >
            <Package className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }

    const encodedItemName = encodeURIComponent(itemName);

    // Logic to redirect/navigate to inventory page
    const handleInventoryClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent row click
      window.location.href = `/dashboard/inventory?search=${encodedItemName}`;
    };

    if (status.status === "out_of_stock") {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 text-[10px] px-1.5 py-0.5 h-5 gap-1 cursor-default"
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
    const isLowStock = remaining < 0 || (stockAvailable > 0 && remaining < stockAvailable * 0.2);
    const isSufficientStock = remaining >= 0;

    if (!isSufficientStock) {
      // Requested more than available
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-[10px] px-1.5 py-0.5 h-5 gap-1 cursor-pointer hover:bg-amber-100"
          onClick={handleInventoryClick}
          title="Click to check details in Inventory"
        >
          <Package className="h-3 w-3" />
          {stockAvailable}/{requestedQuantity} {stockUnit}
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-1.5 py-0.5 h-5 gap-1 cursor-pointer hover:opacity-80 transition-opacity",
          isLowStock
            ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
            : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
        )}
        onClick={handleInventoryClick}
        title="Click to check details in Inventory"
      >
        <Package className="h-3 w-3" />
        {stockAvailable} {stockUnit}
      </Badge>
    );
  };

  const isManager = userRole === ROLES.MANAGER;
  const isSiteEngineer = userRole === ROLES.SITE_ENGINEER;
  const canMarkDelivery =
    isSiteEngineer && request?.status === "delivery_stage" && request?.createdBy;

  // Simplified mobile-first layout for site engineers
  const isMobileLayout = isSiteEngineer;

  // Get pending items for manager actions
  const pendingItems = allRequests?.filter((item) => item.status === "pending") || [];
  const hasMultiplePendingItems = pendingItems.length > 1;

  // Manager permissions based on pending items
  const canApprove = isManager && pendingItems.length > 0;
  const canReject = isManager && pendingItems.length > 0;

  // Check if all items in the request have the same status
  const allItemsHaveSameStatus = allRequests && allRequests.length > 0
    ? allRequests.every((item) => item.status === allRequests[0].status)
    : true;

  // Determine overall request status
  const getOverallStatus = () => {
    if (allItemsHaveSameStatus) {
      return allRequests?.[0]?.status || request?.status;
    }

    // Check if we have mixed processed statuses (not pending/draft)
    const processedStatuses = allRequests?.filter(item =>
      !["pending", "draft"].includes(item.status)
    ) || [];

    if (processedStatuses.length > 0 && processedStatuses.length < (allRequests?.length || 0)) {
      // Some items processed, some still pending - partially processed
      return "partially_processed";
    }

    // All items are pending/draft or truly mixed
    return request?.status;
  };

  const overallStatus = getOverallStatus();

  // Collect all photos from all request items (support both photo and photos fields)
  const allPhotos = allRequests?.reduce((photos, item) => {
    // Check for new photos array first
    if (item.photos && item.photos.length > 0) {
      item.photos.forEach((photo, index) => {
        photos.push({
          imageUrl: photo.imageUrl,
          imageKey: photo.imageKey,
          alt: `${item.itemName} - ${item.quantity} ${item.unit} (Photo ${index + 1})`
        });
      });
    }
    // Fallback to legacy photo field
    else if ((item as any).photo) {
      const legacyPhoto = (item as any).photo;
      photos.push({
        imageUrl: legacyPhoto.imageUrl,
        imageKey: legacyPhoto.imageKey,
        alt: `${item.itemName} - ${item.quantity} ${item.unit}`
      });
    }
    return photos;
  }, [] as Array<{ imageUrl: string; imageKey: string; alt: string }>) || [];

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setItemRejectionReasons({});
      setShowItemRejectionInput(null);
      setSelectedItemsForAction(new Set());
      setItemActions({});
      setShowBatchProcessDialog(false);
      setShowApproveConfirm(false);
      setShowDirectPOConfirm(false);
      setShowItemApproveConfirm(null);
      setShowItemDirectPOConfirm(null);
      setShowSplitConfirm(null);
      setRejectionReason("");
      setShowRejectionInput(false);
      hasRefreshedRef.current = false;
    }
  }, [open]);

  // Close dialog and refresh data after successful action
  const closeAndRefresh = () => {
    onOpenChange(false);
    // Data will refresh automatically through Convex queries
  };

  // Per-item handlers
  const handleItemApprove = async (itemId: Id<"requests">) => {
    setIsLoading(true);
    try {
      await updateStatus({
        requestId: itemId,
        status: "approved",
      });
      toast.success("Item approved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to approve item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemReject = async (itemId: Id<"requests">) => {
    const reason = itemRejectionReasons[itemId]?.trim();
    if (!reason) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsLoading(true);
    try {
      await updateStatus({
        requestId: itemId,
        status: "rejected",
        rejectionReason: reason,
      });
      toast.success("Item rejected");
      setItemRejectionReasons((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setShowItemRejectionInput(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to reject item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemDirectPO = async (itemId: Id<"requests">) => {
    setIsLoading(true);
    try {
      await updateStatus({
        requestId: itemId,
        status: "direct_po",
      });
      toast.success("Item sent directly to PO stage");
    } catch (error: any) {
      toast.error(error.message || "Failed to process Direct PO");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (itemId: Id<"requests">) => {
    const newSelected = new Set(selectedItemsForAction);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItemsForAction(newSelected);
  };

  const selectAllPending = () => {
    setSelectedItemsForAction(new Set(pendingItems.map(item => item._id)));
  };

  const deselectAll = () => {
    setSelectedItemsForAction(new Set());
  };

  // Batch processing helpers
  const setItemAction = (itemId: Id<"requests">, action: "approve" | "reject" | "direct_po" | null) => {
    setItemActions(prev => ({
      ...prev,
      [itemId]: action
    }));
  };

  const getItemAction = (itemId: Id<"requests">) => {
    return itemActions[itemId] || null;
  };

  const clearItemActions = () => {
    setItemActions({});
    setItemRejectionReasons({});
  };

  const getBatchSummary = () => {
    const actions = Object.values(itemActions).filter(action => action !== null);
    const summary = {
      approve: actions.filter(a => a === "approve").length,
      reject: actions.filter(a => a === "reject").length,
      direct_po: actions.filter(a => a === "direct_po").length,
    };
    return summary;
  };

  // Bulk handlers for all items
  const handleApproveAll = async () => {
    const itemsToApprove = selectedItemsForAction.size > 0
      ? Array.from(selectedItemsForAction)
      : pendingItems.map((item) => item._id);

    if (itemsToApprove.length === 0) {
      toast.error("No items selected to approve");
      return;
    }

    setIsLoading(true);
    try {
      await bulkUpdateStatus({
        requestIds: itemsToApprove,
        status: "approved",
      });
      toast.success(`${itemsToApprove.length} item(s) approved successfully`);
      setSelectedItemsForAction(new Set()); // Clear selection after action
      closeAndRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectPOAll = async () => {
    const itemsToDirectPO = selectedItemsForAction.size > 0
      ? Array.from(selectedItemsForAction)
      : pendingItems.map((item) => item._id);

    if (itemsToDirectPO.length === 0) {
      toast.error("No items selected to send to Direct PO");
      return;
    }

    setIsLoading(true);
    try {
      await bulkUpdateStatus({
        requestIds: itemsToDirectPO,
        status: "direct_po",
      });
      toast.success(`${itemsToDirectPO.length} item(s) sent directly to PO stage`);
      setSelectedItemsForAction(new Set()); // Clear selection after action
      closeAndRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to process Direct PO for items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAll = async () => {
    const itemsToReject = selectedItemsForAction.size > 0
      ? Array.from(selectedItemsForAction)
      : pendingItems.map((item) => item._id);

    if (itemsToReject.length === 0) {
      toast.error("No items selected to reject");
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsLoading(true);
    try {
      await bulkUpdateStatus({
        requestIds: itemsToReject,
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      toast.success(`${itemsToReject.length} item(s) rejected successfully`);
      setSelectedItemsForAction(new Set()); // Clear selection after action
      setShowRejectionInput(false);
      setRejectionReason("");
      closeAndRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject items");
    } finally {
      setIsLoading(false);
    }
  };

  // Mixed batch processing - handle different actions for different items
  const handleBatchProcessItems = async () => {
    const itemsToProcess = Object.entries(itemActions).filter(([_, action]) => action !== null);

    if (itemsToProcess.length === 0) {
      toast.error("No actions assigned to selected items");
      return;
    }

    // Check if any rejections need reasons
    const rejectionItems = itemsToProcess.filter(([_, action]) => action === "reject");
    const missingReasons = rejectionItems.filter(([itemId]) => !itemRejectionReasons[itemId]?.trim());

    if (missingReasons.length > 0) {
      toast.error("Please provide rejection reasons for all items being rejected");
      return;
    }

    setIsLoading(true);
    try {
      // Group items by action
      const approveItems = itemsToProcess.filter(([_, action]) => action === "approve").map(([id]) => id as Id<"requests">);
      const rejectItems = itemsToProcess.filter(([_, action]) => action === "reject").map(([id]) => id as Id<"requests">);
      const directPOItems = itemsToProcess.filter(([_, action]) => action === "direct_po").map(([id]) => id as Id<"requests">);

      // Execute actions
      const promises = [];

      if (approveItems.length > 0) {
        promises.push(
          bulkUpdateStatus({
            requestIds: approveItems,
            status: "approved",
          })
        );
      }

      if (rejectItems.length > 0) {
        promises.push(
          bulkUpdateStatus({
            requestIds: rejectItems,
            status: "rejected",
            rejectionReason: rejectItems.map(id => itemRejectionReasons[id]?.trim()).join("; "),
          })
        );
      }

      if (directPOItems.length > 0) {
        promises.push(
          bulkUpdateStatus({
            requestIds: directPOItems,
            status: "direct_po",
          })
        );
      }

      await Promise.all(promises);

      const totalProcessed = approveItems.length + rejectItems.length + directPOItems.length;
      toast.success(`${totalProcessed} item(s) processed successfully`);

      // Clear state
      setItemActions({});
      setItemRejectionReasons({});
      setSelectedItemsForAction(new Set());
      setShowBatchProcessDialog(false);
      closeAndRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to process items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!requestId) return;

    setIsLoading(true);
    try {
      await updateStatus({
        requestId,
        status: "approved",
      });
      toast.success("Request approved successfully");
      closeAndRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectPO = async () => {
    if (!requestId) return;

    setIsLoading(true);
    try {
      await updateStatus({
        requestId,
        status: "direct_po",
      });
      toast.success("Request sent directly to PO stage");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to process Direct PO");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requestId) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsLoading(true);
    try {
      await updateStatus({
        requestId,
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Request rejected");
      onOpenChange(false);
      setRejectionReason("");
      setShowRejectionInput(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to reject request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkDelivery = async () => {
    if (!requestId) return;

    setIsLoading(true);
    try {
      await markDelivery({ requestId });
      toast.success("Request marked as delivered");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark delivery");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

  if (!request) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
          >
            Rejected
          </Badge>
        );
      case "delivered":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
          >
            Delivered
          </Badge>
        );
      case "partially_processed":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
          >
            Partially Processed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Batch Process Dialog
  const BatchProcessDialog = () => {
    const summary = getBatchSummary();
    const hasActions = Object.values(itemActions).some(action => action !== null);

    return (
      <Dialog open={showBatchProcessDialog} onOpenChange={setShowBatchProcessDialog}>
        <DialogContent className="w-[95vw] sm:w-full max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Process Selected Items</DialogTitle>
            <DialogDescription>
              Review and confirm the actions for selected items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Summary */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Actions Summary:</Label>
              <div className="grid grid-cols-1 gap-2">
                {summary.approve > 0 && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-950 dark:border-green-800">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Approve</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100">
                      {summary.approve} item{summary.approve > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
                {summary.reject > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:border-red-800">
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">Reject</span>
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100">
                      {summary.reject} item{summary.reject > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
                {summary.direct_po > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Direct PO</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100">
                      {summary.direct_po} item{summary.direct_po > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Reasons */}
            {summary.reject > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Rejection Reasons:</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(itemActions)
                    .filter(([_, action]) => action === "reject")
                    .map(([itemId]) => {
                      const item = allRequests?.find(r => r._id === itemId);
                      return (
                        <div key={itemId} className="p-2 bg-gray-50 border rounded dark:bg-gray-900">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Item {item?.itemOrder || itemId.slice(-4)}: {item?.itemName}
                          </div>
                          <div className="text-xs text-gray-800 dark:text-gray-200">
                            {itemRejectionReasons[itemId] || "No reason provided"}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {!hasActions && (
              <div className="text-center py-4 text-muted-foreground">
                No actions assigned to selected items
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchProcessDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchProcessItems}
              disabled={isLoading || !hasActions}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? "Processing..." : "Confirm Actions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div>
      <BatchProcessDialog />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(
          "w-[95vw] sm:w-full max-w-[95vw] sm:max-w-[640px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1600px] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0",
          isMobileLayout && "max-w-[95vw] w-[95vw]"
        )}>
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gradient-to-r from-background to-muted/20">
            <div className="space-y-3">
              <DialogTitle className={cn(
                "font-bold",
                isMobileLayout ? "text-xl" : "text-2xl"
              )}>
                {isMobileLayout ? "Material Request" : "Request Review"}
              </DialogTitle>
              <div className="flex items-center justify-between gap-4">
                <DialogDescription className="text-base">
                  {isMobileLayout ? "Request #" : "Request Number: "}
                  <span className="font-mono font-semibold text-foreground">#{request.requestNumber}</span>
                </DialogDescription>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {allRequests && allRequests.some(item => item.isUrgent) && (() => {
                    const urgentCount = allRequests.filter(item => item.isUrgent).length;
                    const totalCount = allRequests.length;
                    return (
                      <Badge
                        variant="destructive"
                        className={cn(
                          "flex items-center gap-1.5",
                          isMobileLayout ? "px-2 py-1 text-xs" : "px-3 py-1.5"
                        )}
                      >
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        {isMobileLayout ? `${urgentCount}/${totalCount}` : `${urgentCount}/${totalCount} Urgent`}
                      </Badge>
                    );
                  })()}
                  {(allItemsHaveSameStatus || overallStatus === "partially_processed") && getStatusBadge(overallStatus || request.status)}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/20">
              <div className="space-y-6 max-w-full">
                {/* Basic Information - Simple Mobile Layout */}
                {isMobileLayout ? (
                  // Mobile-first simple layout for site engineers
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Work Site</Label>
                      {request.site ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenInMap(request.site!.address!)}
                            className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-muted/50 flex-shrink-0"
                            title="Open in Maps"
                            disabled={!request.site?.address}
                          >
                            <MapPin className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setSelectedSiteId(request.site!._id)}
                            className="font-semibold text-lg text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-3 py-2 -mx-3 -my-2 transition-colors cursor-pointer text-left flex-1 min-w-0"
                          >
                            {request.site.name}
                          </button>
                        </div>
                      ) : (
                        <p className="font-semibold text-lg">—</p>
                      )}
                      {request.site?.address && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2 ml-9">
                          {request.site.address}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Requested By</Label>
                      {request.creator ? (
                        <button
                          onClick={() => setSelectedUserId(request.creator!._id)}
                          className="font-semibold text-lg text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-3 py-2 -mx-3 -my-2 transition-colors cursor-pointer text-left w-full"
                        >
                          {request.creator.fullName}
                        </button>
                      ) : (
                        <p className="font-semibold text-lg">—</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.createdAt), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Needed By</Label>
                      <p className="font-semibold text-lg">
                        {format(new Date(request.requiredBy), "dd MMM yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.ceil((new Date(request.requiredBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
                      </p>
                    </div>
                  </div>
                ) : (
                  // Original desktop layout for managers
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Site Location</Label>
                      {request.site ? (
                        <button
                          onClick={() => setSelectedSiteId(request.site!._id)}
                          className="font-semibold text-base text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer text-left"
                        >
                          {request.site.name}
                        </button>
                      ) : (
                        <p className="font-semibold text-base">—</p>
                      )}
                      {request.site?.address && (
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {request.site.address}
                          </p>
                          <button
                            onClick={() => handleOpenInMap(request.site!.address!)}
                            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-sm hover:bg-muted/50"
                            title="Open in Maps"
                          >
                            <MapPin className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created By</Label>
                      {request.creator ? (
                        <button
                          onClick={() => setSelectedUserId(request.creator!._id)}
                          className="font-semibold text-base text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer text-left"
                        >
                          {request.creator.fullName}
                        </button>
                      ) : (
                        <p className="font-semibold text-base">—</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.createdAt), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Required By</Label>
                      <p className="font-semibold text-base">
                        {format(new Date(request.requiredBy), "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.ceil((new Date(request.requiredBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Items</Label>
                      <p className="font-semibold text-base">
                        {allRequests?.length || 1} item{(allRequests?.length || 1) > 1 ? 's' : ''}
                      </p>
                      {pendingItems.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {pendingItems.length} pending
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Notes Section - Always Visible */}
                <div className="mt-4 mb-2 p-3 sm:p-4 rounded-lg bg-gradient-to-br from-yellow-50/80 to-yellow-50/40 border border-yellow-200/60 dark:from-yellow-900/10 dark:to-yellow-900/5 dark:border-yellow-900/20 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Notes & Timeline
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100/50 dark:text-yellow-500 dark:hover:text-yellow-400 dark:hover:bg-yellow-900/30"
                      onClick={() => setShowNotesTimeline(true)}
                    >
                      View All ({notes?.length || 0})
                    </Button>
                  </div>

                  {latestNote ? (
                    <div className="pl-0.5">
                      <p className="text-sm font-medium text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-3">
                        {latestNote.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        Added by {latestNote.userName} on {format(new Date(latestNote.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ) : (
                    <div className="pl-0.5">
                      <p className="text-sm text-muted-foreground italic">
                        No notes yet. Click "View All" to add one.
                      </p>
                    </div>
                  )}
                </div>

                <Separator />


                {/* Request Images Gallery - Hidden for Managers */}
                {allPhotos.length > 0 && !isManager && (
                  <div className="space-y-3">
                    <Label className="text-muted-foreground font-bold">
                      Request Photos ({allPhotos.length})
                    </Label>
                    <div className="flex justify-center">
                      <CompactImageGallery
                        images={allPhotos}
                        maxDisplay={5}
                        size="lg"
                        className="justify-center"
                      />
                    </div>
                  </div>
                )}

                {/* All Items Details - Card Grid Layout */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground font-bold">
                      {isMobileLayout ? "Materials List" : (
                        allRequests && allRequests.length > 1
                          ? `Items (${allRequests.length})`
                          : "Item Details"
                      )}
                    </Label>
                  </div>

                  {/* Display all items in proper Card Grid Layout */}
                  {allRequests && allRequests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {(allRequests || [])
                        .sort((a, b) => {
                          const orderA = a.itemOrder ?? a.createdAt;
                          const orderB = b.itemOrder ?? b.createdAt;
                          return orderA - orderB;
                        })
                        .map((item, idx) => {
                          const isPending = item.status === "pending";
                          const displayNumber = item.itemOrder ?? idx + 1;
                          const isSelected = selectedItemsForAction.has(item._id);
                          const itemPhotos = getItemPhotos(item);

                          return (
                            <div
                              key={item._id}
                              className={cn(
                                "p-4 rounded-lg border-2 shadow-sm relative min-h-[200px] flex flex-col",
                                item.status === "approved" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                                item.status === "rejected" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                                !["approved", "rejected"].includes(item.status) && "bg-card/50",
                                isSelected && "border-green-500 shadow-md ring-2 ring-green-200"
                              )}
                            >
                              {/* Select button - top right corner */}
                              {isPending && (
                                <div className="absolute top-2 right-2 z-10">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => toggleItemSelection(item._id)}
                                    className="h-4 w-4"
                                  />
                                </div>
                              )}

                              <div className="flex flex-col flex-1">
                                <div className="flex items-start justify-between gap-2 mb-3 pr-8">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-xs px-2 py-1 h-6 min-w-[28px] flex items-center justify-center flex-shrink-0">
                                        {displayNumber}
                                      </Badge>
                                      <div className="flex-1 min-w-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedItemName(item.itemName);
                                          }}
                                          className="text-sm font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer text-left truncate"
                                        >
                                          {item.itemName}
                                        </button>
                                      </div>
                                    </div>
                                    {item.description && (
                                      <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                        {item.description}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <span><span className="font-medium">Qty:</span> {item.quantity} {item.unit}</span>
                                      {item.specsBrand && (
                                        <span className="text-primary truncate">• {item.specsBrand}</span>
                                      )}
                                      {getInventoryStatusBadge(item.itemName, item.quantity, item.unit)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <CompactImageGallery
                                      images={itemPhotos}
                                      maxDisplay={1}
                                      size="md"
                                    />
                                  </div>
                                </div>

                                {/* Status and badges */}
                                <div className="mt-auto pt-2 border-t">
                                  <div className="flex items-center justify-between">
                                    {/* Urgent badge - Left side */}
                                    <div className="flex items-center">
                                      {item.isUrgent && (
                                        <Badge variant="destructive" className="text-xs">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Urgent
                                        </Badge>
                                      )}
                                    </div>
                                    {/* Status badge - Right side */}
                                    <div className="flex items-center">
                                      {(item.status === 'approved' || item.status === 'cc_approved') && (
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs">
                                          ✓ Approved
                                        </Badge>
                                      )}
                                      {item.status === 'rejected' && (
                                        <Badge variant="destructive" className="text-xs">
                                          ✗ Rejected
                                        </Badge>
                                      )}
                                      {item.status !== 'approved' && item.status !== 'rejected' && item.status !== 'cc_approved' && getStatusBadge(item.status)}
                                    </div>
                                  </div>
                                </div>

                                {/* Individual Item Actions */}
                                {isManager && isPending && (
                                  <div className="flex gap-1 mt-3 pt-2 border-t">
                                    {(() => {
                                      const status = inventoryStatus?.[item.itemName];
                                      const stock = status?.centralStock || 0;
                                      const isPartial = stock > 0 && stock < item.quantity;
                                      const isFull = stock >= item.quantity;

                                      if (isFull) {
                                        return (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowItemDirectDeliveryConfirm(item._id)}
                                            disabled={isLoading}
                                            className="flex-1 text-xs h-7 px-1 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
                                          >
                                            <Package className="h-3 w-3 mr-1" />
                                            Delivery
                                          </Button>
                                        );
                                      }

                                      if (isPartial) {
                                        return (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowSplitConfirm(item._id)}
                                            disabled={isLoading || !onCheck}
                                            className="flex-1 text-xs h-7 px-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                                            title="Split Fulfillment / Check"
                                          >
                                            <PieChart className="h-3 w-3 mr-1" />
                                            Split
                                          </Button>
                                        );
                                      }

                                      return (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setShowItemDirectPOConfirm(item._id)}
                                          disabled={isLoading}
                                          className="flex-1 text-xs h-7 px-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                                        >
                                          <ShoppingCart className="h-3 w-3 mr-1" />
                                          Direct PO
                                        </Button>
                                      );
                                    })()}
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => setShowItemRejectionInput(item._id)}
                                      disabled={isLoading}
                                      className="flex-1 text-xs h-7 px-1"
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Reject
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => setShowItemApproveConfirm(item._id)}
                                      disabled={isLoading}
                                      className="flex-1 text-xs h-7 px-1 bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approve
                                    </Button>
                                  </div>
                                )}

                                {/* Rejection Reason Input for individual items */}
                                {showItemRejectionInput === item._id && (
                                  <div className="mt-2">
                                    <Textarea
                                      value={itemRejectionReasons[item._id] || ""}
                                      onChange={(e) =>
                                        setItemRejectionReasons((prev) => ({
                                          ...prev,
                                          [item._id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Enter rejection reason..."
                                      rows={2}
                                      className="text-xs"
                                    />
                                    <div className="flex gap-1 mt-1">
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleItemReject(item._id)}
                                        disabled={isLoading || !itemRejectionReasons[item._id]?.trim()}
                                        className="text-xs h-6 px-2"
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Confirm
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setShowItemRejectionInput(null);
                                          setItemRejectionReasons((prev) => {
                                            const next: Record<string, string> = { ...prev };
                                            delete next[item._id];
                                            return next;
                                          });
                                        }}
                                        disabled={isLoading}
                                        className="text-xs h-6 px-2"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* First Row: Urgent (left) + Status (right) */}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    // Fallback to single item display if allRequests not loaded yet
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-card space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          {request.isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                          {(allItemsHaveSameStatus || overallStatus === "partially_processed") && getStatusBadge(overallStatus || request.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Item Name</Label>
                            <p className="font-medium">{request.itemName}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Quantity</Label>
                            <p className="font-medium">
                              {request.quantity} {request.unit}
                            </p>
                          </div>
                        </div>

                        {request.description && (
                          <div>
                            <Label className="text-muted-foreground">Description</Label>
                            <p className="text-sm">{request.description}</p>
                          </div>
                        )}

                        {request.specsBrand && (
                          <div>
                            <Label className="text-muted-foreground">Specs/Brand</Label>
                            <p className="text-sm font-medium">{request.specsBrand}</p>
                          </div>
                        )}

                        {request.notes && (
                          <div>
                            <Label className="text-muted-foreground">Notes</Label>
                            <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
                          </div>
                        )}

                        {request.photo && (
                          <div>
                            <Label className="text-muted-foreground">Photo</Label>
                            <div className="mt-2">
                              <img
                                src={request.photo.imageUrl}
                                alt="Request photo"
                                className="max-w-full h-auto rounded-md border max-h-64 object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Approval Information */}
                {request.approvedBy && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Approval Details</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Approved by:</span>{" "}
                            {request.approver?.fullName || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Approved at:</span>{" "}
                            {request.approvedAt
                              ? format(new Date(request.approvedAt), "dd/MM/yyyy HH:mm")
                              : "—"}
                          </p>
                        </div>
                      </div>
                      {/* Show rejection reasons for all rejected items */}
                      {allRequests && allRequests.filter(item => item.status === "rejected" && item.rejectionReason).length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-destructive">Rejection Reasons</Label>
                          {allRequests
                            .filter(item => item.status === "rejected" && item.rejectionReason)
                            .map((item, index) => (
                              <div key={item._id} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                                <div className="flex items-start gap-2">
                                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                                      {item.itemName} ({item.quantity} {item.unit})
                                    </div>
                                    <div className="text-sm text-red-700 dark:text-red-400">
                                      {item.rejectionReason}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                      {/* Fallback for single item rejection */}
                      {request.rejectionReason && (!allRequests || allRequests.filter(item => item.status === "rejected").length === 0) && (
                        <div>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Rejection reason:</span>{" "}
                            <span className="text-destructive">
                              {request.rejectionReason}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Delivery Information */}
                {request.deliveryMarkedAt && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground">Delivery</Label>
                      <p className="text-sm">
                        Marked as delivered on{" "}
                        {format(new Date(request.deliveryMarkedAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </>
                )}

                {/* Actions - Simplified for Mobile Site Engineers */}
                {canMarkDelivery && isMobileLayout && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-base text-muted-foreground mb-4">
                          Did you receive all the materials?
                        </p>
                        <Button
                          onClick={handleMarkDelivery}
                          disabled={isLoading}
                          className="w-full h-16 text-lg font-bold bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-6 w-6 mr-3" />
                          ✓ Got Materials
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Manager Actions - Simplified and Systematic */}
                {(canApprove || canReject) && !isMobileLayout && (
                  <>
                    <Separator />
                    <div className="space-y-4">

                      {/* Main Action Buttons - Always Visible */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {(() => {
                          const itemsToCheck = selectedItemsForAction.size > 0
                            ? pendingItems.filter(item => selectedItemsForAction.has(item._id))
                            : pendingItems;

                          const isAllFullStock = itemsToCheck.every(item => {
                            const status = inventoryStatus?.[item.itemName];
                            return status && status.centralStock >= item.quantity;
                          });

                          const isAllNoStock = itemsToCheck.every(item => {
                            const status = inventoryStatus?.[item.itemName];
                            return !status || status.centralStock <= 0;
                          });

                          const isAllPartialStock = itemsToCheck.every(item => {
                            const status = inventoryStatus?.[item.itemName];
                            return status && status.centralStock > 0 && status.centralStock < item.quantity;
                          });

                          if (isAllFullStock) {
                            return (
                              <Button
                                onClick={() => setShowDirectDeliveryConfirm(true)}
                                disabled={isLoading}
                                size="lg"
                                variant="outline"
                                className="flex-1 sm:w-1/5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-950 font-semibold py-4"
                              >
                                <Package className="h-5 w-5 mr-2" />
                                {selectedItemsForAction.size > 0
                                  ? `Direct Delivery (${selectedItemsForAction.size})`
                                  : "Delivery All"
                                }
                              </Button>
                            );
                          }

                          if (isAllNoStock) {
                            return (
                              <Button
                                onClick={() => setShowDirectPOConfirm(true)}
                                disabled={isLoading}
                                size="lg"
                                variant="outline"
                                className="flex-1 sm:w-1/5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-950 font-semibold py-4"
                              >
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                {selectedItemsForAction.size > 0
                                  ? `Direct PO (${selectedItemsForAction.size})`
                                  : "Direct PO All"
                                }
                              </Button>
                            );
                          }

                          if (isAllPartialStock) {
                            return (
                              <Button
                                onClick={() => setShowBulkSplitConfirm(true)}
                                size="lg"
                                variant="outline"
                                className="flex-1 sm:w-1/5 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-950 font-semibold py-4"
                              >
                                <PieChart className="h-5 w-5 mr-2" />
                                Confirm Splits All
                              </Button>
                            );
                          }

                          // Mixed Status - Disable Button
                          return (
                            <Button
                              disabled
                              size="lg"
                              variant="outline"
                              className="flex-1 sm:w-1/5 border-gray-200 text-gray-400 bg-gray-50/50 cursor-not-allowed font-semibold py-4"
                              title="Items have different fulfillment status (Full, Partial, or No Stock). Please select matching items or manage individually."
                            >
                              <AlertCircle className="h-5 w-5 mr-2" />
                              Mixed Actions
                            </Button>
                          );
                        })()}
                        <Button
                          variant="destructive"
                          onClick={() => setShowRejectionInput(true)}
                          disabled={isLoading}
                          size="lg"
                          className="flex-1 sm:flex-[2] font-semibold py-4"
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          {selectedItemsForAction.size > 0
                            ? `Reject (${selectedItemsForAction.size})`
                            : "Reject All"
                          }
                        </Button>
                        <Button
                          onClick={() => setShowApproveConfirm(true)}
                          disabled={isLoading}
                          size="lg"
                          className="flex-1 sm:flex-[2] bg-green-600 hover:bg-green-700 text-white font-semibold py-4"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          {selectedItemsForAction.size > 0
                            ? `Approve (${selectedItemsForAction.size})`
                            : "Approve All"
                          }
                        </Button>
                      </div>

                      {/* Direct Delivery Confirmation */}
                      {showDirectDeliveryConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                  <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Confirm Direct Delivery
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Send {selectedItemsForAction.size > 0 ? selectedItemsForAction.size : 'all'} items directly to Delivery Stage from Inventory?
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  onClick={async () => {
                                    const itemsToProcess = selectedItemsForAction.size > 0
                                      ? Array.from(selectedItemsForAction)
                                      : pendingItems.map(item => item._id);

                                    try {
                                      await bulkUpdateStatus({
                                        requestIds: itemsToProcess,
                                        status: "delivery_stage",
                                      });
                                      setShowDirectDeliveryConfirm(false);
                                      setSelectedItemsForAction(new Set());
                                      onOpenChange(false);
                                      toast.success(`${itemsToProcess.length} items sent to Delivery Stage`);
                                    } catch (error: any) {
                                      toast.error(error.message || "Failed to process Direct Delivery");
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                  <Package className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowDirectDeliveryConfirm(false)}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Split Confirmation */}
                      {showSplitConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                                  <PieChart className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Manage Split Fulfillment
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    This item has partial stock available. Do you want to open the Split/Check Dialog to manage fulfillment?
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => {
                                    if (onCheck && showSplitConfirm) {
                                      onCheck(showSplitConfirm);
                                      setShowSplitConfirm(null);
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowSplitConfirm(null)}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Approval Confirmation */}
                      {showApproveConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Confirm Approval
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Approve {selectedItemsForAction.size > 0 ? selectedItemsForAction.size : 'all'} pending items?
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  onClick={async () => {
                                    const itemsToProcess = selectedItemsForAction.size > 0
                                      ? Array.from(selectedItemsForAction)
                                      : pendingItems.map(item => item._id);

                                    // Keep dialog open, just close confirmation
                                    setShowApproveConfirm(false);
                                    setSelectedItemsForAction(new Set());

                                    try {
                                      await bulkUpdateStatus({
                                        requestIds: itemsToProcess,
                                        status: "approved",
                                      });
                                      toast.success(`${itemsToProcess.length} items approved`);
                                    } catch (error: any) {
                                      toast.error(error.message || "Failed to approve items");
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowApproveConfirm(false)}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Direct PO Confirmation */}
                      {showDirectPOConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                  <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Confirm Direct PO
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Send {selectedItemsForAction.size > 0 ? selectedItemsForAction.size : 'all'} items directly to PO? This skips cost comparison.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  onClick={async () => {
                                    const itemsToProcess = selectedItemsForAction.size > 0
                                      ? Array.from(selectedItemsForAction)
                                      : pendingItems.map(item => item._id);

                                    // Keep dialog open, just close confirmation
                                    setShowDirectPOConfirm(false);
                                    setSelectedItemsForAction(new Set());

                                    try {
                                      await bulkUpdateStatus({
                                        requestIds: itemsToProcess,
                                        status: "direct_po",
                                      });
                                      toast.success(`${itemsToProcess.length} items sent to Direct PO`);
                                    } catch (error: any) {
                                      toast.error(error.message || "Failed to process Direct PO");
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowDirectPOConfirm(false)}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bulk Split Confirmation */}
                      {showBulkSplitConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                                  <PieChart className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Approve Splits for {selectedItemsForAction.size > 0 ? selectedItemsForAction.size : 'All'} Items?
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    This will automatically set inventory fulfillment to the <strong>maximum available stock</strong> for each item and approve the split plan.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  onClick={async () => {
                                    const itemsToProcess = selectedItemsForAction.size > 0
                                      ? pendingItems.filter(item => selectedItemsForAction.has(item._id))
                                      : pendingItems;

                                    let processedCount = 0;
                                    try {
                                      await Promise.all(itemsToProcess.map(async (item) => {
                                        const status = inventoryStatus?.[item.itemName];
                                        if (status && status.centralStock > 0) {
                                          const maxStock = Math.min(status.centralStock, item.quantity);
                                          // Upsert CC with max inventory
                                          await upsertCC({
                                            requestId: item._id,
                                            vendorQuotes: item.vendorQuotes?.map(q => ({
                                              vendorId: q.vendorId,
                                              unitPrice: q.unitPrice,
                                              amount: q.amount,
                                              unit: q.unit,
                                              discountPercent: (q as any).discountPercent,
                                              gstPercent: (q as any).gstPercent
                                            })) || [], // Map strict types
                                            isDirectDelivery: false,
                                            inventoryFulfillmentQuantity: maxStock
                                          });
                                          // Approve Split
                                          await approveSplit({ requestId: item._id });
                                          processedCount++;
                                        }
                                      }));

                                      setShowBulkSplitConfirm(false);
                                      setSelectedItemsForAction(new Set());
                                      onOpenChange(false); // Close main dialog too? Or just refresh? Let's close for "done" feel.
                                      toast.success(`${processedCount} items split and approved`);
                                    } catch (error: any) {
                                      toast.error("Failed to batch process: " + error.message);
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirm All
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowBulkSplitConfirm(false)}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Individual Item Approve Confirmation */}
                      {showItemApproveConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Confirm Item Approval
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Approve this individual item?
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => {
                                    if (showItemApproveConfirm) {
                                      handleItemApprove(showItemApproveConfirm);
                                      setShowItemApproveConfirm(null);
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowItemApproveConfirm(null)}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Individual Item Direct PO Confirmation */}
                      {showItemDirectPOConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                  <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Confirm Direct PO
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Send this individual item directly to PO? This skips cost comparison.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => {
                                    if (showItemDirectPOConfirm) {
                                      handleItemDirectPO(showItemDirectPOConfirm);
                                      setShowItemDirectPOConfirm(null);
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowItemDirectPOConfirm(null)}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Individual Item Direct Delivery Confirmation */}
                      {showItemDirectDeliveryConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                  <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Confirm Item Delivery
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Send this individual item directly to Delivery Stage from Inventory?
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  onClick={async () => {
                                    if (!showItemDirectDeliveryConfirm) return;
                                    try {
                                      await updateStatus({
                                        requestId: showItemDirectDeliveryConfirm,
                                        status: "delivery_stage", // Maps to ready_for_cc + directAction: delivery
                                      });
                                      setShowItemDirectDeliveryConfirm(null);
                                      toast.success("Item sent to Delivery Stage");
                                    } catch (error: any) {
                                      toast.error(error.message || "Failed to process item");
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                  <Package className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowItemDirectDeliveryConfirm(null)}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rejection Reason Input */}
                      {showRejectionInput && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Confirm Rejection
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Reject {selectedItemsForAction.size > 0 ? selectedItemsForAction.size : 'all'} pending items?
                                  </p>
                                </div>
                              </div>
                              <div className="mb-4">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                  Rejection Reason <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Please explain why this request is being rejected..."
                                  rows={3}
                                  className="w-full"
                                />
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  variant="destructive"
                                  onClick={async () => {
                                    const itemsToProcess = selectedItemsForAction.size > 0
                                      ? Array.from(selectedItemsForAction)
                                      : pendingItems.map(item => item._id);

                                    // Keep dialog open, just close confirmation
                                    setShowRejectionInput(false);
                                    setRejectionReason("");
                                    setSelectedItemsForAction(new Set());

                                    try {
                                      await bulkUpdateStatus({
                                        requestIds: itemsToProcess,
                                        status: "rejected",
                                        rejectionReason: rejectionReason.trim(),
                                      });
                                      toast.success(`${itemsToProcess.length} items rejected`);
                                    } catch (error: any) {
                                      toast.error(error.message || "Failed to reject items");
                                    }
                                  }}
                                  disabled={isLoading || !rejectionReason.trim()}
                                  className="flex-1"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowRejectionInput(false);
                                    setRejectionReason("");
                                  }}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* Footer - Sticky */}
          <DialogFooter className="px-3 sm:px-6 py-3 sm:py-4 border-t bg-muted/30">
            <div className="flex items-center justify-center w-full">
              <div className="text-xs text-muted-foreground text-center">
                {pendingItems.length > 0 && (
                  <span>{pendingItems.length} item{pendingItems.length > 1 ? 's' : ''} pending review</span>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent >

        {/* User Info Dialog */}
        < UserInfoDialog
          open={!!selectedUserId
          }
          onOpenChange={(open) => {
            if (!open) setSelectedUserId(null);
          }}
          userId={selectedUserId}
        />

        {/* Item Info Dialog */}
        < ItemInfoDialog
          open={!!selectedItemName}
          onOpenChange={(open) => {
            if (!open) setSelectedItemName(null);
          }}
          itemName={selectedItemName}
        />

        {/* Site Info Dialog */}
        < SiteInfoDialog
          open={!!selectedSiteId}
          onOpenChange={(open) => {
            if (!open) setSelectedSiteId(null);
          }}
          siteId={selectedSiteId}
        />

        {/* Notes Timeline Dialog */}
        {
          request?.requestNumber && (
            <NotesTimelineDialog
              requestNumber={request.requestNumber}
              open={showNotesTimeline}
              onOpenChange={setShowNotesTimeline}
            />
          )
        }
      </Dialog >
    </div >
  );
}

