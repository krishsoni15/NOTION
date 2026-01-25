"use client";

/**
 * Request Details Dialog Component
 * 
 * Shows full request details with photo display.
 * Managers can approve/reject requests.
 * Site Engineers can mark delivery.
 */

import { useState, useRef, useEffect, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, XCircle, Package, ShoppingCart, MapPin, PackageX, Sparkles, FileText, PieChart, LayoutGrid, List, Edit, Image as ImageIcon, Calendar, Clock, Check } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { ROLES } from "@/lib/auth/roles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserInfoDialog } from "./user-info-dialog";
import { ItemInfoDialog } from "./item-info-dialog";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";
import { NotesTimelineDialog } from "./notes-timeline-dialog";
import { PDFPreviewDialog } from "@/components/purchase/pdf-preview-dialog";
import { EditPOQuantityDialog } from "@/components/purchase/edit-po-quantity-dialog";
import { ExpandableText } from "@/components/ui/expandable-text";
import type { Id } from "@/convex/_generated/dataModel";

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: Id<"requests"> | null;
  onCheck?: (requestId: Id<"requests">) => void;
  onOpenCC?: (requestId: Id<"requests">, requestIds?: Id<"requests">[]) => void;
}

export function RequestDetailsDialog({
  open,
  onOpenChange,
  requestId,
  onCheck,
  onOpenCC,
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


  const handleSingleApproveDirectPO = async (requestId: Id<"requests">) => {
    setIsLoading(true);
    try {
      await approveDirectPO({ requestId: requestId as Id<"requests"> });
      setShowSignPendingApproveConfirm(null);
      toast.success("Direct PO approved successfully");
      // Small delay to let confirmation dialog close first
      setTimeout(() => {
        closeAndRefresh();
      }, 100);
    } catch (error: any) {
      toast.error("Failed to approve Direct PO: " + error.message);
      console.error("Approve error:", error);
      setShowSignPendingApproveConfirm(null); // Close confirmation on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleRejectDirectPO = async (requestId: Id<"requests">, reason: string) => {
    try {
      await rejectDirectPO({ requestId, reason });
      toast.success("Direct PO rejected");
      setShowRejectionInput(null as any);
      setRejectionReason("");
    } catch (error: any) {
      toast.error("Failed to reject Direct PO: " + error.message);
    }
  };
  const updateStatus = useMutation(api.requests.updateRequestStatus);
  const bulkUpdateStatus = useMutation(api.requests.bulkUpdateRequestStatus);
  const markDelivery = useMutation(api.requests.markDelivery);
  const upsertCC = useMutation(api.costComparisons.upsertCostComparison);
  const approveSplit = useMutation(api.costComparisons.approveSplitFulfillment);
  const approveDirectPO = useMutation(api.purchaseOrders.approveDirectPOByRequest);
  const rejectDirectPO = useMutation(api.purchaseOrders.rejectDirectPOByRequest);
  // Fetch latest note for this request
  const notes = useQuery(api.notes.getNotes, request?.requestNumber ? { requestNumber: request.requestNumber } : "skip");
  const latestNote = notes && notes.length > 0 ? notes[0] : null;

  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState<boolean | string>(false);
  const [itemRejectionReasons, setItemRejectionReasons] = useState<Record<string, string>>({});
  const [showItemRejectionInput, setShowItemRejectionInput] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);
  const [pdfPreviewPoNumber, setPdfPreviewPoNumber] = useState<string | null>(null);
  const [selectedItemsForAction, setSelectedItemsForAction] = useState<Set<Id<"requests">>>(new Set());
  const [itemActions, setItemActions] = useState<Record<Id<"requests">, "approve" | "reject" | "direct_po" | null>>({});
  const [itemIntents, setItemIntents] = useState<Record<Id<"requests">, string[]>>({});
  const [showBatchProcessDialog, setShowBatchProcessDialog] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDirectPOConfirm, setShowDirectPOConfirm] = useState(false);
  const [showItemApproveConfirm, setShowItemApproveConfirm] = useState<Id<"requests"> | null>(null);
  const [showItemDirectPOConfirm, setShowItemDirectPOConfirm] = useState<Id<"requests"> | null>(null);
  const [showDirectDeliveryConfirm, setShowDirectDeliveryConfirm] = useState(false);
  const [showItemDirectDeliveryConfirm, setShowItemDirectDeliveryConfirm] = useState<Id<"requests"> | null>(null);
  const [showBulkSplitConfirm, setShowBulkSplitConfirm] = useState(false);
  const [showNotesTimeline, setShowNotesTimeline] = useState(false);
  const [showSignPendingApproveConfirm, setShowSignPendingApproveConfirm] = useState<Id<"requests"> | boolean | null>(null);
  const [editQuantityItem, setEditQuantityItem] = useState<{ id: Id<"requests">; quantity: number; name: string; unit: string } | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
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
  const isPurchaseOfficer = userRole === ROLES.PURCHASE_OFFICER;
  const canMarkDelivery =
    isSiteEngineer && request?.status === "delivery_stage" && request?.createdBy;

  // Simplified mobile-first layout for site engineers
  const isMobileLayout = isSiteEngineer;

  // Get pending items for manager actions
  const pendingItems = allRequests?.filter((item) => item.status === "pending") || [];
  const signPendingItems = allRequests?.filter((item) => item.status === "sign_pending" || item.status === "sign_rejected") || [];
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
      setViewMode("table"); // Reset view mode
      setItemActions({});
      setShowBatchProcessDialog(false);
      setShowApproveConfirm(false);
      setShowDirectPOConfirm(false);
      setShowItemApproveConfirm(null);
      setShowItemDirectPOConfirm(null);
      setShowBulkSplitConfirm(false);
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
    const intents = itemIntents[itemId] || [];

    try {
      if (intents.includes("split") || (intents.includes("direct_po") && intents.includes("direct_delivery"))) {
        await updateStatus({
          requestId: itemId,
          status: "recheck", // Start recheck/split flow
        });
        toast.info("Item marked for Recheck/Split");
      } else if (intents.includes("direct_po")) {
        await updateStatus({
          requestId: itemId,
          status: "direct_po",
        });
        toast.success("Item marked for Direct PO");
      } else if (intents.includes("direct_delivery")) {
        await updateStatus({
          requestId: itemId,
          status: "delivery_stage",
        });
        toast.success("Item sent to Delivery Stage");
      } else {
        await updateStatus({
          requestId: itemId,
          status: "approved",
        });
        toast.success("Item approved successfully");
      }
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

    const item = allRequests?.find(r => r._id === itemId);
    if (!item) return;

    setIsLoading(true);
    try {
      if (item.status === "sign_pending") {
        await rejectDirectPO({ requestId: itemId, reason });
      } else {
        await updateStatus({
          requestId: itemId,
          status: "rejected",
          rejectionReason: reason,
        });
      }
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
      toast.success("Item marked for Direct PO");
    } catch (error: any) {
      toast.error(error.message || "Failed to mark for Direct PO");
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
    const allProcessableIds = [
      ...pendingItems.map(item => item._id),
      ...signPendingItems.map(item => item._id)
    ];
    setSelectedItemsForAction(new Set(allProcessableIds));
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

  const toggleIntent = (itemId: Id<"requests">, intent: string) => {
    setItemIntents(prev => {
      const current = prev[itemId] || [];
      const isSelected = current.includes(intent);
      const updated = isSelected
        ? current.filter(i => i !== intent)
        : [...current, intent];

      // Auto-select the item if any intent is activated
      if (updated.length > 0) {
        setSelectedItemsForAction(prevSelected => {
          const newSet = new Set(prevSelected);
          newSet.add(itemId);
          return newSet;
        });
      }

      return {
        ...prev,
        [itemId]: updated
      };
    });
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


  const handleDirectPOAll = async () => {
    const itemsToDirectPO = selectedItemsForAction.size > 0
      ? Array.from(selectedItemsForAction)
      : pendingItems.map((item) => item._id);

    if (itemsToDirectPO.length === 0) {
      toast.error("No items selected to mark as Ready for CC");
      return;
    }

    setIsLoading(true);
    try {
      await bulkUpdateStatus({
        requestIds: itemsToDirectPO,
        status: "direct_po",
      });
      toast.success(`${itemsToDirectPO.length} item(s) marked for Direct PO`);
      setSelectedItemsForAction(new Set()); // Clear selection after action
      closeAndRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark items for Direct PO");
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
      toast.success("Request marked for Direct PO");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark for Direct PO");
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

  const handleApproveAll = async () => {
    // 1. Determine items to process
    // If specific items are selected via checkboxes (if utilizing selection mode), use those.
    // Otherwise, select ALL pending/sign_pending items visible.
    const itemsToProcess = selectedItemsForAction.size > 0
      ? Array.from(selectedItemsForAction)
      : [...signPendingItems.map(i => i._id), ...pendingItems.map(i => i._id)];

    if (itemsToProcess.length === 0) return;

    setIsLoading(true);
    try {
      const promises = [];

      // Group items by their INTENT
      const directPOIds: Id<"requests">[] = [];
      const directDeliveryIds: Id<"requests">[] = [];
      const standardApproveIds: Id<"requests">[] = [];
      const signApproveIds: Id<"requests">[] = [];
      const splitIds: Id<"requests">[] = [];

      itemsToProcess.forEach(id => {
        const item = allRequests?.find(r => r._id === id);
        if (!item) return;

        // If it's already in sign_pending, "Approve" means approving the PO (unless rejected separately)
        if (item.status === "sign_pending" || item.status === "sign_rejected") {
          signApproveIds.push(id);
          return;
        }

        // For pending items, check the USER INTENT
        const intents = itemIntents[id] || [];

        if (intents.includes("split") || (intents.includes("direct_po") && intents.includes("direct_delivery"))) {
          splitIds.push(id);
        } else if (intents.includes("direct_po")) {
          directPOIds.push(id);
        } else if (intents.includes("direct_delivery")) {
          directDeliveryIds.push(id);
        } else {
          // Default/Null intent -> Standard Approval (Ready for CC)
          standardApproveIds.push(id);
        }
      });

      // Execute Mutations
      if (signApproveIds.length > 0) {
        promises.push(Promise.all(signApproveIds.map(id => approveDirectPO({ requestId: id as Id<"requests"> }))));
      }

      if (directPOIds.length > 0) {
        promises.push(bulkUpdateStatus({
          requestIds: directPOIds,
          status: "direct_po",
        }));
      }

      if (directDeliveryIds.length > 0) {
        // Direct Delivery usually maps to 'delivery_stage' or 'ready_for_delivery'
        // Assuming 'delivery_stage' as per previous logic in direct delivery handler
        promises.push(bulkUpdateStatus({
          requestIds: directDeliveryIds,
          status: "delivery_stage",
        }));
      }

      if (standardApproveIds.length > 0) {
        promises.push(bulkUpdateStatus({
          requestIds: standardApproveIds,
          status: "approved",
        }));
      }

      // Handle Split?
      if (splitIds.length > 0) {
        // For now, maybe just mark them for Recheck so user can process them? 
        // Or leave them as pending? 
        // User requested selection based logic. If split is selected, we likely can't "Approve" in bulk 
        // without parameters. Marking them as 'recheck' seems safest to flag for manual intervention.
        promises.push(bulkUpdateStatus({
          requestIds: splitIds,
          status: "recheck",
        }));
        toast.info(`${splitIds.length} items marked for Recheck/Split processing.`);
      }

      await Promise.all(promises);
      toast.success(`${itemsToProcess.length} items processed based on selection`);
      setSelectedItemsForAction(new Set());
      setItemIntents({}); // Reset intents
      closeAndRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve items");
    } finally {
      setIsLoading(false);
    }
  };



  if (!request) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    // Grouping Logic strictly based on user requirements

    // 1. Draft
    if (status === "draft") {
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800 gap-2 pl-2 pr-2.5 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-slate-500" />
          Draft
        </Badge>
      );
    }

    // 2. Pending (Includes Sign Pending)
    if (["pending", "sign_pending"].includes(status)) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 gap-2 pl-2 pr-2.5 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Pending
        </Badge>
      );
    }

    // 3. Rejected (Includes Sign Rejected and potential future rejection states)
    if (["rejected", "sign_rejected", "cc_rejected", "po_rejected"].includes(status)) {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800 gap-2 pl-2 pr-2.5 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-rose-500" />
          Rejected
        </Badge>
      );
    }

    // 4. Approved & Under Process (Includes ALL intermediate steps from Approval to Delivery)
    if (["approved", "cc_pending", "ready_for_cc", "cc_approved", "pending_po", "ready_for_po", "ordered", "partially_processed", "direct_po", "ready_for_delivery", "recheck", "recheck_requested"].includes(status)) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800 gap-2 pl-2 pr-2.5 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          Approved & Under Process
        </Badge>
      );
    }

    // 5. Out for Delivery
    if (["delivery_processing", "delivery_stage", "out_for_delivery"].includes(status)) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800 gap-2 pl-2 pr-2.5 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          Out for Delivery
        </Badge>
      );
    }

    // 6. Delivered
    if (status === "delivered") {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 gap-2 pl-2 pr-2.5 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          Delivered
        </Badge>
      );
    }

    return <Badge variant="outline" className="gap-1.5">{status}</Badge>;
  };

  // Batch Process Dialog helper
  const BatchProcessDialogHelper = () => {
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
      <BatchProcessDialogHelper />
      <PDFPreviewDialog
        open={!!pdfPreviewPoNumber}
        onOpenChange={(open) => !open && setPdfPreviewPoNumber(null)}
        poNumber={pdfPreviewPoNumber}
      />

      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          if (!newOpen && showSignPendingApproveConfirm) {
            return;
          }
          onOpenChange(newOpen);
        }}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] h-[95vh] p-0 gap-0 bg-background overflow-hidden flex flex-col shadow-2xl border-none">
          {/* Enhanced Header with Gradient */}
          <div className="flex flex-col border-b sticky top-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
            <div className="px-6 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-start justify-between gap-4">
              <div className="space-y-1.5 overflow-hidden">
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <span className="text-muted-foreground font-mono text-xl">#</span>
                    {request?.requestNumber}
                  </DialogTitle>
                  {/* Only show status badge in header if ALL items have the same status */}
                  {(() => {
                    if (!allRequests || allRequests.length === 0) return request && getStatusBadge(request.status);
                    const firstStatus = allRequests[0].status;
                    const allSame = allRequests.every(r => r.status === firstStatus);
                    return allSame ? getStatusBadge(firstStatus) : null;
                  })()}

                  {/* Urgent Badge */}
                  {(() => {
                    if (!allRequests) return null;
                    const urgentCount = allRequests.filter(i => i.isUrgent).length;
                    const totalCount = allRequests.length;
                    if (urgentCount === 0) return null;
                    return (
                      <Badge variant="destructive" className="animate-pulse shadow-sm">
                        <AlertCircle className="h-3 w-3 mr-1" /> {urgentCount}/{totalCount} Urgent
                      </Badge>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-background/50 hover:bg-destructive/10 hover:text-destructive border shadow-sm transition-all duration-200"
                  onClick={() => onOpenChange(false)}
                >
                  <XCircle className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Toolbar / Actions Bar */}
          <div className="px-6 py-2 flex items-center justify-between border-t bg-muted/20">
            <div className="flex items-center gap-2">
              {/* View toggle moved to Materials List header */}

              {/* Batch Selection Counter */}
              {selectedItemsForAction.size > 0 && (
                <div className="flex items-center gap-2 ml-4 animate-in fade-in slide-in-from-left-2">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                    {selectedItemsForAction.size} Selected
                  </span>
                  <Button variant="ghost" size="sm" onClick={deselectAll} className="h-7 text-xs hover:bg-destructive/10 hover:text-destructive">
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Select All Checkbox for Manager */}
              {isManager && (hasMultiplePendingItems || signPendingItems.length > 0) && (
                <div className="flex items-center gap-2 mr-4 border-r pr-4 h-5">
                  <Checkbox
                    id="select-all"
                    checked={
                      (pendingItems.length > 0 || signPendingItems.length > 0) &&
                      selectedItemsForAction.size === (pendingItems.length + signPendingItems.length)
                    }
                    onCheckedChange={(checked) => {
                      if (checked) selectAllPending();
                      else deselectAll();
                    }}
                  />
                  <Label htmlFor="select-all" className="text-xs cursor-pointer font-medium">
                    Select All Pending
                  </Label>
                </div>
              )}
              {["sign_pending", "sign_rejected", "ordered", "pending_po"].includes(overallStatus || request.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-7 text-xs"
                  onClick={() => setPdfPreviewPoNumber(request.requestNumber)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  View PDF
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/20">
              <div className="space-y-6 max-w-full">
                {/* Basic Information - Simple Mobile Layout */}
                {isMobileLayout ? (
                  // Mobile-first simple layout for site engineers
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Site Location</Label>
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
                      <Label className="text-sm font-semibold text-muted-foreground">Created By</Label>
                      {request.creator ? (
                        <button
                          onClick={() => setSelectedUserId(request.creator!._id)}
                          className="font-semibold text-lg text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-3 py-2 -mx-3 -my-2 transition-colors cursor-pointer text-left w-full truncate"
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
                      <Label className="text-sm font-semibold text-muted-foreground">Requested By</Label>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-1">
                    {/* 1. Site Info */}
                    <div className="flex flex-col gap-1.5 border-r border-border/40 pr-4 last:border-0 md:last:border-0 lg:last:border-0">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Site Location
                      </Label>
                      <div className="flex flex-col">
                        {request.site ? (
                          <>
                            <button
                              onClick={() => setSelectedSiteId(request.site!._id)}
                              className="font-bold text-base text-foreground hover:text-primary transition-colors text-left flex items-center gap-1"
                            >
                              {request.site.name}
                            </button>
                            {request.site.address && (
                              <div className="flex items-start gap-1 mt-0.5 group">
                                <span className="text-sm text-muted-foreground line-clamp-2 leading-snug" title={request.site.address}>
                                  {request.site.address}
                                </span>
                                <button
                                  onClick={() => handleOpenInMap(request.site!.address!)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary/80"
                                  title="Open in Maps"
                                >
                                  <MapPin className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Created By Info */}
                    <div className="flex flex-col gap-1.5 border-r border-border/40 pr-4 last:border-0 md:last:border-0 lg:last:border-0">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Created By
                      </Label>
                      <div className="flex flex-col">
                        {request.creator ? (
                          <button
                            onClick={() => setSelectedUserId(request.creator!._id)}
                            className="font-bold text-base text-foreground hover:text-primary transition-colors text-left"
                          >
                            {request.creator.fullName}
                          </button>
                        ) : (
                          <span className="text-muted-foreground font-medium">—</span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(request.createdAt), "dd MMM yyyy, hh:mm a")}
                        </span>
                      </div>
                    </div>

                    {/* 3. Requested By Date */}
                    <div className="flex flex-col gap-1.5 border-r border-border/40 pr-4 last:border-0 md:last:border-0 lg:last:border-0">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Requested By
                      </Label>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-base text-foreground">
                          {format(new Date(request.requiredBy), "dd MMM yyyy")}
                        </span>
                        {(() => {
                          const daysLeft = Math.ceil((new Date(request.requiredBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          const isUrgent = daysLeft <= 2;
                          return (
                            <Badge
                              variant={isUrgent ? "destructive" : "secondary"}
                              className={cn("w-fit px-2 py-0 h-5 text-[10px] font-medium rounded-full", !isUrgent && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}
                            >
                              {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? "Due Today" : `${daysLeft} days left`}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 4. Summary Stats */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" /> Summary
                      </Label>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-foreground">
                            {allRequests?.length || 1} Total Items
                          </span>
                        </div>
                        {(pendingItems.length > 0) && (
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-500">
                            {pendingItems.length} Pending Approval
                          </span>
                        )}
                        {(signPendingItems.length > 0) && (
                          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                            {signPendingItems.length} Sign Pending
                          </span>
                        )}
                      </div>
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground font-bold">
                      {isMobileLayout ? "Materials List" : (
                        allRequests && allRequests.length > 1
                          ? `Items (${allRequests.length})`
                          : "Item Details"
                      )}
                    </Label>
                    {allRequests && allRequests.length > 0 && (
                      <div className="flex items-center ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewMode(viewMode === "table" ? "card" : "table")}
                          className="h-7 px-3 text-xs font-medium border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
                        >
                          {viewMode === "table" ? (
                            <>
                              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Grid View
                            </>
                          ) : (
                            <>
                              <List className="h-3.5 w-3.5 mr-1.5" /> Table View
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>


                  {/* Display all items - Conditional Layout */}
                  {allRequests && allRequests.length > 0 ? (
                    viewMode === "table" ? (
                      <div className="border rounded-xl bg-card shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                              <TableHead className="w-[40px] text-center p-2"></TableHead>
                              <TableHead className="w-[50px] text-center p-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">#</TableHead>
                              <TableHead className="min-w-[300px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Item Details</TableHead>
                              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Quantity</TableHead>
                              <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                              {isManager && (pendingItems.length > 0 || signPendingItems.length > 0) ? (
                                <TableHead className="min-w-[300px] text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                              ) : (
                                <TableHead className="hidden"></TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
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
                                  <Fragment key={item._id}>
                                    <TableRow
                                      className={cn(
                                        "cursor-pointer transition-all border-b border-slate-200 dark:border-slate-700 hover:shadow-sm relative",
                                        // 1. Draft
                                        item.status === "draft" && "bg-slate-50/30 hover:bg-slate-50/60 dark:bg-slate-900/10",
                                        // 2. Pending
                                        (item.status === "pending" || item.status === "sign_pending") && "bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-900/10",
                                        // 3. Approved
                                        (["approved", "cc_pending", "ready_for_cc", "cc_approved", "pending_po", "ready_for_po", "ordered", "partially_processed", "direct_po", "ready_for_delivery", "recheck", "recheck_requested"].includes(item.status)) && "bg-blue-50/20 hover:bg-blue-50/40 dark:bg-blue-900/10",
                                        // 4. Out for Delivery
                                        (["delivery_processing", "delivery_stage", "out_for_delivery"].includes(item.status)) && "bg-orange-50/20 hover:bg-orange-50/40 dark:bg-orange-900/10",
                                        // 5. Delivered
                                        item.status === "delivered" && "bg-emerald-50/20 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
                                        // 6. Rejected
                                        (["rejected", "sign_rejected", "cc_rejected", "po_rejected"].includes(item.status)) && "bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-900/10"
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* Selection Checkbox (First col for manager) or Empty - WITH STATUS INDICATOR */}
                                      <TableCell className="p-2 text-center w-[40px] relative overflow-hidden">
                                        <div className={cn(
                                          "absolute left-0 top-[1px] bottom-[1px] w-[4px]",
                                          item.status === "draft" && "bg-slate-400",
                                          (item.status === "pending" || item.status === "sign_pending") && "bg-amber-400",
                                          (["approved", "cc_pending", "ready_for_cc", "cc_approved", "pending_po", "ready_for_po", "ordered", "partially_processed", "direct_po", "ready_for_delivery", "recheck", "recheck_requested"].includes(item.status)) && "bg-blue-500",
                                          (["delivery_processing", "delivery_stage", "out_for_delivery"].includes(item.status)) && "bg-orange-500",
                                          item.status === "delivered" && "bg-emerald-500",
                                          (["rejected", "sign_rejected", "cc_rejected", "po_rejected"].includes(item.status)) && "bg-rose-500"
                                        )} />
                                        {isPending && isManager && (
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleItemSelection(item._id)}
                                            className="h-4 w-4"
                                          />
                                        )}
                                      </TableCell>

                                      <TableCell className="p-2 text-center">
                                        <div className="inline-flex items-center justify-center w-9 h-7 rounded-md bg-muted/40 border border-border/40 shadow-sm">
                                          <span className="text-xs font-bold text-muted-foreground">
                                            {String(displayNumber).padStart(2, '0')}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-3">
                                        <div className="flex items-start gap-4">
                                          <div className="flex-shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                            {itemPhotos.length > 0 ? (
                                              <CompactImageGallery
                                                images={itemPhotos}
                                                maxDisplay={1}
                                                size="sm"
                                              />
                                            ) : (
                                              <div className="w-10 h-10 rounded-md bg-muted/30 border border-dashed border-border/60 flex items-center justify-center">
                                                <span className="text-[8px] font-medium text-muted-foreground/60 italic">No Img</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="space-y-1.5 min-w-0">
                                            <div className="flex items-start gap-2">
                                              <span className="bg-primary/10 text-primary text-[10px] font-black font-mono px-1.5 py-0.5 rounded border border-primary/20 shadow-sm shrink-0 mt-0.5">
                                                #{idx + 1}
                                              </span>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedItemName(item.itemName);
                                                }}
                                                className="font-semibold text-base text-left hover:text-primary transition-colors focus:outline-none leading-tight"
                                              >
                                                {item.itemName}
                                              </button>
                                            </div>
                                            {item.description ? (
                                              <div className="w-full text-sm text-muted-foreground mt-0.5">
                                                <ExpandableText text={item.description} className="text-sm text-muted-foreground" limit={60} />
                                              </div>
                                            ) : (
                                              <p className="text-xs text-muted-foreground/50 italic">No description</p>
                                            )}
                                            {item.specsBrand && (
                                              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                                {item.specsBrand}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-3 align-top">
                                        <div className="flex flex-col gap-1.5 items-start">
                                          <Badge variant="secondary" className="text-sm font-semibold">
                                            {item.quantity} <span className="text-xs font-normal ml-1 opacity-70">{item.unit}</span>
                                          </Badge>
                                          <div onClick={(e) => e.stopPropagation()} className="scale-90 origin-left">
                                            {getInventoryStatusBadge(item.itemName, item.quantity, item.unit)}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-3 align-top">
                                        <div className="flex flex-col gap-1.5 items-start">
                                          {item.isUrgent && (
                                            <Badge variant="destructive" className="px-2 py-0.5 h-6 text-[10px] font-bold shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse mb-1.5 uppercase tracking-wider border-red-400 ring-1 ring-red-500/50">
                                              Urgent
                                            </Badge>
                                          )}
                                          {getStatusBadge(item.status)}
                                        </div>
                                      </TableCell>
                                      {(isManager && (isPending || item.status === "sign_pending" || item.status === "cc_pending")) || (isPurchaseOfficer && item.status === "pending_po") ? (
                                        <TableCell className="text-right p-2 align-middle">
                                          <div className="flex items-center justify-end gap-2">
                                            {item.status === "sign_pending" || item.status === "sign_rejected" ? (
                                              <>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                  title="Approve"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowSignPendingApproveConfirm(item._id);
                                                  }}
                                                  disabled={isLoading}
                                                >
                                                  <CheckCircle className="h-4 w-4 mr-1.5" />
                                                  Approve
                                                </Button>
                                                {item.status === "sign_pending" && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    title="Reject"
                                                    onClick={(e) => { e.stopPropagation(); setShowItemRejectionInput(item._id); }}
                                                    disabled={isLoading}
                                                  >
                                                    <XCircle className="h-4 w-4 mr-1.5" />
                                                    Reject
                                                  </Button>
                                                )}
                                              </>
                                            ) : item.status === "cc_pending" ? (
                                              onOpenCC ? (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenCC(item._id);
                                                  }}
                                                  className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                                  title="View CC"
                                                >
                                                  <FileText className="h-4 w-4 mr-1.5" />
                                                  View CC
                                                </Button>
                                              ) : null
                                            ) : (
                                              // Intent Toggles Only - Actions moved to Footer
                                              <>
                                                {(() => {
                                                  const status = inventoryStatus?.[item.itemName];
                                                  const stock = status?.centralStock || 0;
                                                  const isPartial = stock > 0 && stock < item.quantity;
                                                  // const isFull = stock >= item.quantity; // Not directly used in new logic

                                                  // Check if intents are selected
                                                  const isDirectDeliverySelected = itemIntents[item._id]?.includes("direct_delivery");
                                                  const isDirectPOSelected = itemIntents[item._id]?.includes("direct_po");
                                                  const isSplitSelected = itemIntents[item._id]?.includes("split");

                                                  return (
                                                    <div className="flex items-center gap-3">
                                                      {/* Direct Delivery Checkbox */}
                                                      {stock > 0 && !isPartial && (
                                                        <div
                                                          onClick={(e) => { e.stopPropagation(); toggleIntent(item._id, "direct_delivery"); }}
                                                          className={cn(
                                                            "flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-all select-none",
                                                            isDirectDeliverySelected
                                                              ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                                                              : "bg-transparent border-purple-200 text-purple-700 hover:bg-purple-50"
                                                          )}
                                                        >
                                                          <div className={cn(
                                                            "h-3.5 w-3.5 rounded-sm border flex items-center justify-center bg-white",
                                                            isDirectDeliverySelected ? "border-white" : "border-purple-300"
                                                          )}>
                                                            {isDirectDeliverySelected && <Check className="h-2.5 w-2.5 text-purple-600" />}
                                                          </div>
                                                          <span className="text-[11px] font-bold uppercase tracking-tight">Direct Delivery</span>
                                                        </div>
                                                      )}

                                                      {/* Split Checkbox */}
                                                      {isPartial && (
                                                        <div
                                                          onClick={(e) => { e.stopPropagation(); toggleIntent(item._id, "split"); }}
                                                          className={cn(
                                                            "flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-all select-none",
                                                            isSplitSelected
                                                              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                              : "bg-transparent border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                          )}
                                                        >
                                                          <div className={cn(
                                                            "h-3.5 w-3.5 rounded-sm border flex items-center justify-center bg-white",
                                                            isSplitSelected ? "border-white" : "border-indigo-300"
                                                          )}>
                                                            {isSplitSelected && <Check className="h-2.5 w-2.5 text-indigo-600" />}
                                                          </div>
                                                          <span className="text-[11px] font-bold uppercase tracking-tight">Split</span>
                                                        </div>
                                                      )}

                                                      {/* Direct PO Checkbox - Always or when no full stock */}
                                                      <div
                                                        onClick={(e) => { e.stopPropagation(); toggleIntent(item._id, "direct_po"); }}
                                                        className={cn(
                                                          "flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-all select-none",
                                                          isDirectPOSelected
                                                            ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                                                            : "bg-transparent border-orange-200 text-orange-700 hover:bg-orange-50"
                                                        )}
                                                      >
                                                        <div className={cn(
                                                          "h-3.5 w-3.5 rounded-sm border flex items-center justify-center bg-white",
                                                          isDirectPOSelected ? "border-white" : "border-orange-300"
                                                        )}>
                                                          {isDirectPOSelected && <Check className="h-2.5 w-2.5 text-orange-600" />}
                                                        </div>
                                                        <span className="text-[11px] font-bold uppercase tracking-tight">Direct PO</span>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                                {isPurchaseOfficer && item.status === "pending_po" && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                                    title="Edit Quantity"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditQuantityItem({
                                                        id: item._id,
                                                        quantity: item.quantity,
                                                        name: item.itemName,
                                                        unit: item.unit
                                                      });
                                                    }}
                                                  >
                                                    <Edit className="h-4 w-4 mr-1.5" />
                                                    Edit Qty
                                                  </Button>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </TableCell>
                                      ) : (
                                        <TableCell className="hidden"></TableCell>
                                      )}
                                    </TableRow>
                                    {
                                      showItemRejectionInput === item._id && (
                                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                                          <TableCell colSpan={6} className="p-3">
                                            <div className="flex flex-col gap-2 max-w-md ml-auto bg-card border rounded-md p-3 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                              <Label className="text-xs font-semibold">Rejection Reason</Label>
                                              <Textarea
                                                value={itemRejectionReasons[item._id] || ""}
                                                onChange={(e) =>
                                                  setItemRejectionReasons((prev) => ({
                                                    ...prev,
                                                    [item._id]: e.target.value,
                                                  }))
                                                }
                                                placeholder="Enter rejection reason..."
                                                className="text-xs min-h-[60px]"
                                              />
                                              <div className="flex justify-end gap-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => setShowItemRejectionInput(null)}
                                                  className="h-7 text-xs"
                                                >
                                                  Cancel
                                                </Button>
                                                <Button
                                                  variant="destructive"
                                                  size="sm"
                                                  onClick={() => handleItemReject(item._id)}
                                                  disabled={isLoading || !itemRejectionReasons[item._id]?.trim()}
                                                  className="h-7 text-xs"
                                                >
                                                  Confirm Reject
                                                </Button>
                                              </div>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )
                                    }
                                  </Fragment>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
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
                                  "group relative flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20",
                                  item.status === "approved" && "border-green-200 bg-green-50/10 dark:border-green-800 dark:bg-green-950/5",
                                  item.status === "rejected" && "border-red-200 bg-red-50/10 dark:border-red-800 dark:bg-red-950/5",
                                  isSelected && "ring-2 ring-primary border-primary"
                                )}
                              >
                                {/* Selection Checkbox */}
                                {isPending && isManager && (
                                  <div className="absolute top-2 right-2 z-10">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleItemSelection(item._id)}
                                      className="h-5 w-5 bg-background shadow-sm border-2 data-[state=checked]:border-primary"
                                    />
                                  </div>
                                )}

                                {/* Top Section: Image & Basic Info */}
                                <div className="p-4 flex gap-5 border-b border-border/40 bg-muted/10 items-start min-h-[120px]">
                                  {/* Image Container - Fixed Width */}
                                  <div className="flex-shrink-0 relative w-[80px]">
                                    <div className="w-full aspect-square rounded-md overflow-hidden bg-background ring-1 ring-border/50 flex items-center justify-center">
                                      {itemPhotos.length > 0 ? (
                                        <CompactImageGallery
                                          images={itemPhotos}
                                          maxDisplay={1}
                                          size="xl"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center opacity-20">
                                          <ImageIcon className="h-6 w-6 mb-1" />
                                          <span className="text-[8px] font-bold uppercase tracking-widest">No Image</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="absolute -top-3 -left-2 bg-background shadow-sm border px-2 py-0.5 rounded-md z-10 w-max pointer-events-none ring-1 ring-black/5">
                                      <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-foreground/70">
                                        Item {String(displayNumber).padStart(2, '0')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Content Container */}
                                  <div className="min-w-0 flex-1 flex flex-col justify-between h-full space-y-3 pt-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <h4
                                        className="font-bold text-lg leading-snug text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItemName(item.itemName);
                                        }}
                                        title={item.itemName}
                                      >
                                        {item.itemName}
                                      </h4>
                                    </div>
                                    <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-md border border-transparent hover:border-border/30 transition-colors">
                                      <ExpandableText text={item.description || "No description available."} className="text-xs text-muted-foreground" limit={60} />
                                    </div>
                                  </div>
                                </div>

                                {/* Info Row */}
                                <div className="p-3 flex items-center justify-between gap-3 bg-card/50">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">Quantity</span>
                                    <Badge variant="secondary" className="h-6 font-semibold px-2">
                                      {item.quantity} <span className="opacity-70 font-normal ml-1">{item.unit}</span>
                                    </Badge>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {item.isUrgent && <Badge variant="destructive" className="h-4 text-[10px] px-1 py-0 uppercase tracking-wider">Urgent</Badge>}
                                    {getStatusBadge(item.status)}
                                  </div>
                                </div>

                                {/* Status / Inventory */}
                                <div className="px-3 pb-3">
                                  <div className="w-full">
                                    {getInventoryStatusBadge(item.itemName, item.quantity, item.unit)}
                                  </div>
                                </div>


                                {/* Item Details Grid */}





                                {/* Actions Footer for Cards */}
                                {isManager && (isPending || item.status === "sign_pending" || item.status === "sign_rejected" || item.status === "cc_pending") && (
                                  <div className="p-2 grid grid-cols-2 gap-2 border-t bg-muted/10">
                                    {item.status === "sign_pending" || item.status === "sign_rejected" ? (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                          title="Approve"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowSignPendingApproveConfirm(item._id);
                                          }}
                                          disabled={isLoading}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1.5" />
                                          Approve
                                        </Button>
                                        {item.status === "sign_pending" && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                                            title="Reject"
                                            onClick={(e) => { e.stopPropagation(); setShowItemRejectionInput(item._id); }}
                                            disabled={isLoading}
                                          >
                                            <XCircle className="h-4 w-4 mr-1.5" />
                                            Reject
                                          </Button>
                                        )}
                                      </>
                                    ) : item.status === "cc_pending" ? (
                                      onOpenCC ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenCC(item._id);
                                          }}
                                          className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                                          title="View CC"
                                        >
                                          <FileText className="h-4 w-4 mr-1.5" />
                                          View CC
                                        </Button>
                                      ) : null
                                    ) : (
                                      <>
                                        {(() => {
                                          const status = inventoryStatus?.[item.itemName];
                                          const stock = status?.centralStock || 0;
                                          const isPartial = stock > 0 && stock < item.quantity;
                                          // Check if intents are selected
                                          const isDirectDeliverySelected = itemIntents[item._id]?.includes("direct_delivery");
                                          const isDirectPOSelected = itemIntents[item._id]?.includes("direct_po");
                                          const isSplitSelected = itemIntents[item._id]?.includes("split");

                                          return (
                                            <div className="flex flex-wrap gap-2">
                                              {/* Direct Delivery Checkbox */}
                                              {stock > 0 && !isPartial && (
                                                <div
                                                  onClick={(e) => { e.stopPropagation(); toggleIntent(item._id, "direct_delivery"); }}
                                                  className={cn(
                                                    "flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-all select-none",
                                                    isDirectDeliverySelected
                                                      ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                                                      : "bg-transparent border-purple-200 text-purple-700 hover:bg-purple-50"
                                                  )}
                                                >
                                                  <div className={cn(
                                                    "h-3.5 w-3.5 rounded-sm border flex items-center justify-center bg-white",
                                                    isDirectDeliverySelected ? "border-white" : "border-purple-300"
                                                  )}>
                                                    {isDirectDeliverySelected && <Check className="h-2.5 w-2.5 text-purple-600" />}
                                                  </div>
                                                  <span className="text-[10px] font-bold uppercase tracking-tight">Direct Delivery</span>
                                                </div>
                                              )}

                                              {/* Split Checkbox */}
                                              {isPartial && (
                                                <div
                                                  onClick={(e) => { e.stopPropagation(); toggleIntent(item._id, "split"); }}
                                                  className={cn(
                                                    "flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-all select-none",
                                                    isSplitSelected
                                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                      : "bg-transparent border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                  )}
                                                >
                                                  <div className={cn(
                                                    "h-3.5 w-3.5 rounded-sm border flex items-center justify-center bg-white",
                                                    isSplitSelected ? "border-white" : "border-indigo-300"
                                                  )}>
                                                    {isSplitSelected && <Check className="h-2.5 w-2.5 text-indigo-600" />}
                                                  </div>
                                                  <span className="text-[10px] font-bold uppercase tracking-tight">Split</span>
                                                </div>
                                              )}

                                              {/* Direct PO Checkbox */}
                                              <div
                                                onClick={(e) => { e.stopPropagation(); toggleIntent(item._id, "direct_po"); }}
                                                className={cn(
                                                  "flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-all select-none",
                                                  isDirectPOSelected
                                                    ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                                                    : "bg-transparent border-orange-200 text-orange-700 hover:bg-orange-50"
                                                )}
                                              >
                                                <div className={cn(
                                                  "h-3.5 w-3.5 rounded-sm border flex items-center justify-center bg-white",
                                                  isDirectPOSelected ? "border-white" : "border-orange-300"
                                                )}>
                                                  {isDirectPOSelected && <Check className="h-2.5 w-2.5 text-orange-600" />}
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-tight">Direct PO</span>
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Actions moved to footer */}
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* Rejection Input Overlay */}
                                {showItemRejectionInput === item._id && (
                                  <div className="absolute inset-0 z-20 bg-background/95 p-4 flex flex-col justify-center rounded-xl animate-in fade-in zoom-in-95">
                                    <Label className="mb-2 font-semibold">Rejection Reason</Label>
                                    <Textarea
                                      value={itemRejectionReasons[item._id] || ""}
                                      onChange={(e) => setItemRejectionReasons((prev) => ({ ...prev, [item._id]: e.target.value }))}
                                      placeholder="Reason..."
                                      className="mb-2 flex-1 min-h-[80px]"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" onClick={() => setShowItemRejectionInput(null)} className="flex-1">Cancel</Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleItemReject(item._id)} className="flex-1">Reject</Button>
                                    </div>
                                  </div>
                                )}
                              </div>

                            );
                          })}
                      </div>
                    )
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
                      {allRequests && allRequests.filter(item => (item.status === "rejected" || item.status === "sign_rejected") && item.rejectionReason).length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-destructive">Rejection Reasons</Label>
                          {allRequests
                            .filter(item => (item.status === "rejected" || item.status === "sign_rejected") && item.rejectionReason)
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
                      {request.rejectionReason && (!allRequests || allRequests.filter(item => item.status === "rejected" || item.status === "sign_rejected").length === 0) && (
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
                                  Mark {selectedItemsForAction.size > 0 ? selectedItemsForAction.size : 'all'} items for Direct PO? This will bypass Cost Comparison as no stock is available.
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
                                    toast.success(`${itemsToProcess.length} items marked for Direct PO`);
                                  } catch (error: any) {
                                    toast.error(error.message || "Failed to process Ready for CC");
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
                                  Check & Approve Splits for {selectedItemsForAction.size > 0 ? selectedItemsForAction.size : 'All'} Items?
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
                                  Create a Direct PO for this item? This will bypass Cost Comparison as no stock is available.
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
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 transform transition-all scale-100">
                          <div className="flex flex-col items-center text-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center ring-8 ring-red-50 dark:ring-red-900/10">
                              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Confirm Rejection
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] mx-auto leading-relaxed">
                                Reject {selectedItemsForAction.size > 0
                                  ? `${selectedItemsForAction.size} item(s)`
                                  : `all ${signPendingItems.length + pendingItems.length} item(s)`}?
                              </p>
                            </div>
                          </div>

                          <div className="mb-6">
                            <Label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block text-left">
                              Rejection Reason <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Explain why this is being rejected..."
                              rows={3}
                              className="w-full resize-none border-gray-200 focus:ring-red-500 focus:border-red-500 dark:border-gray-700 dark:bg-gray-800"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowRejectionInput(false);
                                setRejectionReason("");
                              }}
                              className="w-full h-11 font-medium border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={async () => {
                                // 1. Single Item Rejection (passed via ID)
                                if (typeof showRejectionInput === 'string') {
                                  const requestId = showRejectionInput as Id<"requests">;
                                  const item = allRequests?.find(r => r._id === requestId);
                                  if (item?.status === "sign_pending") {
                                    await handleSingleRejectDirectPO(requestId, rejectionReason);
                                  } else {
                                    await handleItemReject(requestId);
                                  }
                                  return;
                                }

                                // 2. Bulk Rejection
                                const itemsToProcess = selectedItemsForAction.size > 0
                                  ? Array.from(selectedItemsForAction)
                                  : [...signPendingItems.map(item => item._id), ...pendingItems.map(item => item._id)];

                                setShowRejectionInput(false);

                                // Separate items by status to use correct mutations
                                const directPOIds: Id<"requests">[] = [];
                                const standardIds: Id<"requests">[] = [];

                                itemsToProcess.forEach(id => {
                                  const item = allRequests?.find(r => r._id === id);
                                  if (item?.status === "sign_pending" || item?.status === "sign_rejected") {
                                    directPOIds.push(id);
                                  } else {
                                    standardIds.push(id);
                                  }
                                });

                                setIsLoading(true);
                                try {
                                  const promises = [];

                                  if (directPOIds.length > 0) {
                                    promises.push(Promise.all(directPOIds.map(id =>
                                      rejectDirectPO({ requestId: id, reason: rejectionReason.trim() })
                                    )));
                                  }

                                  if (standardIds.length > 0) {
                                    promises.push(bulkUpdateStatus({
                                      requestIds: standardIds,
                                      status: "rejected",
                                      rejectionReason: rejectionReason.trim(),
                                    }));
                                  }

                                  await Promise.all(promises);
                                  toast.success(`${itemsToProcess.length} items rejected`);
                                  setRejectionReason("");
                                  setSelectedItemsForAction(new Set());
                                  closeAndRefresh();
                                } catch (error: any) {
                                  toast.error(error.message || "Failed to reject items");
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              disabled={!rejectionReason.trim() || isLoading}
                              className="w-full h-11 font-medium bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02]"
                            >
                              {isLoading ? "Processing..." : "Reject All"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                  </>
                )}
              </div>

            </div>
          </div>

          {/* Footer - Sticky */}
          <DialogFooter className="px-3 sm:px-6 py-3 sm:py-4 border-t bg-muted/30">
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
              <div className="text-xs text-muted-foreground text-center sm:text-left order-2 sm:order-1">
                {pendingItems.length > 0 && (
                  <span>{pendingItems.length} item{pendingItems.length > 1 ? 's' : ''} pending review</span>
                )}
              </div>

              {(canReject || canApprove) && (
                <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                  {canReject && (
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none border-red-500 text-red-600 hover:bg-red-50 font-bold h-10 px-6"
                      onClick={() => setShowRejectionInput(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {selectedItemsForAction.size > 0
                        ? `Reject (${selectedItemsForAction.size})`
                        : "Reject All"}
                    </Button>
                  )}
                  {canApprove && (
                    <Button
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6"
                      onClick={() => setShowSignPendingApproveConfirm(true)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {selectedItemsForAction.size > 0
                        ? `Approve (${selectedItemsForAction.size})`
                        : "Approve All"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Site Info Dialog */}
      <LocationInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        locationId={selectedSiteId}
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

      {/* Sign Pending Approval Confirmation (Single & Bulk) - Rendered in Portal at body level */}
      {
        showSignPendingApproveConfirm && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => {
              // Close when clicking backdrop only
              if (e.target === e.currentTarget) {
                e.stopPropagation();
                setShowSignPendingApproveConfirm(null);
              }
            }}
          >
            <div
              className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center ring-8 ring-green-50 dark:ring-green-900/10">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {typeof showSignPendingApproveConfirm === 'string' ? 'Approve Direct PO' : 'Batch Approval'}
                  </h3>
                  <p className="text-base text-gray-500 dark:text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                    {typeof showSignPendingApproveConfirm === 'string'
                      ? "Are you sure you want to approve this Direct PO?"
                      : <>You are about to <span className="font-bold text-emerald-600 dark:text-emerald-400">approve</span> {selectedItemsForAction.size > 0 ? selectedItemsForAction.size : (signPendingItems.length + pendingItems.length)} item(s).</>
                    }
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowSignPendingApproveConfirm(null);
                  }}
                  className="w-full h-12 font-bold border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white transition-all shadow-sm"
                  style={{ pointerEvents: 'auto' }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (typeof showSignPendingApproveConfirm === 'string') {
                      handleSingleApproveDirectPO(showSignPendingApproveConfirm as Id<"requests">);
                    } else {
                      handleApproveAll();
                    }
                  }}
                  disabled={isLoading}
                  className={cn(
                    "w-full h-12 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                    signPendingItems.length > 0
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-orange-500/20"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20"
                  )}
                  style={{ pointerEvents: 'auto' }}
                >
                  {isLoading ? "Processing..." : (typeof showSignPendingApproveConfirm === 'string' ? "Confirm Approve" : "Approve All")}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )
      }


      {/* Edit PO Quantity Dialog */}
      <EditPOQuantityDialog
        open={!!editQuantityItem}
        onOpenChange={(open) => !open && setEditQuantityItem(null)}
        requestId={editQuantityItem?.id || null}
        currentQuantity={editQuantityItem?.quantity || 0}
        itemName={editQuantityItem?.name || ""}
        unit={editQuantityItem?.unit || ""}
        onSuccess={() => {
          setEditQuantityItem(null);
          // Data will refresh automatically via Convex reactivity
        }}
      />

    </div >
  );
}
