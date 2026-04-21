"use client";

/**
 * Direct CC Setup Dialog
 *
 * Step 1 of creating a Cost Comparison without a request.
 * Collects: Item Name, Description, Quantity, Unit, Notes
 * On submit → creates a real request record → opens the full CostComparisonDialog
 */

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { CostComparisonDialog } from "./cost-comparison-dialog";

interface DirectCCSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DirectCCSetupDialog({ open, onOpenChange }: DirectCCSetupDialogProps) {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // After creating the request, hold its ID and open the CC dialog
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [ccDialogOpen, setCCDialogOpen] = useState(false);

  const createDirectCCRequest = useMutation(api.requests.createDirectCCRequest);

  const reset = () => {
    setItemName("");
    setDescription("");
    setQuantity("");
    setUnit("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!itemName.trim()) { toast.error("Item name is required"); return; }
    if (!description.trim()) { toast.error("Description is required"); return; }
    if (!quantity || parseFloat(quantity) <= 0) { toast.error("Quantity must be greater than 0"); return; }
    if (!unit.trim()) { toast.error("Unit is required"); return; }

    setIsSubmitting(true);
    try {
      const requestId = await createDirectCCRequest({
        itemName: itemName.trim(),
        description: description.trim(),
        quantity: parseFloat(quantity),
        unit: unit.trim(),
        notes: notes.trim() || undefined,
      });

      // Close this dialog, open the full CC dialog with the new request
      onOpenChange(false);
      reset();
      setCCRequestId(requestId);
      setCCDialogOpen(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) { onOpenChange(v); if (!v) reset(); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create Cost Comparison</DialogTitle>
            <DialogDescription>
              Enter item details to start a cost comparison
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dc-item">Item Name</Label>
              <Input
                id="dc-item"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Cement, Steel Rod, MCB"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-desc">Description</Label>
              <Input
                id="dc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description or specification"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dc-qty">Quantity</Label>
                <Input
                  id="dc-qty"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="0.01"
                  step="0.01"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dc-unit">Unit</Label>
                <Input
                  id="dc-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg, pcs, nos…"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-notes">
                Notes <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="dc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or requirements"
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { onOpenChange(false); reset(); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ArrowRight className="h-4 w-4" />}
              Continue to CC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full CC dialog opens after request is created */}
      {ccRequestId && (
        <CostComparisonDialog
          open={ccDialogOpen}
          onOpenChange={(v) => {
            setCCDialogOpen(v);
            if (!v) setCCRequestId(null);
          }}
          requestId={ccRequestId}
        />
      )}
    </>
  );
}
