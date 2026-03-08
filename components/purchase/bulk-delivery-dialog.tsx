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
import { CheckCircle, Package, Loader2, Truck, TrendingDown, TrendingUp, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import { MediaInput } from "@/components/shared/media-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface BulkDeliveryItem {
    requestId: Id<"requests">;
    itemName: string;
    requestedQuantity: number; // Current request quantity (remaining to deliver)
    unit: string;
    poQuantity: number; // Original PO quantity
    itemOrder?: number;
    alreadyDelivered?: number; // Already delivered from previous deliveries
    originalRequested?: number; // Original requested quantity (before any splits)
}

interface BulkDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: BulkDeliveryItem[];
    vendorName: string;
    poNumber: string;
    mode?: "delivery" | "direct_delivered";
    onDirectDelivery?: (
        quantities: Record<string, number>,
        invoices: {
            no: Record<string, string>,
            photos: Record<string, File | null>
        }
    ) => Promise<void>;
}

export function BulkDeliveryDialog({
    open,
    onOpenChange,
    items,
    vendorName,
    poNumber,
    mode = "delivery",
    onDirectDelivery,
}: BulkDeliveryDialogProps) {
    // Initialize delivery quantities with REQUESTED quantities (auto-filled to requested, not PO)
    const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>({});
    const [invoiceNos, setInvoiceNos] = useState<Record<string, string>>({});
    const [invoiceDates, setInvoiceDates] = useState<Record<string, Date | undefined>>({});
    const [invoicePhotoFiles, setInvoicePhotoFiles] = useState<Record<string, File | null>>({});

    // Reinitialize quantities when items change or dialog opens
    useEffect(() => {
        if (open && items.length > 0) {
            const initial: Record<string, number> = {};
            items.forEach((item) => {
                initial[item.requestId] = item.requestedQuantity; // Auto-fill with requested quantity
            });
            setDeliveryQuantities(initial);
            setInvoiceNos({});
            setInvoiceDates({});
            setInvoicePhotoFiles({});
        }
    }, [open, items]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirectDelivering, setIsDirectDelivering] = useState(false);
    const createGRNFromDelivery = useMutation(api.grn.createGRNFromDelivery);

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
            const createdGRNs: string[] = [];

            for (const item of items) {
                const deliveryQty = deliveryQuantities[item.requestId];

                if (deliveryQty > 0) {
                    let invoicePhoto = undefined;
                    const photoFile = invoicePhotoFiles[item.requestId];
                    if (photoFile) {
                        const formData = new FormData();
                        formData.append("file", photoFile);
                        const response = await fetch("/api/upload/image", { method: "POST", body: formData });
                        if (response.ok) {
                            const data = await response.json();
                            invoicePhoto = { imageUrl: data.imageUrl, imageKey: data.imageKey };
                        }
                    }

                    // Create GRN automatically
                    const result = await createGRNFromDelivery({
                        poNumber: poNumber,
                        requestId: item.requestId,
                        deliveryQuantity: deliveryQty,
                        invoiceNo: invoiceNos[item.requestId] || undefined,
                        invoiceDate: invoiceDates[item.requestId] ? invoiceDates[item.requestId]!.getTime() : undefined,
                        invoicePhoto,
                    });

                    if (result?.grnNumber) {
                        createdGRNs.push(result.grnNumber);
                    }

                    deliveredCount++;
                } else {
                    skippedCount++;
                }
            }

            if (deliveredCount > 0) {
                const grnInfo = createdGRNs.length > 0 ? ` (${createdGRNs.join(", ")})` : "";
                toast.success(`✅ ${deliveredCount} GRN(s) created${grnInfo}${skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}`);
            }

            onOpenChange(false);

            // Reset quantities for next open
            const initial: Record<string, number> = {};
            items.forEach((item) => {
                initial[item.requestId] = item.requestedQuantity;
            });
            setDeliveryQuantities(initial);
            setInvoiceNos({});
            setInvoiceDates({});
            setInvoicePhotoFiles({});
        } catch (error: any) {
            console.error("Failed to create GRN:", error);
            toast.error(error.message || "Failed to confirm delivery");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate totals with delivery tracking
    const totalOriginalRequested = items.reduce((sum, item) => sum + (item.originalRequested || item.poQuantity || item.requestedQuantity), 0);
    const totalAlreadyDelivered = items.reduce((sum, item) => sum + (item.alreadyDelivered || 0), 0);
    const totalRemaining = items.reduce((sum, item) => sum + item.requestedQuantity, 0);
    const totalToDeliver = Object.values(deliveryQuantities).reduce((sum, qty) => sum + qty, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {mode === "direct_delivered" ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                            <Truck className="h-5 w-5 text-emerald-600" />
                        )}
                        {mode === "direct_delivered" ? "Direct Delivery" : "Confirm Delivery"} - {vendorName}
                    </DialogTitle>
                    <DialogDescription>
                        Confirm delivery quantities for {items.length} item(s) from PO: <span className="font-mono font-semibold">{poNumber}</span>. Each delivered item will generate a separate GRN automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Summary Stats - Enhanced with delivery tracking */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg border">
                        <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Requested</div>
                            <div className="text-lg font-bold">{totalOriginalRequested}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <TrendingDown className="h-3 w-3 text-blue-500" /> Already Delivered
                            </div>
                            <div className="text-lg font-bold text-blue-600">{totalAlreadyDelivered}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Remaining</div>
                            <div className="text-lg font-bold text-orange-600">{totalRemaining}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-500" /> To Deliver Now
                            </div>
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

                                            {/* Delivery Breakdown */}
                                            <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-muted/40 rounded-md">
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground uppercase">Total Requested</Label>
                                                    <div className="text-sm font-bold">{item.originalRequested || item.poQuantity || item.requestedQuantity} {item.unit}</div>
                                                </div>
                                                {(item.alreadyDelivered !== undefined && item.alreadyDelivered > 0) && (
                                                    <div>
                                                        <Label className="text-[10px] text-blue-600 uppercase">Already Delivered</Label>
                                                        <div className="text-sm font-bold text-blue-600">{item.alreadyDelivered} {item.unit}</div>
                                                    </div>
                                                )}
                                                <div>
                                                    <Label className="text-[10px] text-orange-600 uppercase">Remaining</Label>
                                                    <div className="text-sm font-bold text-orange-600">{item.requestedQuantity} {item.unit}</div>
                                                </div>
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

                                            {/* Invoice Details — compact single row, all optional */}
                                            {deliveryQty > 0 && (
                                                <div className="mt-3 flex items-end gap-2 flex-wrap p-2.5 bg-muted/20 border border-muted rounded-md border-dashed">
                                                    <div className="flex-1 min-w-[120px]">
                                                        <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Invoice No. <span className="text-[9px] normal-case">(Optional)</span></Label>
                                                        <Input
                                                            placeholder="INV-001"
                                                            value={invoiceNos[item.requestId] || ""}
                                                            onChange={(e) => setInvoiceNos((prev) => ({ ...prev, [item.requestId]: e.target.value }))}
                                                            className="h-8 text-xs bg-background"
                                                        />
                                                    </div>
                                                    <div className="min-w-[120px]">
                                                        <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Invoice Date <span className="text-[9px] normal-case">(Optional)</span></Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "h-8 w-full justify-start text-left text-xs px-2",
                                                                        !invoiceDates[item.requestId] && "text-muted-foreground border-dashed"
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-1.5 h-3 w-3 opacity-70" />
                                                                    {invoiceDates[item.requestId] ? format(invoiceDates[item.requestId]!, "dd/MM/yy") : "Select"}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0 z-[100]" align="start">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={invoiceDates[item.requestId]}
                                                                    onSelect={(date) => setInvoiceDates((prev) => ({ ...prev, [item.requestId]: date }))}
                                                                    initialFocus
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div className="min-w-[100px]">
                                                        <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Upload <span className="text-[9px] normal-case">(Optional)</span></Label>
                                                        <MediaInput
                                                            onValueChange={(file) => setInvoicePhotoFiles((prev) => ({ ...prev, [item.requestId]: file }))}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col gap-3 pt-4 border-t">
                    <div className="text-sm text-muted-foreground text-center">
                        Delivering <span className="font-bold text-emerald-600">{totalToDeliver}</span> / {totalRemaining} remaining · Each item generates a unique GRN
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting || isDirectDelivering}
                            className="shrink-0"
                        >
                            Cancel
                        </Button>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                            {onDirectDelivery && (
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        setIsDirectDelivering(true);
                                        try {
                                            await onDirectDelivery(deliveryQuantities, { no: invoiceNos, photos: invoicePhotoFiles });
                                            onOpenChange(false);
                                        } finally {
                                            setIsDirectDelivering(false);
                                        }
                                    }}
                                    disabled={isSubmitting || isDirectDelivering || totalToDeliver === 0}
                                    className="border-violet-400 text-violet-700 hover:bg-violet-50 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-950/30 font-semibold"
                                >
                                    {isDirectDelivering ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Truck className="h-4 w-4 mr-2" />
                                            Direct Delivered
                                        </>
                                    )}
                                </Button>
                            )}
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || isDirectDelivering || totalToDeliver === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating GRNs...
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
