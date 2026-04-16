"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Package, Truck } from "lucide-react";

interface EditPOQuantityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: Id<"requests"> | null;
    currentQuantity: number;
    itemName: string;
    unit: string;
    onSuccess?: () => void;
}

export function EditPOQuantityDialog({
    open,
    onOpenChange,
    requestId,
    currentQuantity,
    itemName,
    unit,
    onSuccess,
}: EditPOQuantityDialogProps) {
    const [deliveryQuantity, setDeliveryQuantity] = useState(currentQuantity);
    const [isLoading, setIsLoading] = useState(false);

    const markReadyForDelivery = useMutation(api.requests.markReadyForDelivery);

    // Auto-fill with full quantity when dialog opens or quantity changes
    useEffect(() => {
        if (open) {
            setDeliveryQuantity(currentQuantity);
        }
    }, [open, currentQuantity]);

    const remainingQuantity = currentQuantity - deliveryQuantity;

    const handleMarkReady = async () => {
        if (!requestId) return;

        if (deliveryQuantity <= 0 || deliveryQuantity > currentQuantity) {
            toast.error("Delivery quantity must be between 1 and " + currentQuantity);
            return;
        }

        setIsLoading(true);
        try {
            await markReadyForDelivery({
                requestId,
                deliveryQuantity,
            });

            if (deliveryQuantity === currentQuantity) {
                toast.success(`Full quantity (${deliveryQuantity} ${unit}) marked ready for delivery`);
            } else {
                toast.success(
                    `Split: ${deliveryQuantity} ${unit} ready for delivery, ${remainingQuantity} ${unit} stays in Pending PO`
                );
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to mark ready for delivery");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        Ready for Delivery - Edit Quantity
                    </DialogTitle>
                    <DialogDescription>
                        Quantity is auto-filled with the full amount. You can reduce it if vendor can't supply all.
                        The remaining will stay in Pending PO for next order.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Item Info */}
                    <div className="rounded-lg border p-4 bg-muted/50">
                        <p className="text-sm font-medium">{itemName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Pending PO: {currentQuantity} {unit}
                        </p>
                    </div>

                    {/* Quantity Input - AUTO-FILLED */}
                    <div className="space-y-2">
                        <Label htmlFor="deliveryQuantity">
                            Quantity to Deliver <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="deliveryQuantity"
                            type="number"
                            min={1}
                            max={currentQuantity}
                            value={deliveryQuantity}
                            onChange={(e) => setDeliveryQuantity(Number(e.target.value))}
                            placeholder="Enter quantity for delivery"
                            className="text-lg font-semibold"
                        />
                        <p className="text-xs text-muted-foreground">
                            Default: Full amount ({currentQuantity} {unit}). You can change it if needed.
                        </p>
                    </div>

                    {/* Split Preview */}
                    {deliveryQuantity > 0 && deliveryQuantity <= currentQuantity && (
                        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                                {remainingQuantity > 0 ? "📦 Split Preview:" : "✅ Full Delivery:"}
                            </p>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Truck className="h-3 w-3" />
                                        Ready for Delivery:
                                    </span>
                                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                                        {deliveryQuantity} {unit}
                                    </span>
                                </div>
                                {remainingQuantity > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Package className="h-3 w-3" />
                                            Stays in Pending PO:
                                        </span>
                                        <span className="font-semibold text-orange-700 dark:text-orange-400">
                                            {remainingQuantity} {unit}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleMarkReady}
                        disabled={isLoading || deliveryQuantity <= 0 || deliveryQuantity > currentQuantity}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading ? "Processing..." : `Mark ${deliveryQuantity} ${unit} Ready`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
