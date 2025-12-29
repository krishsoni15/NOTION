"use client";

/**
 * Item Information Dialog
 * 
 * Shows detailed information about an item including inventory count
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Package, Warehouse, Building2, AlertCircle, CheckCircle } from "lucide-react";

interface ItemInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string | null;
}

export function ItemInfoDialog({
  open,
  onOpenChange,
  itemName,
}: ItemInfoDialogProps) {
  const inventoryItem = useQuery(
    api.inventory.getInventoryItemByName,
    itemName ? { itemName } : "skip"
  );

  const stock = inventoryItem?.centralStock ?? 0;
  const hasStock = stock > 0;
  const isLowStock = stock > 0 && stock < 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Item Information
          </DialogTitle>
          <DialogDescription>
            Details about {itemName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Item Name</Label>
            <p className="font-medium text-base">{itemName}</p>
          </div>

          <Separator />

          {/* Inventory Stock */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Warehouse className="h-4 w-4" />
                Inventory Stock
              </Label>
              <div className="flex items-center gap-2">
                {inventoryItem ? (
                  <>
                    <Badge
                      variant={
                        !hasStock
                          ? "destructive"
                          : isLowStock
                          ? "outline"
                          : "default"
                      }
                      className="font-semibold"
                    >
                      {stock} {inventoryItem.unit || "units"}
                    </Badge>
                    {!hasStock && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {hasStock && !isLowStock && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="font-semibold">
                    Not in Inventory
                  </Badge>
                )}
              </div>
            </div>

            {inventoryItem && (
              <>
                {inventoryItem.unit && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Unit</Label>
                    <p className="text-sm">{inventoryItem.unit}</p>
                  </div>
                )}

                {/* Stock Status Message */}
                {!hasStock && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ This item is out of stock in inventory
                    </p>
                  </div>
                )}
                {isLowStock && (
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                      ⚠️ Low stock: Only {stock} {inventoryItem.unit || "units"} remaining
                    </p>
                  </div>
                )}
                {hasStock && !isLowStock && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                      ✓ Sufficient stock available
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Vendor Information */}
          {inventoryItem && (inventoryItem.vendor || (inventoryItem.vendors && inventoryItem.vendors.length > 0)) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Vendor Information
                </h3>
                {inventoryItem.vendors && inventoryItem.vendors.length > 0 ? (
                  <div className="space-y-2">
                    {inventoryItem.vendors.map((vendor: any, idx: number) => (
                      <div key={vendor._id} className="p-2 rounded-lg border bg-muted/30">
                        <p className="font-medium text-sm">{vendor.companyName}</p>
                        {vendor.phone && (
                          <p className="text-xs text-muted-foreground">Phone: {vendor.phone}</p>
                        )}
                        {vendor.email && (
                          <p className="text-xs text-muted-foreground">Email: {vendor.email}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : inventoryItem.vendor ? (
                  <div className="p-2 rounded-lg border bg-muted/30">
                    <p className="font-medium text-sm">{inventoryItem.vendor.companyName}</p>
                    {inventoryItem.vendor.phone && (
                      <p className="text-xs text-muted-foreground">Phone: {inventoryItem.vendor.phone}</p>
                    )}
                    {inventoryItem.vendor.email && (
                      <p className="text-xs text-muted-foreground">Email: {inventoryItem.vendor.email}</p>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}

          {!inventoryItem && (
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-sm text-muted-foreground">
                This item is not currently in the inventory system.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

