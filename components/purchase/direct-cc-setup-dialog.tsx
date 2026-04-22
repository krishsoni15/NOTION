"use client";

/**
 * Direct CC Setup Dialog
 *
 * Step 1 of creating a Cost Comparison without a request.
 * Item Name field has live inventory suggestions — clicking one auto-fills all fields.
 */

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { ArrowRight, Loader2, Package, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // After creating the request, hold its ID and open the CC dialog
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [ccDialogOpen, setCCDialogOpen] = useState(false);

  const createDirectCCRequest = useMutation(api.requests.createDirectCCRequest);
  const inventoryItems = useQuery(api.inventory.getAllInventoryItems, {});

  // Filtered suggestions based on typed name
  const suggestions = (inventoryItems ?? []).filter((inv) =>
    itemName.trim().length > 0 &&
    inv.itemName.toLowerCase().includes(itemName.toLowerCase())
  );

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const reset = () => {
    setItemName("");
    setDescription("");
    setQuantity("");
    setUnit("");
    setNotes("");
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (inv: any) => {
    setItemName(inv.itemName);
    setDescription(inv.description || inv.specification || "");
    setUnit(inv.unit || "");
    // Keep quantity empty so user fills it
    setShowSuggestions(false);
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-violet-500" />
              </div>
              Create Cost Comparison
            </DialogTitle>
            <DialogDescription>
              Enter item details — or pick from inventory to auto-fill
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">

            {/* ── Item Name with suggestions ── */}
            <div className="space-y-1.5 relative" ref={suggestionRef}>
              <Label htmlFor="dc-item">Item Name</Label>
              <Input
                id="dc-item"
                value={itemName}
                onChange={(e) => { setItemName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => itemName.trim() && setShowSuggestions(true)}
                placeholder="e.g. Cement, Steel Rod, MCB"
                disabled={isSubmitting}
                autoFocus
                autoComplete="off"
              />

              {/* Dropdown suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border bg-popover shadow-xl overflow-hidden">
                  <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-b bg-muted/40">
                    Inventory — click to auto-fill
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {suggestions.map((inv) => (
                      <button
                        key={inv._id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(inv); }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Package className="h-4 w-4 text-violet-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug truncate">{inv.itemName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {inv.description || inv.specification || "No description"}
                            {inv.unit && <> · <span className="font-medium">{inv.unit}</span></>}
                            {(inv.centralStock ?? 0) > 0 && (
                              <span className="ml-1.5 text-emerald-500 font-semibold">
                                ({inv.centralStock} in stock)
                              </span>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Description ── */}
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

            {/* ── Quantity + Unit ── */}
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

            {/* ── Notes ── */}
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
            <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Continue to CC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full CC dialog opens after request is created */}
      {ccRequestId && (
        <CostComparisonDialog
          open={ccDialogOpen}
          onOpenChange={(v) => { setCCDialogOpen(v); if (!v) setCCRequestId(null); }}
          requestId={ccRequestId}
        />
      )}
    </>
  );
}
