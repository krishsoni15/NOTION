"use client";

/**
 * Cost Comparison Content Component
 * 
 * Allows purchase officers to create cost comparisons with multiple vendor quotes.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { X, Plus, Save, Send, AlertCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface CostComparisonContentProps {
  requestId: Id<"requests">;
}

interface VendorQuote {
  vendorId: Id<"vendors">;
  unitPrice: number;
}

export function CostComparisonContent({ requestId }: CostComparisonContentProps) {
  const [vendorQuotes, setVendorQuotes] = useState<VendorQuote[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<Id<"vendors"> | "">("");
  const [unitPrice, setUnitPrice] = useState("");
  const [isDirectDelivery, setIsDirectDelivery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  const request = useQuery(api.requests.getRequestById, { requestId });
  const vendors = useQuery(api.vendors.getAllVendors);
  const inventoryItems = useQuery(api.inventory.getAllInventoryItems);
  const existingCC = useQuery(api.costComparisons.getCostComparisonByRequestId, { requestId });
  const upsertCC = useMutation(api.costComparisons.upsertCostComparison);
  const submitCC = useMutation(api.costComparisons.submitCostComparison);
  const resubmitCC = useMutation(api.costComparisons.resubmitCostComparison);

  // Check if item exists in inventory
  const itemInInventory = inventoryItems?.find(
    (item) => item.itemName.toLowerCase() === request?.itemName.toLowerCase()
  );

  // Load existing cost comparison
  useEffect(() => {
    if (existingCC) {
      setVendorQuotes(
        existingCC.vendorQuotes.map((q) => ({
          vendorId: q.vendorId,
          unitPrice: q.unitPrice,
        }))
      );
      setIsDirectDelivery(existingCC.isDirectDelivery);
    }
  }, [existingCC]);

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

    // Check if vendor already added
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
      toast.success("Cost comparison saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save cost comparison");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit for approval or resubmit if rejected
  const handleSubmit = async () => {
    if (vendorQuotes.length === 0) {
      toast.error("Please add at least one vendor quote before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      // If it's a rejected CC, use resubmit mutation
      if (existingCC?.status === "cc_rejected") {
        await resubmitCC({
          requestId,
          vendorQuotes,
          isDirectDelivery,
        });
        toast.success("Cost comparison resubmitted for approval");
      } else {
        // Save first for new/draft CCs
        await handleSave();
        await submitCC({ requestId });
        toast.success("Cost comparison submitted for approval");
      }
      // Redirect to requests page
      window.location.href = "/dashboard/purchase/requests";
    } catch (error: any) {
      toast.error(error.message || "Failed to submit cost comparison");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total for a vendor
  const calculateTotal = (unitPrice: number) => {
    if (!request) return 0;
    return unitPrice * request.quantity;
  };

  if (!request) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  const canEdit = existingCC?.status === "draft" || existingCC?.status === "cc_rejected" || !existingCC;
  const isSubmitted = existingCC?.status === "cc_pending";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cost Comparison</h1>
        <p className="text-muted-foreground">
          Create cost comparison for request {request.requestNumber}
        </p>
      </div>

      {/* Rejection Notes - Show prominently at top if rejected */}
      {existingCC?.status === "cc_rejected" && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Cost Comparison Rejected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-destructive">Rejection Reason:</Label>
              <p className="text-sm mt-1 p-3 bg-background border border-destructive/20 rounded-md">
                {existingCC.managerNotes || "No reason provided."}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please review the rejection reason above, make necessary changes to the vendor quotes, and resubmit.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Material Name</Label>
            <p className="text-lg font-semibold">{request.itemName}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Quantity</Label>
            <p className="text-lg">{request.quantity} {request.unit}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <p className="text-muted-foreground">{request.description}</p>
          </div>
          {itemInInventory && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="directDelivery"
                checked={isDirectDelivery}
                onCheckedChange={(checked) => setIsDirectDelivery(checked === true)}
                disabled={!canEdit || isSubmitted}
              />
              <Label htmlFor="directDelivery" className="cursor-pointer">
                Item exists in inventory - Option for Direct Delivery Stage
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Quotes */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Quotes</CardTitle>
          <CardDescription>Add vendors and their unit prices for comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This cost comparison has been submitted and is pending manager approval.
              </p>
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Vendor</th>
                      <th className="text-left p-3 font-medium">Unit Price (₹)</th>
                      <th className="text-left p-3 font-medium">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingCC?.vendorQuotes.map((quote, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3">{quote.vendor?.companyName || "Unknown"}</td>
                        <td className="p-3">₹{quote.unitPrice.toFixed(2)}</td>
                        <td className="p-3">₹{calculateTotal(quote.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {vendorQuotes.length > 0 && (
                <div className="border rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Vendor</th>
                        <th className="text-left p-3 font-medium">Unit Price (₹)</th>
                        <th className="text-left p-3 font-medium">Total Amount</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorQuotes.map((quote) => (
                        <tr key={quote.vendorId} className="border-b">
                          <td className="p-3">{getVendorName(quote.vendorId)}</td>
                          <td className="p-3">₹{quote.unitPrice.toFixed(2)}</td>
                          <td className="p-3">₹{calculateTotal(quote.unitPrice).toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveVendor(quote.vendorId)}
                              disabled={!canEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {canEdit && (
                <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      {vendorQuotes.length === 0
                        ? "Add Vendor from Master List"
                        : "-- Add Vendor from Master List --"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Vendor Quote</DialogTitle>
                      <DialogDescription>
                        Select a vendor and enter the unit price
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="vendor">Vendor</Label>
                        <Select
                          value={selectedVendorId}
                          onValueChange={(value) => setSelectedVendorId(value as Id<"vendors">)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors
                              ?.filter(
                                (v) => !vendorQuotes.some((q) => q.vendorId === v._id)
                              )
                              .map((vendor) => (
                                <SelectItem key={vendor._id} value={vendor._id}>
                                  {vendor.companyName}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(e.target.value)}
                          placeholder="Enter unit price"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setVendorDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleAddVendor}>Add</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canEdit && !isSubmitted && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || isSubmitting}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || isSubmitting || vendorQuotes.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            {existingCC?.status === "cc_rejected" ? "Resubmit" : "Submit for Approval"}
          </Button>
        </div>
      )}

      {/* Rejection Notes - Show prominently at top if rejected */}
      {existingCC?.status === "cc_rejected" && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Cost Comparison Rejected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-destructive">Rejection Reason:</Label>
              <p className="text-sm mt-1 p-3 bg-background border border-destructive/20 rounded-md">
                {existingCC.managerNotes || "No reason provided."}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please review the rejection reason above, make necessary changes to the vendor quotes, and resubmit.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

