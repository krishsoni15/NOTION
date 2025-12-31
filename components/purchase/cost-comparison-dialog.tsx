"use client";

/**
 * Cost Comparison Dialog Component
 * 
 * Dialog for creating/editing cost comparisons with multiple vendor quotes.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { X, Plus, Save, Send, AlertCircle, Package, CheckCircle } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";

interface CostComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: Id<"requests">;
}

interface VendorQuote {
  vendorId: Id<"vendors">;
  unitPrice: number;
}

export function CostComparisonDialog({
  open,
  onOpenChange,
  requestId,
}: CostComparisonDialogProps) {
  const [vendorQuotes, setVendorQuotes] = useState<VendorQuote[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<Id<"vendors"> | "">("");
  const [unitPrice, setUnitPrice] = useState("");
  const [isDirectDelivery, setIsDirectDelivery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  
  // Manager review state
  const [selectedFinalVendor, setSelectedFinalVendor] = useState<Id<"vendors"> | "">("");
  const [managerNotes, setManagerNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  
  const userRole = useUserRole();
  const isManager = userRole === ROLES.MANAGER;
  const reviewCC = useMutation(api.costComparisons.reviewCostComparison);

  const request = useQuery(
    api.requests.getRequestById,
    requestId ? { requestId } : "skip"
  );
  const vendors = useQuery(api.vendors.getAllVendors);
  const inventoryItems = useQuery(api.inventory.getAllInventoryItems);
  const existingCC = useQuery(
    api.costComparisons.getCostComparisonByRequestId,
    requestId ? { requestId } : "skip"
  );
  const upsertCC = useMutation(api.costComparisons.upsertCostComparison);
  const submitCC = useMutation(api.costComparisons.submitCostComparison);
  const resubmitCC = useMutation(api.costComparisons.resubmitCostComparison);

  // Check if item exists in inventory
  const itemInInventory = inventoryItems?.find(
    (item) => item.itemName.toLowerCase() === request?.itemName.toLowerCase()
  );

  // Load existing cost comparison
  useEffect(() => {
    if (existingCC && open) {
      setVendorQuotes(
        existingCC.vendorQuotes.map((q) => ({
          vendorId: q.vendorId,
          unitPrice: q.unitPrice,
        }))
      );
      setIsDirectDelivery(existingCC.isDirectDelivery);
      // Reset manager notes when opening
      if (isManager) {
        setManagerNotes("");
      }
    } else if (open && !existingCC) {
      // Reset when opening new
      setVendorQuotes([]);
      setIsDirectDelivery(false);
      if (isManager) {
        setManagerNotes("");
      }
    }
  }, [existingCC, open, isManager]);

  // Get vendor name by ID
  const getVendorName = (vendorId: Id<"vendors">) => {
    return vendors?.find((v) => v._id === vendorId)?.companyName || "Unknown";
  };

  // Add vendor quote
  const handleAddVendor = () => {
    if (!selectedVendorId || !unitPrice) {
      toast.error("Please select a vendor and enter unit price");
      return;
    }

    const price = parseFloat(unitPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid unit price");
      return;
    }

    if (vendorQuotes.some((q) => q.vendorId === selectedVendorId)) {
      toast.error("This vendor is already added");
      return;
    }

    setVendorQuotes([
      ...vendorQuotes,
      {
        vendorId: selectedVendorId as Id<"vendors">,
        unitPrice: price,
      },
    ]);

    setSelectedVendorId("");
    setUnitPrice("");
    setVendorDialogOpen(false);
  };

  // Remove vendor quote
  const handleRemoveVendor = (vendorId: Id<"vendors">) => {
    setVendorQuotes(vendorQuotes.filter((q) => q.vendorId !== vendorId));
  };

  // Save cost comparison
  const handleSave = async () => {
    if (vendorQuotes.length === 0) {
      toast.error("Please add at least one vendor quote");
      return;
    }

    setIsSaving(true);
    try {
      await upsertCC({
        requestId,
        vendorQuotes,
        isDirectDelivery,
      });
      toast.success("Cost comparison saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit for approval
  const handleSubmit = async () => {
    if (vendorQuotes.length === 0) {
      toast.error("Please add at least one vendor quote");
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingCC?.status === "cc_rejected") {
        await resubmitCC({
          requestId,
          vendorQuotes,
          isDirectDelivery,
        });
        toast.success("Cost comparison resubmitted");
      } else {
        await handleSave();
        await submitCC({ requestId });
        toast.success("Cost comparison submitted");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total
  const calculateTotal = (unitPrice: number) => {
    if (!request) return 0;
    return unitPrice * request.quantity;
  };

  const canEdit = existingCC?.status === "draft" || existingCC?.status === "cc_rejected" || !existingCC;
  const isSubmitted = existingCC?.status === "cc_pending";
  const isManagerReview = isManager && isSubmitted;
  
  // Load selected vendor if CC is approved (for manager view)
  useEffect(() => {
    if (existingCC?.selectedVendorId && open && isManager) {
      setSelectedFinalVendor(existingCC.selectedVendorId);
    } else if (open && isManager && !existingCC?.selectedVendorId) {
      setSelectedFinalVendor("");
    }
  }, [existingCC, open, isManager]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">Cost Comparison - {request?.requestNumber}</DialogTitle>
          <DialogDescription className="text-xs">
            {request?.itemName} • {request?.quantity} {request?.unit}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Inventory Alert */}
          {itemInInventory && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-xs">
              <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-blue-700 dark:text-blue-300">
                Item already in inventory - Direct Delivery available
              </span>
            </div>
          )}

          {/* Rejection Notes */}
          {existingCC?.status === "cc_rejected" && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-destructive">Rejected: </span>
                  <span className="text-muted-foreground">{existingCC.managerNotes || "No reason provided."}</span>
                </div>
              </div>
            </div>
          )}

          {/* Direct Delivery Option */}
          {itemInInventory && (
            <div className="flex items-center space-x-2 p-2 rounded-md bg-muted/50">
              <Checkbox
                id="directDelivery"
                checked={isDirectDelivery}
                onCheckedChange={(checked) => setIsDirectDelivery(checked === true)}
                disabled={!canEdit || isSubmitted}
                className="h-3 w-3"
              />
              <Label htmlFor="directDelivery" className="text-xs cursor-pointer text-muted-foreground">
                Direct Delivery (Item in inventory)
              </Label>
            </div>
          )}

          {/* Vendor Quotes */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {isManagerReview ? "Select Final Vendor" : "Vendor Quotes"}
            </Label>
            {vendorQuotes.length > 0 ? (
              isManagerReview ? (
                // Manager view: Radio buttons to select final vendor
                <RadioGroup
                  value={selectedFinalVendor}
                  onValueChange={(value) => setSelectedFinalVendor(value as Id<"vendors">)}
                  className="space-y-2"
                >
                  {vendorQuotes.map((quote) => (
                    <div
                      key={quote.vendorId}
                      className={`p-3 border rounded-lg ${
                        selectedFinalVendor === quote.vendorId
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem
                          value={quote.vendorId}
                          id={`vendor-${quote.vendorId}`}
                          className="mt-1"
                        />
                        <label
                          htmlFor={`vendor-${quote.vendorId}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div>
                            <p className="font-medium text-sm">{getVendorName(quote.vendorId)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ₹{quote.unitPrice.toFixed(2)}/unit • ₹{calculateTotal(quote.unitPrice).toFixed(2)} total
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                // Purchase Officer view: List with remove buttons
                <div className="border rounded-lg divide-y">
                  {vendorQuotes.map((quote) => (
                    <div key={quote.vendorId} className="p-2 flex items-center justify-between hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{getVendorName(quote.vendorId)}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{quote.unitPrice.toFixed(2)}/unit • ₹{calculateTotal(quote.unitPrice).toFixed(2)} total
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVendor(quote.vendorId)}
                          className="h-7 w-7 p-0 shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">
                No vendors added
              </p>
            )}

            {/* Add Vendor Dialog - Always render for accessibility */}
            <Dialog open={vendorDialogOpen && canEdit} onOpenChange={(open) => {
              if (canEdit) {
                setVendorDialogOpen(open);
              }
            }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Vendor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Vendor</Label>
                    <Select
                      value={selectedVendorId}
                      onValueChange={(value) => setSelectedVendorId(value as Id<"vendors">)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors
                          ?.filter((v) => !vendorQuotes.some((q) => q.vendorId === v._id))
                          .map((vendor) => (
                            <SelectItem key={vendor._id} value={vendor._id}>
                              {vendor.companyName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit Price (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setVendorDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddVendor}>Add</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Manager Review Actions */}
          {isManagerReview && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label className="text-xs font-medium">Manager Notes / Rejection Reason</Label>
                <Textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Add instructions or reason for rejection..."
                  className="mt-1 text-sm min-h-[80px]"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    setIsReviewing(true);
                    try {
                      await reviewCC({
                        requestId,
                        action: "reject",
                        notes: managerNotes.trim() || undefined,
                      });
                      toast.success("Cost comparison rejected");
                      onOpenChange(false);
                    } catch (error: any) {
                      toast.error(error.message || "Failed to reject");
                    } finally {
                      setIsReviewing(false);
                    }
                  }}
                  disabled={isReviewing}
                  size="sm"
                  className="flex-1"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Reject CC
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedFinalVendor) {
                      toast.error("Please select a final vendor");
                      return;
                    }
                    setIsReviewing(true);
                    try {
                      await reviewCC({
                        requestId,
                        action: "approve",
                        selectedVendorId: selectedFinalVendor as Id<"vendors">,
                        notes: managerNotes.trim() || undefined,
                      });
                      toast.success("Cost comparison approved");
                      onOpenChange(false);
                    } catch (error: any) {
                      toast.error(error.message || "Failed to approve");
                    } finally {
                      setIsReviewing(false);
                    }
                  }}
                  disabled={isReviewing || !selectedFinalVendor}
                  size="sm"
                  className="flex-1"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Approve & Select Vendor
                </Button>
              </div>
            </div>
          )}

          {/* Purchase Officer Actions */}
          {canEdit && !isSubmitted && !isManager && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setVendorDialogOpen(true)}
                className="flex-1"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Vendor
              </Button>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isSubmitting}
                size="sm"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || isSubmitting || vendorQuotes.length === 0}
                size="sm"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {existingCC?.status === "cc_rejected" ? "Resubmit" : "Submit"}
              </Button>
            </div>
          )}

          {isSubmitted && !isManagerReview && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Submitted for manager approval
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

