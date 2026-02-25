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
import { Package, Pencil, RotateCcw } from "lucide-react";

interface SplitPOQuantityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: Id<"requests"> | null;
    currentQuantity: number;
    itemName: string;
    unit: string;
    onSuccess?: () => void;
}

export function SplitPOQuantityDialog({
    open,
    onOpenChange,
    requestId,
    currentQuantity,
    itemName,
    unit,
    onSuccess,
}: SplitPOQuantityDialogProps) {
    const [newQuantity, setNewQuantity] = useState(currentQuantity);
    const [isLoading, setIsLoading] = useState(false);

    const splitPOQuantity = useMutation(api.requests.splitPendingPOQuantity);

    // Reset when dialog opens
    useEffect(() => {
        if (open) {
            setNewQuantity(currentQuantity);
        }
    }, [open, currentQuantity]);

    const remainingQuantity = currentQuantity - newQuantity;
    const isValid = newQuantity > 0 && newQuantity < currentQuantity;

    const handleSplit = async () => {
        if (!requestId || !isValid) return;

        setIsLoading(true);
        try {
            await splitPOQuantity({
                requestId,
                newQuantity,
            });

            toast.success(
                `Split: ${newQuantity} ${unit} stays on PO, ${remainingQuantity} ${unit} moved to Ready for CC`
            );

            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to split PO quantity");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5 text-orange-600" />
                        Edit PO Quantity
                    </DialogTitle>
                    <DialogDescription>
                        Reduce the quantity when vendor can&apos;t supply the full amount.
                        The remaining quantity will go back to Ready for CC for future ordering.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Item Info */}
                    <div className="rounded-lg border p-4 bg-muted/50">
                        <p className="text-sm font-medium">{itemName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Current PO Quantity: {currentQuantity} {unit}
                        </p>
                    </div>

                    {/* Quantity Input */}
                    <div className="space-y-2">
                        <Label htmlFor="newQuantity">
                            New Quantity (vendor can supply) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="newQuantity"
                            type="number"
                            min={1}
                            max={currentQuantity - 1}
                            value={newQuantity}
                            onChange={(e) => setNewQuantity(Number(e.target.value))}
                            placeholder="Enter reduced quantity"
                            className="text-lg font-semibold"
                        />
                        <p className="text-xs text-muted-foreground">
                            Must be less than {currentQuantity} {unit}. Cannot increase quantity.
                        </p>
                    </div>

                    {/* Split Preview */}
                    {newQuantity > 0 && newQuantity < currentQuantity && (
                        <div className="rounded-lg border p-4 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                            <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">
                                📦 Split Preview:
                            </p>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        Stays on PO:
                                    </span>
                                    <span className="font-semibold text-orange-700 dark:text-orange-400">
                                        {newQuantity} {unit}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <RotateCcw className="h-3 w-3" />
                                        Back to Ready for CC:
                                    </span>
                                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                                        {remainingQuantity} {unit}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Validation warning */}
                    {newQuantity >= currentQuantity && newQuantity > 0 && (
                        <p className="text-xs text-destructive">
                            New quantity must be less than {currentQuantity}. Use the &quot;Available&quot; button for full delivery.
                        </p>
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
                        onClick={handleSplit}
                        disabled={isLoading || !isValid}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        {isLoading ? "Processing..." : `Split to ${newQuantity} ${unit}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
