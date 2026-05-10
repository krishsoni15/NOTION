"use client";

/**
 * Item Information Dialog
 *
 * Shows detailed information about an inventory item including
 * images, category, HSN code, unit, stock, description, and vendors.
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Building2,
  AlertCircle,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Hash,
  ExternalLink,
  Phone,
  Mail,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  Ruler,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ImageGallery } from "@/components/ui/image-gallery";
import { cn } from "@/lib/utils";

interface ItemInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string | null;
}

export function ItemInfoDialog({ open, onOpenChange, itemName }: ItemInfoDialogProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const inventoryItem = useQuery(
    api.inventory.getInventoryItemByName,
    itemName ? { itemName } : "skip"
  );

  const stock = inventoryItem?.centralStock ?? 0;
  const hasStock = stock > 0;
  const isLowStock = stock > 0 && stock < 10;
  const itemPhotos = inventoryItem?.images || [];

  const handleViewInInventory = () => {
    if (itemName) {
      window.location.href = `/dashboard/inventory?search=${encodeURIComponent(itemName)}`;
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex((i) => (i - 1 + itemPhotos.length) % itemPhotos.length);
  };
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex((i) => (i + 1) % itemPhotos.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 rounded-2xl border border-border/40 shadow-2xl bg-background flex flex-col w-full outline-none"
      >
        {/* ── Header ── */}
        <DialogHeader className="shrink-0 px-5 pt-5 pb-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold text-foreground truncate">
                  {itemName || "Item Details"}
                </DialogTitle>
                {/* Quick badges row */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {(inventoryItem as any)?.categoryName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[11px] font-semibold border border-violet-200 dark:border-violet-800">
                      <Tag className="h-2.5 w-2.5" />
                      {(inventoryItem as any).categoryName}
                    </span>
                  )}
                  {inventoryItem?.unit && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-800">
                      <Ruler className="h-2.5 w-2.5" />
                      {inventoryItem.unit}
                    </span>
                  )}
                  {inventoryItem?.hsnSacCode && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 font-mono">
                      <Hash className="h-2.5 w-2.5" />
                      HSN: {inventoryItem.hsnSacCode}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {inventoryItem && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold rounded-full hidden sm:flex"
                  onClick={handleViewInInventory}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Full Details
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* ── Image + Stock row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Image */}
              <div
                className={cn(
                  "relative rounded-xl border border-border/50 bg-muted/30 overflow-hidden aspect-square",
                  itemPhotos.length > 0 && "cursor-pointer group"
                )}
                onClick={() => itemPhotos.length > 0 && setGalleryOpen(true)}
              >
                {itemPhotos.length > 0 ? (
                  <>
                    <img
                      src={itemPhotos[activePhotoIndex]?.imageUrl}
                      alt={itemName || "Item"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Zoom hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-black/80 text-foreground px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                        <ZoomIn className="h-3.5 w-3.5" /> View Gallery
                      </div>
                    </div>
                    {/* Multi-photo nav */}
                    {itemPhotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={prevPhoto}
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={nextPhoto}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {itemPhotos.map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                i === activePhotoIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    {/* Photo count badge */}
                    {itemPhotos.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {activePhotoIndex + 1}/{itemPhotos.length}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2">
                    <ImageIcon className="h-12 w-12 opacity-30" />
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-50">No Image</span>
                  </div>
                )}
              </div>

              {/* Stock + Status */}
              <div className="flex flex-col gap-3">
                {/* Stock card */}
                <div className="flex-1 p-4 rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Available Stock</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn(
                      "text-4xl font-black tracking-tighter",
                      hasStock ? "text-foreground" : "text-muted-foreground/50"
                    )}>
                      {stock}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">{inventoryItem?.unit || "units"}</span>
                  </div>
                  {hasStock && (
                    <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full",
                        isLowStock ? "bg-amber-500 w-1/4" : "bg-emerald-500 w-full"
                      )} />
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                  {inventoryItem ? (
                    !hasStock ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-sm font-bold">
                        <AlertCircle className="h-4 w-4" /> Out of Stock
                      </div>
                    ) : isLowStock ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-sm font-bold">
                        <AlertCircle className="h-4 w-4" /> Low Stock
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-sm font-bold">
                        <CheckCircle className="h-4 w-4" /> In Stock
                      </div>
                    )
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-bold">
                      <Hash className="h-4 w-4" /> Not in Inventory
                    </div>
                  )}
                </div>

                {/* Item details grid */}
                <div className="grid grid-cols-2 gap-2">
                  {inventoryItem?.unit && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Unit</p>
                      <p className="text-sm font-bold text-foreground">{inventoryItem.unit}</p>
                    </div>
                  )}
                  {inventoryItem?.hsnSacCode && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">HSN / SAC</p>
                      <p className="text-sm font-bold text-foreground font-mono">{inventoryItem.hsnSacCode}</p>
                    </div>
                  )}
                  {(inventoryItem as any)?.categoryName && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 col-span-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Category</p>
                      <p className="text-sm font-bold text-foreground">{(inventoryItem as any).categoryName}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Thumbnail strip (if multiple photos) ── */}
            {itemPhotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {itemPhotos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhotoIndex(i)}
                    className={cn(
                      "shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition-all",
                      i === activePhotoIndex ? "border-primary shadow-md" : "border-border/50 opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <Separator className="bg-border/50" />

            {/* ── Description ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Description</span>
              </div>
              {inventoryItem?.description ? (
                <div>
                  <p className={cn(
                    "text-sm text-muted-foreground leading-relaxed",
                    !descriptionExpanded && "line-clamp-3"
                  )}>
                    {inventoryItem.description}
                  </p>
                  {inventoryItem.description.length > 180 && (
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="mt-1.5 text-primary font-semibold text-xs flex items-center gap-1 hover:underline"
                    >
                      {descriptionExpanded
                        ? <><ChevronUp className="h-3 w-3" /> Show Less</>
                        : <><ChevronDown className="h-3 w-3" /> Read More</>}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">No description available.</p>
              )}

              {(inventoryItem as any)?.specification && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Specification / Model No</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{(inventoryItem as any).specification}</p>
                </div>
              )}
            </div>

            <Separator className="bg-border/50" />

            {/* ── Vendor Information ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-bold text-foreground">Vendor Information</span>
              </div>

              {inventoryItem && (inventoryItem.vendor || (inventoryItem.vendors && inventoryItem.vendors.length > 0)) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(inventoryItem.vendors?.length ? inventoryItem.vendors : [inventoryItem.vendor])
                    .filter(Boolean)
                    .map((vendor: any) => (
                      <div key={vendor._id || "default"} className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-bold text-sm text-foreground truncate">{vendor.companyName}</p>
                            {vendor.phone && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />{vendor.phone}
                              </p>
                            )}
                            {vendor.email && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                <Mail className="h-3 w-3" />{vendor.email}
                              </p>
                            )}
                            {vendor.gstNumber && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                <Hash className="h-3 w-3" />GST: {vendor.gstNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-border/50 bg-muted/10 text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground/60">No vendor linked to this item.</p>
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
