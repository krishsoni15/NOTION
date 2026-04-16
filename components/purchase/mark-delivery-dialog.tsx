"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { toast } from "sonner";
import { Truck, ArrowRight, Package } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface MarkDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: Id<"requests">;
    currentQuantity: number;
    itemName: string;
    unit: string;
}

export function MarkDeliveryDialog({
    open,
    onOpenChange,
    requestId,
    currentQuantity,
    itemName,
    unit,
}: MarkDeliveryDialogProps) {
    const [deliveryQuantity, setDeliveryQuantity] = useState<string>(currentQuantity.toString());
    const markReadyForDelivery = useMutation(api.requests.markReadyForDelivery);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setDeliveryQuantity(currentQuantity.toString());
        }
    }, [open, currentQuantity]);

    const deliveryQty = parseFloat(deliveryQuantity) || 0;
    const remainingQty = Math.max(0, currentQuantity - deliveryQty);

    // Format numbers to avoid floating point issues display
    // Use a simple helper or just precise formatting
    const formattedRemaining = Number(remainingQty.toFixed(2));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (deliveryQty <= 0) {
            toast.error("Delivery quantity must be greater than 0");
            return;
        }

        if (deliveryQty > currentQuantity) {
            toast.error("Delivery quantity cannot exceed total quantity");
            return;
        }

        setIsSubmitting(true);
        try {
            await markReadyForDelivery({
                requestId,
                deliveryQuantity: deliveryQty,
            });
            toast.success(
                remainingQty > 0
                    ? "Request split: Partial delivery initiated"
                    : "Request moved to Ready for Delivery"
            );
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to update status");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mark Ready for Delivery</DialogTitle>
                    <DialogDescription>
                        Specify the quantity to be delivered now. The remaining quantity will stay in Pending PO status.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Item:</span>
                            <span className="font-medium text-foreground">{itemName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Pending:</span>
                            <span className="font-medium text-foreground">{currentQuantity} {unit}</span>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="delivery-qty">Delivery Quantity</Label>
                            <div className="relative">
                                <Truck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="delivery-qty"
                                    type="number"
                                    step="any"
                                    value={deliveryQuantity}
                                    onChange={(e) => setDeliveryQuantity(e.target.value)}
                                    className="pl-9"
                                    min="0"
                                    max={currentQuantity}
                                />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                                    {unit}
                                </span>
                            </div>
                        </div>

                        {remainingQty > 0 && (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/50 text-sm">
                                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                    <Package className="h-4 w-4" />
                                    <span>Remaining Pending</span>
                                </div>
                                <div className="font-bold text-orange-700 dark:text-orange-400">
                                    {formattedRemaining} {unit}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || deliveryQty <= 0 || deliveryQty > currentQuantity}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isSubmitting ? "Processing..." : remainingQty > 0 ? "Confirm Partial Delivery" : "Confirm Full Delivery"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
