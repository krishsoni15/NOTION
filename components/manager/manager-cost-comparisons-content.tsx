"use client";

/**
 * Manager Cost Comparisons Content Component
 * 
 * Allows managers to review and approve/reject cost comparisons.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle, XCircle, Download } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export function ManagerCostComparisonsContent() {
  const [selectedCC, setSelectedCC] = useState<any>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<Id<"vendors"> | "">("");
  const [notes, setNotes] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pendingCCs = useQuery(api.costComparisons.getPendingCostComparisons);
  const reviewCC = useMutation(api.costComparisons.reviewCostComparison);

  const handleReview = (cc: any) => {
    setSelectedCC(cc);
    setSelectedVendorId("");
    setNotes("");
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedCC || !selectedVendorId) {
      toast.error("Please select a vendor before approving");
      return;
    }

    setIsLoading(true);
    try {
      await reviewCC({
        requestId: selectedCC.requestId,
        action: "approve",
        selectedVendorId: selectedVendorId as Id<"vendors">,
        notes: notes.trim() || undefined,
      });
      toast.success("Cost comparison approved successfully");
      setReviewDialogOpen(false);
      setSelectedCC(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve cost comparison");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCC) return;

    setIsLoading(true);
    try {
      await reviewCC({
        requestId: selectedCC.requestId,
        action: "reject",
        notes: notes.trim() || undefined,
      });
      toast.success("Cost comparison rejected");
      setReviewDialogOpen(false);
      setSelectedCC(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to reject cost comparison");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = (unitPrice: number, quantity: number) => {
    return unitPrice * quantity;
  };

  if (!pendingCCs) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cost Comparison Review</h1>
        <p className="text-muted-foreground">
          Review and approve/reject cost comparisons submitted by purchase officers
        </p>
      </div>

      {pendingCCs.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              No pending cost comparisons to review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingCCs.map((cc) => (
            <Card key={cc._id}>
              <CardHeader>
                <CardTitle>
                  {cc.request?.itemName} x {cc.request?.quantity} {cc.request?.unit}
                </CardTitle>
                <CardDescription>
                  Request ID: {cc.request?.requestNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Vendor Quotes</Label>
                  <div className="border rounded-lg mt-2">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Select</th>
                          <th className="text-left p-3 font-medium">Vendor</th>
                          <th className="text-left p-3 font-medium">Unit Price</th>
                          <th className="text-left p-3 font-medium">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cc.vendorQuotes.map((quote: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="p-3">
                              <input
                                type="radio"
                                name={`vendor-${cc._id}`}
                                value={quote.vendorId}
                                checked={selectedCC?._id === cc._id && selectedVendorId === quote.vendorId}
                                onChange={() => {
                                  if (selectedCC?._id === cc._id) {
                                    setSelectedVendorId(quote.vendorId as Id<"vendors">);
                                  }
                                }}
                                className="h-4 w-4"
                              />
                            </td>
                            <td className="p-3">
                              {quote.vendor?.companyName || "Unknown"}
                            </td>
                            <td className="p-3">₹{quote.unitPrice.toFixed(2)}</td>
                            <td className="p-3">
                              ₹{calculateTotal(quote.unitPrice, cc.request?.quantity || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleReview(cc)}
                  >
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cost Comparison Review</DialogTitle>
            <DialogDescription>
              {selectedCC?.request?.itemName} x {selectedCC?.request?.quantity}{" "}
              {selectedCC?.request?.unit}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Final Vendor</Label>
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Select</th>
                      <th className="text-left p-3 font-medium">Vendor</th>
                      <th className="text-left p-3 font-medium">Unit Price</th>
                      <th className="text-left p-3 font-medium">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCC?.vendorQuotes.map((quote: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="p-3">
                          <RadioGroup
                            value={selectedVendorId}
                            onValueChange={(value) =>
                              setSelectedVendorId(value as Id<"vendors">)
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={quote.vendorId}
                                id={`select-vendor-${index}`}
                              />
                            </div>
                          </RadioGroup>
                        </td>
                        <td className="p-3">{quote.vendor?.companyName || "Unknown"}</td>
                        <td className="p-3">₹{quote.unitPrice.toFixed(2)}</td>
                        <td className="p-3">
                          ₹
                          {calculateTotal(
                            quote.unitPrice,
                            selectedCC?.request?.quantity || 0
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Manager Notes / Rejection Reason</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add instructions or reason for rejection..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implement PDF download
                  toast.info("PDF download feature coming soon");
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CC PDF
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject CC
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isLoading || !selectedVendorId}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Select Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

