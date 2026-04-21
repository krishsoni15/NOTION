"use client";

/**
 * Direct DC Selection Dialog - Step 1
 *
 * Allows users to choose between:
 * 1. Using Purchase Orders (PO) - Quick select recent 3 POs or browse all
 * 2. Manual Entry - Directly input item details
 *
 * On continue → passes selected items to CreateDeliveryDialog (Step 2)
 */

import { useState } from "react";
import { useQuery } from "convex/react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Plus, X, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface ManualItem {
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
}

interface DirectDCSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (path: "po" | "manual", selectedPOs?: Id<"purchaseOrders">[], manualItems?: ManualItem[]) => void;
}

export function DirectDCSelectionDialog({
  open,
  onOpenChange,
  onContinue,
}: DirectDCSelectionDialogProps) {
  const [creationPath, setCreationPath] = useState<"po" | "manual">("po");
  const [selectedPOIds, setSelectedPOIds] = useState<Set<Id<"purchaseOrders">>>(new Set());
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [currentManualItem, setCurrentManualItem] = useState<ManualItem>({
    itemName: "",
    description: "",
    quantity: 0,
    unit: "",
    rate: 0,
    discount: 0,
  });
  const [showBrowseAllPOs, setShowBrowseAllPOs] = useState(false);

  // Fetch recent POs for quick selection
  const recentPOs = useQuery(api.purchaseOrders.getRecentPurchaseOrders, { limit: 3 });
  const allPOs = useQuery(api.purchaseOrders.getAllPurchaseOrders, {});

  const handleAddManualItem = () => {
    if (!currentManualItem.itemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!currentManualItem.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (currentManualItem.quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!currentManualItem.unit.trim()) {
      toast.error("Unit is required");
      return;
    }
    if (currentManualItem.rate < 0) {
      toast.error("Rate must be non-negative");
      return;
    }

    setManualItems([...manualItems, currentManualItem]);
    setCurrentManualItem({
      itemName: "",
      description: "",
      quantity: 0,
      unit: "",
      rate: 0,
      discount: 0,
    });
    toast.success("Item added");
  };

  const handleRemoveManualItem = (index: number) => {
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const handleTogglePO = (poId: Id<"purchaseOrders">) => {
    const newSelected = new Set(selectedPOIds);
    if (newSelected.has(poId)) {
      newSelected.delete(poId);
    } else {
      newSelected.add(poId);
    }
    setSelectedPOIds(newSelected);
  };

  const handleContinue = () => {
    if (creationPath === "po") {
      if (selectedPOIds.size === 0) {
        toast.error("Please select at least one Purchase Order");
        return;
      }
      onContinue("po", Array.from(selectedPOIds));
    } else {
      if (manualItems.length === 0) {
        toast.error("Please add at least one item");
        return;
      }
      onContinue("manual", undefined, manualItems);
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    setCreationPath("po");
    setSelectedPOIds(new Set());
    setManualItems([]);
    setCurrentManualItem({
      itemName: "",
      description: "",
      quantity: 0,
      unit: "",
      rate: 0,
      discount: 0,
    });
    setShowBrowseAllPOs(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Delivery Challan</DialogTitle>
          <DialogDescription>
            Choose how you want to create your delivery challan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Creation Path Selection */}
          <RadioGroup value={creationPath} onValueChange={(v) => setCreationPath(v as "po" | "manual")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="po" id="path-po" />
              <Label htmlFor="path-po" className="cursor-pointer font-medium">
                Using Purchase Orders
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="path-manual" />
              <Label htmlFor="path-manual" className="cursor-pointer font-medium">
                Manual Entry
              </Label>
            </div>
          </RadioGroup>

          {/* PO Selection Path */}
          {creationPath === "po" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Recent Purchase Orders (Quick Select)</Label>
                {recentPOs && recentPOs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {recentPOs.map((po) => (
                      <Card
                        key={po._id}
                        className={`p-3 cursor-pointer transition-colors ${
                          selectedPOIds.has(po._id)
                            ? "bg-blue-50 border-blue-300"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleTogglePO(po._id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedPOIds.has(po._id)}
                            onChange={() => handleTogglePO(po._id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-mono font-bold text-sm">{po.poNumber}</div>
                            <div className="text-sm text-gray-600">{po.itemDescription}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Qty: {po.quantity} {po.unit}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-4">No recent POs available</div>
                )}
              </div>

              {/* Browse All POs Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBrowseAllPOs(!showBrowseAllPOs)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Browse All Purchase Orders
              </Button>

              {/* Browse All POs */}
              {showBrowseAllPOs && allPOs && allPOs.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                  {allPOs.map((po) => (
                    <Card
                      key={po._id}
                      className={`p-2 cursor-pointer transition-colors ${
                        selectedPOIds.has(po._id)
                          ? "bg-blue-50 border-blue-300"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleTogglePO(po._id)}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPOIds.has(po._id)}
                          onChange={() => handleTogglePO(po._id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-mono font-bold">{po.poNumber}</div>
                          <div className="text-gray-600">{po.itemDescription}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {selectedPOIds.size > 0 && (
                <div className="text-sm text-blue-600 font-medium">
                  {selectedPOIds.size} PO(s) selected
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Path */}
          {creationPath === "manual" && (
            <div className="space-y-4">
              {/* Current Item Form */}
              <Card className="p-4 space-y-3">
                <Label className="text-sm font-medium">Add Item</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Item Name"
                    value={currentManualItem.itemName}
                    onChange={(e) =>
                      setCurrentManualItem({ ...currentManualItem, itemName: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Unit"
                    value={currentManualItem.unit}
                    onChange={(e) =>
                      setCurrentManualItem({ ...currentManualItem, unit: e.target.value })
                    }
                  />
                </div>
                <Input
                  placeholder="Description"
                  value={currentManualItem.description}
                  onChange={(e) =>
                    setCurrentManualItem({ ...currentManualItem, description: e.target.value })
                  }
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={currentManualItem.quantity || ""}
                    onChange={(e) =>
                      setCurrentManualItem({
                        ...currentManualItem,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Rate"
                    value={currentManualItem.rate || ""}
                    onChange={(e) =>
                      setCurrentManualItem({
                        ...currentManualItem,
                        rate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Discount %"
                    value={currentManualItem.discount || ""}
                    onChange={(e) =>
                      setCurrentManualItem({
                        ...currentManualItem,
                        discount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAddManualItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </Card>

              {/* Added Items List */}
              {manualItems.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Added Items ({manualItems.length})</Label>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {manualItems.map((item, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 text-sm">
                            <div className="font-medium">{item.itemName}</div>
                            <div className="text-gray-600 text-xs">{item.description}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              Qty: {item.quantity} {item.unit} | Rate: ₹{item.rate} | Discount: {item.discount}%
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveManualItem(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleContinue} className="gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
