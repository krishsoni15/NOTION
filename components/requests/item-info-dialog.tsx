"use client";

/**
 * Item Information Dialog
 * 
 * Shows detailed information about an item including inventory count,
 * vendor details, and provides quick navigation to the inventory page.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Package,
  Warehouse,
  Building2,
  AlertCircle,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Hash,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  PackageX,
  ZoomIn
} from "lucide-react";
import { ImageGallery } from "@/components/ui/image-gallery";
import { LazyImage } from "@/components/ui/lazy-image";
import { cn } from "@/lib/utils";

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
  const [galleryOpen, setGalleryOpen] = useState(false);

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

  const handleViewInInventory = () => {
    if (itemName) {
      window.location.href = `/dashboard/inventory?search=${encodeURIComponent(itemName)}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 rounded-2xl border-none shadow-2xl bg-card flex flex-col w-full">
        {/* Helper Header Background */}
        <div className="h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent absolute w-full top-0 left-0 -z-10" />

        {/* Minimal Header */}
        <DialogHeader className="p-6 pb-4 border-b-0 shrink-0 z-10">
          <div className="flex items-start justify-between gap-4 pr-12">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-2.5 bg-background rounded-xl shadow-sm border border-border/50 shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground truncate block">
                  {itemName || "Item Details"}
                </DialogTitle>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                  Inventory & Vendor Overview
                </div>
              </div>
            </div>
            {inventoryItem && (
              <Button
                size="sm"
                className="shrink-0 gap-1.5 h-8 px-3.5 text-xs font-semibold bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-foreground border border-border/60 shadow-sm transition-all rounded-full hover:scale-105"
                onClick={handleViewInInventory}
              >
                <ExternalLink className="h-3 w-3" />
                Inventory
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-0">

          <div className="flex flex-col gap-8">

            {/* Top Section: Image & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 lg:gap-8">
              {/* Left: Image Card */}
              <div className="flex flex-col gap-4">
                <div
                  className={cn(
                    "relative aspect-square w-full rounded-2xl border border-border/50 bg-card overflow-hidden group cursor-pointer shadow-sm transition-all hover:shadow-md hover:border-primary/20",
                    !itemPhotos.length && "cursor-default hover:shadow-none hover:border-border/50"
                  )}
                  onClick={() => itemPhotos.length > 0 && setGalleryOpen(true)}
                >
                  {itemPhotos.length > 0 ? (
                    <>
                      <div className="w-full h-full p-3 flex items-center justify-center bg-white dark:bg-slate-950/20">
                        <LazyImage
                          src={itemPhotos[0].imageUrl}
                          alt={itemName || "Item image"}
                          width={400}
                          height={400}
                          className="max-w-full max-h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 dark:bg-black/80 text-foreground px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                          <ZoomIn className="h-3 w-3" /> Gallery
                        </div>
                      </div>
                      {itemPhotos.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md">
                          +{itemPhotos.length - 1}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 bg-muted/10">
                      <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">No Image</span>
                    </div>
                  )}
                </div>

                {/* HSN Code Badge */}
                {inventoryItem?.hsnSacCode && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-muted/20 rounded-xl border border-border/50">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">HSN/SAC</span>
                    <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px] bg-background border">{inventoryItem.hsnSacCode}</Badge>
                  </div>
                )}
              </div>

              {/* Right: Stats & Desc */}
              <div className="flex flex-col gap-4 min-w-0">
                <div className="grid grid-cols-2 gap-4">
                  {/* Stock Card */}
                  <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1 opacity-80">
                      Stock
                    </Label>
                    <div className="flex items-baseline gap-1 mt-1 flex-wrap">
                      <span className={cn(
                        "text-3xl font-black tracking-tight",
                        !hasStock ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {stock}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground truncate max-w-[80px]">{inventoryItem?.unit || "u"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted mt-3 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-1000",
                          !hasStock ? "bg-muted w-0" : isLowStock ? "bg-amber-500 w-1/4" : "bg-emerald-500 w-full"
                        )}
                      />
                    </div>
                  </div>

                  {/* Status Card */}
                  <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2 opacity-80">
                      Status
                    </Label>
                    <div className="min-h-[2.5rem] flex items-center">
                      {inventoryItem ? (
                        !hasStock ? (
                          <Badge variant="destructive" className="px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm whitespace-nowrap">
                            Out of Stock
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="px-2.5 py-1 border-amber-200/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 text-[11px] font-bold rounded-lg shadow-sm whitespace-nowrap">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="px-2.5 py-1 border-emerald-200/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-[11px] font-bold rounded-lg shadow-sm whitespace-nowrap">
                            In Stock
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Unracked</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {inventoryItem?.description ? (
                  <div className="flex-1 bg-muted/10 p-4 rounded-2xl border border-border/50 relative overflow-hidden">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2 opacity-80">
                      Description
                    </Label>
                    <div className="text-xs text-foreground/80 leading-relaxed max-h-[120px] overflow-y-auto custom-scrollbar">
                      {inventoryItem.description}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 bg-muted/5 p-4 rounded-2xl border border-dashed border-border/50 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground italic">No description available</span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Bottom Section: Vendors - Full Width Vertical Stack */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2 text-foreground/90 px-1">
                <div className="p-1 rounded bg-blue-500/10">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                </div>
                Vendor Information
              </h3>

              {inventoryItem && (inventoryItem.vendor || (inventoryItem.vendors && inventoryItem.vendors.length > 0)) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(inventoryItem.vendors?.length ? inventoryItem.vendors : [inventoryItem.vendor]).filter(Boolean).map((vendor: any) => (
                    <div key={vendor._id || 'default'} className="p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/10 transition-all hover:shadow-sm hover:border-primary/20 group flex items-start gap-4 overflow-hidden">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="font-bold text-sm text-foreground truncate" title={vendor.companyName}>{vendor.companyName}</p>
                        <div className="space-y-1">
                          {vendor.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                              <Phone className="h-3 w-3 shrink-0 opacity-70" /> {vendor.phone}
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                              <Mail className="h-3 w-3 shrink-0 opacity-70" />
                              <span className="truncate">{vendor.email}</span>
                            </div>
                          )}
                          {vendor.address && (
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0 mt-0.5 opacity-70" />
                              <span className="line-clamp-1">{vendor.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/5 rounded-2xl border border-dashed border-border/60">
                  <p className="text-xs text-muted-foreground">No vendor information available.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </DialogContent>

      <ImageGallery
        images={itemPhotos}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        title={itemName || "Item Images"}
      />
    </Dialog>
  );
}
