"use client";

/**
 * Request Details Dialog Component
 * 
 * Shows full request details with photo display.
 * Managers can approve/reject requests.
 * Site Engineers can mark delivery.
 */

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, XCircle, Package, ShoppingCart } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { toast } from "sonner";
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
  const markDelivery = useMutation(api.requests.markDelivery);

  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  const isManager = userRole === ROLES.MANAGER;
  const isSiteEngineer = userRole === ROLES.SITE_ENGINEER;
  const canApprove = isManager && request?.status === "pending";
  const canReject = isManager && request?.status === "pending";
  const canMarkDelivery =
    isSiteEngineer && request?.status === "delivery_stage" && request?.createdBy;

  const handleApprove = async () => {
    if (!requestId) return;

    setIsLoading(true);
    try {
      await updateStatus({
        requestId,
        status: "approved",
      });
      toast.success("Request approved successfully");
      onOpenChange(false);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-12">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                Request Number: {request.requestNumber}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(request.status)}
              {request.isUrgent && (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3" />
                  Urgent
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Site Location</Label>
              <p className="font-medium">
                {request.site?.name || "—"}
                {request.site?.code && ` (${request.site.code})`}
              </p>
              {request.site?.address && (
                <p className="text-sm text-muted-foreground">
                  {request.site.address}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Created By</Label>
              <p className="font-medium">
                {request.creator?.fullName || "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(request.createdAt), "dd/MM/yyyy hh:mm a")}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Required By</Label>
              <p className="font-medium">
                {format(new Date(request.requiredBy), "dd/MM/yyyy")}
              </p>
            </div>
          </div>

          <Separator />

          {/* All Items Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-base font-semibold">
                {allRequests && allRequests.length > 1 
                  ? `Items (${allRequests.length} items)` 
                  : "Item Details"}
              </Label>
            </div>
            
            {/* Display all items */}
            {allRequests && allRequests.length > 0 ? (
              <div className="space-y-4">
                {allRequests
                  .sort((a, b) => a.createdAt - b.createdAt)
                  .map((item, idx) => (
                  <div key={item._id} className="p-4 border rounded-lg bg-card space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs px-2 py-1">
                        Item {idx + 1}
                      </Badge>
                      {item.isUrgent && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                      {getStatusBadge(item.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Item Name</Label>
                        <p className="font-medium">{item.itemName}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Quantity</Label>
                        <p className="font-medium">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                    </div>
                    
                    {item.description && (
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="text-sm">{item.description}</p>
                      </div>
                    )}
                    
                    {item.specsBrand && (
                      <div>
                        <Label className="text-muted-foreground">Specs/Brand</Label>
                        <p className="text-sm font-medium">{item.specsBrand}</p>
                      </div>
                    )}
                    
                    {item.notes && (
                      <div>
                        <Label className="text-muted-foreground">Notes</Label>
                        <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                      </div>
                    )}
                    
                    {item.photo && (
                      <div>
                        <Label className="text-muted-foreground">Photo</Label>
                        <div className="mt-2">
                          <img
                            src={item.photo.imageUrl}
                            alt={`${item.itemName} photo`}
                            className="max-w-full h-auto rounded-md border max-h-64 object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                    {getStatusBadge(request.status)}
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

          {/* Actions */}
          {(canApprove || canReject || canMarkDelivery) && (
            <>
              <Separator />
              <div className="space-y-4">
                {showRejectionInput ? (
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
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isLoading || !rejectionReason.trim()}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Confirm Rejection
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
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {canApprove && (
                        <Button
                          onClick={handleApprove}
                          disabled={isLoading}
                          className="flex-1"
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
                          className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
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
                          className="flex-1"
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
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

