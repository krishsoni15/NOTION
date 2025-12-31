"use client";

/**
 * Request Details Dialog Component
 * 
 * Shows full request details with photo display.
 * Managers can approve/reject requests.
 * Site Engineers can mark delivery.
 */

import { useState, useRef, useEffect } from "react";
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
import { AlertCircle, CheckCircle, XCircle, Package, ShoppingCart, MapPin } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { ROLES } from "@/lib/auth/roles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserInfoDialog } from "./user-info-dialog";
import { ItemInfoDialog } from "./item-info-dialog";
import { SiteInfoDialog } from "./site-info-dialog";
import type { Id } from "@/convex/_generated/dataModel";

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: Id<"requests"> | null;
}

export function RequestDetailsDialog({
  open,
  onOpenChange,
  requestId,
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

  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [itemRejectionReasons, setItemRejectionReasons] = useState<Record<string, string>>({});
  const [showItemRejectionInput, setShowItemRejectionInput] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);
  const [selectedItemsForAction, setSelectedItemsForAction] = useState<Set<Id<"requests">>>(new Set());
  const hasRefreshedRef = useRef(false);

  const isManager = userRole === ROLES.MANAGER;
  const isSiteEngineer = userRole === ROLES.SITE_ENGINEER;
  const canApprove = isManager && request?.status === "pending";
  const canReject = isManager && request?.status === "pending";
  const canMarkDelivery =
    isSiteEngineer && request?.status === "delivery_stage" && request?.createdBy;

  // Simplified mobile-first layout for site engineers
  const isMobileLayout = isSiteEngineer;

  // Get pending items for manager actions
  const pendingItems = allRequests?.filter((item) => item.status === "pending") || [];
  const hasMultiplePendingItems = pendingItems.length > 1;

  // Check if all items in the request have the same status
  const allItemsHaveSameStatus = allRequests && allRequests.length > 0
    ? allRequests.every((item) => item.status === allRequests[0].status)
    : true;

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
      hasRefreshedRef.current = false;
    }
  }, [open]);

  // Refresh only once after successful action
  const refreshOnce = () => {
    if (!hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      window.location.reload();
    }
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
      refreshOnce();
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
      refreshOnce();
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
      refreshOnce();
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
      refreshOnce();
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
      refreshOnce();
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
      refreshOnce();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject items");
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
      refreshOnce();
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
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
                {allItemsHaveSameStatus && getStatusBadge(request.status)}
                {request.isUrgent && (
                  <Badge
                    variant="destructive"
                    className={cn(
                      "flex items-center gap-1.5",
                      isMobileLayout ? "px-2 py-1 text-xs" : "px-3 py-1.5"
                    )}
                  >
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    {isMobileLayout ? "URGENT" : "Urgent"}
                  </Badge>
                )}
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
                    {request.site?.code && (
                      <p className="text-sm text-muted-foreground font-mono">
                        Code: {request.site.code}
                      </p>
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

          <Separator />


          {/* Request Images Gallery */}
          {allPhotos.length > 0 && (
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

          {/* All Items Details */}
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

            {/* Display all items - Simple Mobile Layout for Site Engineers */}
            {allRequests && allRequests.length > 0 ? (
              isMobileLayout ? (
                // Simple list layout for mobile site engineers
                <div className="space-y-4">
                  {allRequests
                    .sort((a, b) => {
                      const orderA = a.itemOrder ?? a.createdAt;
                      const orderB = b.itemOrder ?? b.createdAt;
                      return orderA - orderB;
                    })
                    .map((item, idx) => {
                      const displayNumber = item.itemOrder ?? idx + 1;
                      return (
                        <div
                          key={item._id}
                          className="border rounded-lg p-4 bg-card space-y-3"
                        >
                          {/* Simple header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-sm px-3 py-1 font-semibold"
                              >
                                #{displayNumber}
                              </Badge>
                              {item.isUrgent && (
                                <Badge variant="destructive" className="text-sm px-2 py-1">
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  URGENT
                                </Badge>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(item.status)}
                            </div>
                          </div>

                          {/* Simple item details */}
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-sm font-semibold text-muted-foreground">Material</Label>
                              <button
                                onClick={() => setSelectedItemName(item.itemName)}
                                className="font-semibold text-lg text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-3 py-2 -mx-3 -my-2 transition-colors cursor-pointer text-left w-full block"
                              >
                                {item.itemName}
                              </button>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-sm font-semibold text-muted-foreground">How Many</Label>
                              <p className="font-semibold text-lg">
                                {item.quantity} <span className="text-muted-foreground font-normal text-base">{item.unit}</span>
                              </p>
                            </div>

                            {item.description && (
                              <div className="space-y-1">
                                <Label className="text-sm font-semibold text-muted-foreground">Details</Label>
                                <p className="text-base leading-relaxed">{item.description}</p>
                              </div>
                            )}

                            {item.specsBrand && (
                              <div className="space-y-1">
                                <Label className="text-sm font-semibold text-muted-foreground">Type/Model</Label>
                                <p className="text-base font-medium">{item.specsBrand}</p>
                              </div>
                            )}

                            {item.notes && (
                              <div className="space-y-1">
                                <Label className="text-sm font-semibold text-muted-foreground">Extra Info</Label>
                                <p className="text-base leading-relaxed text-muted-foreground">{item.notes}</p>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                // Original desktop grid layout for managers
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  {allRequests
                    .sort((a, b) => {
                      const orderA = a.itemOrder ?? a.createdAt;
                      const orderB = b.itemOrder ?? b.createdAt;
                      return orderA - orderB;
                    })
                    .map((item, idx) => {
                      const isPending = item.status === "pending";
                      const displayNumber = item.itemOrder ?? idx + 1;
                      const isSelected = selectedItemsForAction.has(item._id);
                      return (
                    <div
                      key={item._id}
                      className={cn(
                        "p-3 sm:p-4 lg:p-5 border-2 rounded-lg sm:rounded-xl bg-card shadow-sm hover:shadow-md transition-all duration-200 space-y-3 sm:space-y-4 flex flex-col h-full w-full min-w-0",
                        isPending && "border-dashed",
                        isSelected && "ring-2 ring-green-500 border-green-500"
                      )}
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between gap-2 sm:gap-3 pb-2 sm:pb-3 border-b">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1">
                          {isPending && (
                            <Checkbox
                              checked={selectedItemsForAction.has(item._id)}
                              onCheckedChange={() => toggleItemSelection(item._id)}
                              className="flex-shrink-0"
                            />
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 font-semibold flex-shrink-0"
                          >
                            Item {displayNumber}
                          </Badge>
                          {item.isUrgent && (
                            <Badge variant="destructive" className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 flex-shrink-0">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                          <div className="flex-shrink-0">
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                      </div>

                      {/* Item Content - Better Layout with flex-grow */}
                      <div className="space-y-2 sm:space-y-3 flex-1 flex flex-col min-w-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          <div className="space-y-1 min-w-0">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item Name</Label>
                            <button
                              onClick={() => setSelectedItemName(item.itemName)}
                              className="font-semibold text-sm break-words line-clamp-2 text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer text-left"
                            >
                              {item.itemName}
                            </button>
                          </div>
                          <div className="space-y-1 min-w-0">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantity</Label>
                            <p className="font-semibold text-sm break-words">
                              {item.quantity} <span className="text-muted-foreground font-normal">{item.unit}</span>
                            </p>
                          </div>
                        </div>

                        {item.description && (
                          <div className="space-y-1 flex-1 min-w-0">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</Label>
                            <p className="text-sm break-words whitespace-pre-wrap leading-relaxed line-clamp-3 sm:line-clamp-4">{item.description}</p>
                          </div>
                        )}

                        {item.specsBrand && (
                          <div className="space-y-1 min-w-0">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Specs/Brand</Label>
                            <p className="text-sm font-medium break-words line-clamp-2">{item.specsBrand}</p>
                          </div>
                        )}

                        {item.notes && (
                          <div className="space-y-1 min-w-0">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</Label>
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-muted-foreground line-clamp-2 sm:line-clamp-3">{item.notes}</p>
                          </div>
                        )}

                      </div>

                      {/* Per-item actions - Better Layout, Sticky to bottom */}
                      {isManager && isPending && (
                        <div className="pt-2 sm:pt-3 border-t mt-auto w-full">
                          {showItemRejectionInput === item._id ? (
                            <div className="space-y-2 w-full">
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
                                className="text-xs w-full"
                              />
                              <div className="flex gap-2 flex-wrap w-full">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleItemReject(item._id)}
                                  disabled={isLoading || !itemRejectionReasons[item._id]?.trim()}
                                  className="text-xs h-8 flex-1 min-w-[100px]"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowItemRejectionInput(null);
                                    setItemRejectionReasons((prev) => {
                                      const next = { ...prev };
                                      delete next[item._id];
                                      return next;
                                    });
                                  }}
                                  disabled={isLoading}
                                  className="text-xs h-8"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleItemApprove(item._id)}
                                disabled={isLoading}
                                className="text-xs h-8 sm:h-8 bg-green-600 hover:bg-green-700 w-full"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleItemDirectPO(item._id)}
                                disabled={isLoading}
                                className="text-xs h-8 sm:h-8 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 w-full"
                              >
                                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                                Direct PO
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowItemRejectionInput(item._id)}
                                disabled={isLoading}
                                className="text-xs h-8 sm:h-8 w-full"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
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
                    {allItemsHaveSameStatus && getStatusBadge(request.status)}
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
                {request.rejectionReason && (
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

          {/* Manager Actions - Keep Original */}
          {(canApprove || canReject) && !isMobileLayout && (
            <>
              <Separator />
              <div className="space-y-4">
                {/* Bulk Actions for Multiple Items */}
                {hasMultiplePendingItems && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">
                        Bulk Actions ({selectedItemsForAction.size > 0 ? `${selectedItemsForAction.size} selected` : `${pendingItems.length} pending items`})
                      </Label>
                      {pendingItems.length > 0 && (
                        <div className="flex gap-2">
                          {selectedItemsForAction.size === pendingItems.length ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={deselectAll}
                              disabled={isLoading}
                              className="text-xs h-7 px-2"
                            >
                              Deselect All
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectAllPending}
                              disabled={isLoading}
                              className="text-xs h-7 px-2"
                            >
                              Select All
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        onClick={handleApproveAll}
                        disabled={isLoading || pendingItems.length === 0}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="truncate">
                          Approve {selectedItemsForAction.size > 0 ? `(${selectedItemsForAction.size})` : `All`}
                        </span>
                      </Button>
                      <Button
                        onClick={handleDirectPOAll}
                        disabled={isLoading || pendingItems.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        <span className="truncate">
                          Direct PO {selectedItemsForAction.size > 0 ? `(${selectedItemsForAction.size})` : `All`}
                        </span>
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setShowRejectionInput(true)}
                        disabled={isLoading || pendingItems.length === 0}
                        className="w-full"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        <span className="truncate">
                          Reject {selectedItemsForAction.size > 0 ? `(${selectedItemsForAction.size})` : `All`}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Single Item Actions or Additional Actions */}
                {(!hasMultiplePendingItems || pendingItems.length === 0) && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {canApprove && (
                        <Button
                          onClick={handleApprove}
                          disabled={isLoading}
                          className="flex-1 min-w-[120px]"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Request
                        </Button>
                      )}
                      {canApprove && (
                        <Button
                          onClick={handleDirectPO}
                          disabled={isLoading}
                          variant="outline"
                          className="flex-1 min-w-[120px] border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Direct PO
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          variant="destructive"
                          onClick={() => setShowRejectionInput(true)}
                          disabled={isLoading}
                          className="flex-1 min-w-[120px]"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Request
                        </Button>
                      )}
                    </div>
                    {canMarkDelivery && (
                      <Button
                        onClick={handleMarkDelivery}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Mark as Delivered
                      </Button>
                    )}
                  </div>
                )}

                {/* Rejection Input */}
                {showRejectionInput && (
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">
                      Rejection Reason <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={3}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="destructive"
                        onClick={hasMultiplePendingItems ? handleRejectAll : handleReject}
                        disabled={isLoading || !rejectionReason.trim()}
                        className="flex-1 min-w-[120px]"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {hasMultiplePendingItems
                          ? `Reject All (${pendingItems.length})`
                          : "Confirm Rejection"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRejectionInput(false);
                          setRejectionReason("");
                        }}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
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
      </DialogContent>

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
      <SiteInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        siteId={selectedSiteId}
      />
    </Dialog>
  );
}

