"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { CheckCircle, Package, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface BulkDeliveryItem {
    requestId: Id<"requests">;
    itemName: string;
    requestedQuantity: number;
    unit: string;
    poQuantity: number;
    itemOrder?: number;
}

interface BulkDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: BulkDeliveryItem[];
    vendorName: string;
    poNumber: string;
}

export function BulkDeliveryDialog({
    open,
    onOpenChange,
    items,
    vendorName,
    poNumber,
}: BulkDeliveryDialogProps) {
    // Initialize delivery quantities with REQUESTED quantities (auto-filled to requested, not PO)
    const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>({});

    // Reinitialize quantities when items change or dialog opens
    useEffect(() => {
        if (open && items.length > 0) {
            const initial: Record<string, number> = {};
            items.forEach((item) => {
                initial[item.requestId] = item.requestedQuantity; // Auto-fill with requested quantity
            });
            setDeliveryQuantities(initial);
        }
    }, [open, items]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const markReadyForDelivery = useMutation(api.requests.markReadyForDelivery);

    const handleQuantityChange = (requestId: string, value: string) => {
        const numValue = parseInt(value) || 0;
        const item = items.find((i) => i.requestId === requestId);
        if (!item) return;

        // Enforce max limit as REQUESTED quantity (can only reduce, not increase)
        const clampedValue = Math.max(0, Math.min(numValue, item.requestedQuantity));
        setDeliveryQuantities((prev) => ({
            ...prev,
            [requestId]: clampedValue,
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            let deliveredCount = 0;
            let skippedCount = 0;

            for (const item of items) {
                const deliveryQty = deliveryQuantities[item.requestId];

                if (deliveryQty > 0) {
                    await markReadyForDelivery({
                        requestId: item.requestId,
                        deliveryQuantity: deliveryQty,
                    });
                    deliveredCount++;
                } else {
                    skippedCount++;
                }
            }

            if (deliveredCount > 0) {
                toast.success(`Successfully marked ${deliveredCount} item(s) for delivery${skippedCount > 0 ? ` (${skippedCount} skipped)` : ""}`);
            }

            onOpenChange(false);

            // Reset quantities for next open
            const initial: Record<string, number> = {};
            items.forEach((item) => {
                initial[item.requestId] = item.requestedQuantity;
            });
            setDeliveryQuantities(initial);
        } catch (error) {
            console.error("Failed to mark delivery:", error);
            toast.error("Failed to mark items for delivery");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate totals
    const totalRequested = items.reduce((sum, item) => sum + item.requestedQuantity, 0);
    const totalToDeliver = Object.values(deliveryQuantities).reduce((sum, qty) => sum + qty, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Truck className="h-5 w-5 text-emerald-600" />
                        Bulk Delivery - {vendorName}
                    </DialogTitle>
                    <DialogDescription>
                        Review and confirm delivery quantities for {items.length} item(s) from PO: <span className="font-mono font-semibold">{poNumber}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="text-center">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Requested</div>
                            <div className="text-lg font-bold">{totalRequested}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">To Deliver</div>
                            <div className="text-lg font-bold text-emerald-600">{totalToDeliver}</div>
                        </div>
                    </div>

                    {/* Items List - All visible without scrolling */}
                    <div className="space-y-3">
                        {items.map((item, idx) => {
                            const deliveryQty = deliveryQuantities[item.requestId] || 0;
                            const isFullDelivery = deliveryQty === item.requestedQuantity;
                            const isPartialDelivery = deliveryQty > 0 && deliveryQty < item.requestedQuantity;
                            const isNoDelivery = deliveryQty === 0;

                            return (
                                <div
                                    key={item.requestId}
                                    className={cn(
                                        "p-4 rounded-lg border-2 transition-all",
                                        isFullDelivery && "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20",
                                        isPartialDelivery && "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20",
                                        isNoDelivery && "border-border bg-muted/20"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Item Number Badge */}
                                        <div className="shrink-0">
                                            <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 font-mono text-sm px-3 py-1">
                                                #{item.itemOrder || (idx + 1)}
                                            </Badge>
                                        </div>

                                        {/* Item Details */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-base mb-2 truncate">{item.itemName}</h4>

                                            <div className="mb-3">
                                                <Label className="text-xs text-muted-foreground">Requested Quantity</Label>
                                                <div className="text-lg font-bold text-blue-600">{item.requestedQuantity} {item.unit}</div>
                                            </div>

                                            {/* Quantity Input */}
                                            <div className="space-y-2">
                                                <Label htmlFor={`qty-${item.requestId}`} className="text-xs font-bold">
                                                    Quantity to Deliver
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        id={`qty-${item.requestId}`}
                                                        type="number"
                                                        min="0"
                                                        max={item.requestedQuantity}
                                                        value={deliveryQty}
                                                        onChange={(e) => handleQuantityChange(item.requestId, e.target.value)}
                                                        className={cn(
                                                            "text-lg font-bold text-center w-32",
                                                            isFullDelivery && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
                                                            isPartialDelivery && "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                                        )}
                                                    />
                                                    <span className="text-sm text-muted-foreground font-medium">{item.unit}</span>

                                                    {/* Status Indicator */}
                                                    {isFullDelivery && (
                                                        <Badge className="bg-emerald-600 text-white">
                                                            <CheckCircle className="h-3 w-3 mr-1" /> Full Delivery
                                                        </Badge>
                                                    )}
                                                    {isPartialDelivery && (
                                                        <Badge className="bg-orange-600 text-white">
                                                            <Package className="h-3 w-3 mr-1" /> Partial
                                                        </Badge>
                                                    )}
                                                    {isNoDelivery && (
                                                        <Badge variant="outline" className="text-muted-foreground">
                                                            Skipped
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground italic">
                                                    {isPartialDelivery && `Remaining ${item.requestedQuantity - deliveryQty} ${item.unit} will stay in Pending PO`}
                                                    {isNoDelivery && "This item will remain in Pending PO"}
                                                    {isFullDelivery && "Full requested quantity will be delivered"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>

                    <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                            Delivering <span className="font-bold text-emerald-600">{totalToDeliver}</span> / {totalRequested} requested
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || totalToDeliver === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Delivery
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
