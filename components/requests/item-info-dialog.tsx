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
  ZoomIn,
  X,
  ChevronDown,
  ChevronUp
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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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
      <DialogContent
        showCloseButton={false}
        className="max-w-4xl max-h-[85vh] overflow-hidden p-0 gap-0 rounded-3xl border border-border/40 shadow-2xl bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-xl flex flex-col w-full outline-none"
      >
        {/* Header Section */}
        <div className="relative shrink-0 border-b border-border/10 bg-white/50 dark:bg-slate-900/50 p-6 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 text-white">
              <Package className="h-6 w-6" />
            </div>
            <div className="space-y-1 min-w-0">
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground truncate drop-shadow-sm">
                {itemName || "Item Details"}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                  <Hash className="h-3 w-3 opacity-50" />
                  Inventory Item
                </span>
                {inventoryItem?.hsnSacCode && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    HSN: {inventoryItem.hsnSacCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {inventoryItem && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex h-9 gap-2 rounded-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white text-xs font-bold text-slate-900 dark:text-slate-100 shadow-sm"
                onClick={handleViewInInventory}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Full Details
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-8">

            {/* Main Content Grid - Changed to Single Column */}
            <div className="flex flex-col gap-6">

              {/* Row 1: Image */}
              <div
                className={cn(
                  "relative aspect-square w-full sm:w-2/3 mx-auto rounded-3xl border border-border/50 bg-white dark:bg-slate-900 shadow-sm overflow-hidden group cursor-pointer",
                  !itemPhotos.length && "cursor-default"
                )}
                onClick={() => itemPhotos.length > 0 && setGalleryOpen(true)}
              >
                {itemPhotos.length > 0 ? (
                  <>
                    <div className="w-full h-full p-8 flex items-center justify-center">
                      <LazyImage
                        src={itemPhotos[0].imageUrl}
                        alt={itemName || "Item image"}
                        width={600}
                        height={600}
                        className="max-w-full max-h-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 bg-white dark:bg-slate-900 text-foreground px-5 py-2.5 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
                        <ZoomIn className="h-4 w-4" /> View Gallery
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 bg-slate-50 dark:bg-slate-900/50">
                    <ImageIcon className="h-20 w-20 mb-4 opacity-20" />
                    <span className="text-sm font-bold uppercase tracking-widest opacity-60">No Image Available</span>
                  </div>
                )}
              </div>

              {/* Row 2: Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase opacity-80 mb-2">Available Stock</div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "text-4xl font-black tracking-tighter",
                      hasStock ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {stock}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">{inventoryItem?.unit || "u"}</span>
                  </div>
                  {hasStock && (
                    <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-full" />
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-start">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase opacity-80 mb-3">Inventory Status</div>
                  {inventoryItem ? (
                    !hasStock ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50 w-full justify-center sm:w-auto">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="font-bold text-sm whitespace-nowrap">Out of Stock</span>
                      </div>
                    ) : isLowStock ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 w-full justify-center sm:w-auto">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="font-bold text-sm whitespace-nowrap">Low Stock</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 w-full justify-center sm:w-auto">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span className="font-bold text-sm whitespace-nowrap">In Stock</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 w-full justify-center sm:w-auto">
                      <Hash className="h-4 w-4 shrink-0" />
                      <span className="font-bold text-sm whitespace-nowrap">Unracked</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-bold text-foreground uppercase opacity-80">Description & Specs</span>
                </div>
                <div className="relative">
                  <p className={cn(
                    "text-sm text-muted-foreground leading-relaxed",
                    !descriptionExpanded && "line-clamp-3"
                  )}>
                    {inventoryItem?.description || <span className="italic opacity-50">No description available for this item.</span>}
                  </p>
                  {inventoryItem?.description && inventoryItem.description.length > 200 && (
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="mt-2 text-primary font-bold text-xs flex items-center gap-1 hover:underline"
                    >
                      {descriptionExpanded ? (
                        <>Show Less <ChevronUp className="h-3 w-3" /></>
                      ) : (
                        <>Read More <ChevronDown className="h-3 w-3" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>

            <Separator className="bg-border/50" />

            {/* Vendor Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-500" />
                <h3 className="font-bold text-lg tracking-tight">Vendor Information</h3>
              </div>

              {inventoryItem && (inventoryItem.vendor || (inventoryItem.vendors && inventoryItem.vendors.length > 0)) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(inventoryItem.vendors?.length ? inventoryItem.vendors : [inventoryItem.vendor]).filter(Boolean).map((vendor: any) => (
                    <div key={vendor._id || 'default'} className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="font-bold text-base text-foreground truncate">{vendor.companyName}</div>
                          {vendor.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              <Phone className="h-3.5 w-3.5" />
                              {vendor.phone}
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                              <Mail className="h-3.5 w-3.5" />
                              {vendor.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 text-center">
                  <div className="inline-flex h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-3 text-slate-400">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No vendor information associated with this item.</p>
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
