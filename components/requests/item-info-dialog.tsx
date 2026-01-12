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
import { Package, Warehouse, Building2, AlertCircle, CheckCircle, FileText, Image, Calendar, DollarSign, Hash } from "lucide-react";
import { CompactImageGallery } from "@/components/ui/image-gallery";

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
  const queryArgs = itemName ? { itemName } : "skip";
  const inventoryItem = useQuery(
    api.inventory.getInventoryItemByName,
    queryArgs
  );

  const stock = inventoryItem?.centralStock ?? 0;
  const hasStock = stock > 0;
  const isLowStock = stock > 0 && stock < 10;

  // Get item photos
  const itemPhotos = inventoryItem?.images || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Item Details - {itemName}
          </DialogTitle>
          <DialogDescription>
            Comprehensive information about this item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Photos */}
          {itemPhotos.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Image className="h-4 w-4" />
                Item Photos
              </Label>
              <CompactImageGallery
                images={itemPhotos}
                maxDisplay={4}
                size="lg"
              />
            </div>
          )}

          {/* Basic Item Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  Item Name
                </Label>
                <p className="font-medium text-base">{itemName}</p>
              </div>

              {inventoryItem?.description && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Description
                  </Label>
                  <p className="text-sm text-muted-foreground">{inventoryItem.description}</p>
                </div>
              )}

              {inventoryItem?.hsnSacCode && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Hash className="h-4 w-4" />
                    HSN/SAC Code
                  </Label>
                  <Badge variant="outline" className="font-mono">{inventoryItem.hsnSacCode}</Badge>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Inventory Stock */}
              <div className="space-y-3">
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
                        className="font-semibold text-sm px-3 py-1"
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
                    <Badge variant="outline" className="font-semibold text-sm px-3 py-1">
                      Not in Inventory
                    </Badge>
                  )}
                </div>

                {inventoryItem && inventoryItem.unit && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Unit</Label>
                    <Badge variant="secondary">{inventoryItem.unit}</Badge>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Stock Status Message */}
          {inventoryItem && (
            <div className="space-y-3">
              {!hasStock && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ This item is out of stock in inventory
                  </p>
                </div>
              )}
              {isLowStock && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                    ⚠️ Low stock alert: Only {stock} {inventoryItem.unit || "units"} remaining (below recommended levels)
                  </p>
                </div>
              )}
              {hasStock && !isLowStock && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    ✓ Sufficient stock available in inventory
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Additional Item Details */}
          {inventoryItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            </div>
          )}

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {inventoryItem.vendors.map((vendor: any, idx: number) => (
                      <div key={vendor._id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                        <p className="font-medium text-sm">{vendor.companyName}</p>
                        {vendor.phone && (
                          <p className="text-xs text-muted-foreground">📞 {vendor.phone}</p>
                        )}
                        {vendor.email && (
                          <p className="text-xs text-muted-foreground">✉️ {vendor.email}</p>
                        )}
                        {vendor.address && (
                          <p className="text-xs text-muted-foreground">📍 {vendor.address}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : inventoryItem.vendor ? (
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <p className="font-medium text-sm">{inventoryItem.vendor.companyName}</p>
                    {inventoryItem.vendor.phone && (
                      <p className="text-xs text-muted-foreground">📞 {inventoryItem.vendor.phone}</p>
                    )}
                    {inventoryItem.vendor.email && (
                      <p className="text-xs text-muted-foreground">✉️ {inventoryItem.vendor.email}</p>
                    )}
                    {inventoryItem.vendor.address && (
                      <p className="text-xs text-muted-foreground">📍 {inventoryItem.vendor.address}</p>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}

          {!inventoryItem && (
            <div className="p-4 rounded-lg bg-muted/30 border">
              <p className="text-sm text-muted-foreground">
                This item is not currently in the inventory system. Consider adding it to track stock levels and vendor information.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

