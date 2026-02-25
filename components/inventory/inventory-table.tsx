"use client";

/**
 * Inventory Table Component
 * 
 * Displays all inventory items in a table or card view with images and actions.
 * Purchase Officer: Full CRUD
 * Manager and Site Engineer: Read-only, but Site Engineer can add images
 */

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryCard } from "./inventory-card";
import { ReadMoreText } from "@/components/ui/read-more-text";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal, Edit, Trash2, Image as ImageIcon, Plus, Package, Building2, Calendar, Box, Info, Mail, Phone, Hash, MapPin } from "lucide-react";
import { ImageSlider } from "@/components/ui/image-slider";
import { LazyImage } from "@/components/ui/lazy-image";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { InventoryFormDialog } from "./inventory-form-dialog";
import { ItemInfoDialog } from "../requests/item-info-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { VendorDetailsDialog } from "./vendor-details-dialog";

type ViewMode = "table" | "card";

interface InventoryTableProps {
  items: typeof import("@/convex/_generated/api").api.inventory.getAllInventoryItems._returnType | undefined;
  viewMode?: ViewMode;
  onRefresh?: () => void;
}


export function InventoryTable({ items, viewMode = "table", onRefresh }: InventoryTableProps) {

  const userRole = useUserRole();
  const deleteItem = useMutation(api.inventory.deleteInventoryItem);
  const removeImage = useMutation(api.inventory.removeImageFromInventory);

  // Debug logging removed for production

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Doc<"inventory"> | null>(null);
  const [deletingItem, setDeletingItem] = useState<Doc<"inventory"> | null>(null);
  const [addingImageItem, setAddingImageItem] = useState<Doc<"inventory"> | null>(null);
  const [removingImageKey, setRemovingImageKey] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [imageSliderOpen, setImageSliderOpen] = useState(false);
  const [imageSliderImages, setImageSliderImages] = useState<Array<{ imageUrl: string; imageKey: string }>>([]);
  const [imageSliderItemName, setImageSliderItemName] = useState("");
  const [imageSliderInitialIndex, setImageSliderInitialIndex] = useState(0);
  const [selectedVendorDetails, setSelectedVendorDetails] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canPerformCRUD = userRole === ROLES.PURCHASE_OFFICER; // Only Purchase Officers can edit/delete
  const canAddImages = userRole === ROLES.PURCHASE_OFFICER || userRole === ROLES.SITE_ENGINEER; // Purchase Officers and Site Engineers can add images

  const openImageSlider = (images: Array<{ imageUrl: string; imageKey: string }>, itemName: string, initialIndex: number = 0) => {
    setImageSliderImages(images);
    setImageSliderItemName(itemName);
    setImageSliderInitialIndex(initialIndex);
    setImageSliderOpen(true);
  };

  const initialFormData = useMemo(() => {
    if (!editingItem) return null;
    return {
      itemName: editingItem.itemName,
      description: editingItem.description,
      hsnSacCode: editingItem.hsnSacCode,
      unit: editingItem.unit ?? "",
      centralStock: editingItem.centralStock ?? 0,
      vendorIds: (editingItem as any).vendorIds ||
        (editingItem.vendorId ? [editingItem.vendorId] : []),
    };
  }, [editingItem]);

  if (!items) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No inventory items found. Add your first item to get started.
      </div>
    );
  }


  const handleEdit = (item: Doc<"inventory">) => setEditingItem(item);
  const handleDeleteTrigger = (item: Doc<"inventory">) => setDeletingItem(item);
  const handleManageImages = (item: Doc<"inventory">) => setAddingImageItem(item);
  const handleImageClick = (item: Doc<"inventory">, index: number) => {
    if (item.images && item.images.length > 0) {
      openImageSlider(item.images, item.itemName, index);
    }
  };


  const handleDelete = async () => {
    if (!deletingItem) return;

    setLoadingItemId(deletingItem._id);
    try {
      // Delete all images from R2 first
      if (deletingItem.images && deletingItem.images.length > 0) {
        for (const img of deletingItem.images) {
          try {
            await fetch(`/api/delete/image?key=${encodeURIComponent(img.imageKey)}`, {
              method: "DELETE",
            });
          } catch (error) {
            console.error("Failed to delete image:", error);
          }
        }
      }

      await deleteItem({ itemId: deletingItem._id });
      toast.success("Inventory item deleted successfully");
      setDeletingItem(null);
    } catch (error) {
      toast.error("Failed to delete inventory item");
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleRemoveImage = async (itemId: string, imageKey: string) => {
    setRemovingImageKey(imageKey);
    try {
      // Delete from R2
      await fetch(`/api/delete/image?key=${encodeURIComponent(imageKey)}`, {
        method: "DELETE",
      });

      // Remove from database
      await removeImage({ itemId: itemId as any, imageKey });
      toast.success("Image removed successfully");
    } catch (error) {
      toast.error("Failed to remove image");
    } finally {
      setRemovingImageKey(null);
    }
  };

  return (
    <>
      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[200px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Item Name</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Stock</TableHead>
                  <TableHead className="w-[80px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Unit</TableHead>
                  <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">HSN/SAC</TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Description</TableHead>
                  <TableHead className="w-[180px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Vendor</TableHead>
                  <TableHead className="w-[80px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Images</TableHead>
                  <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Created</TableHead>
                  {(canPerformCRUD || canAddImages) && (
                    <TableHead className="w-[60px] text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow
                    key={item._id}
                    className={cn(
                      "group transition-all duration-300 border-b last:border-0",
                      "hover:bg-primary/5 hover:shadow-sm hover:z-10 hover:relative", // Hover effects
                      index % 2 === 0 ? "bg-background" : "bg-muted/20", // Clear zebra striping
                      "animate-in fade-in slide-in-from-bottom-3" // Entrance animation
                    )}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    <TableCell className="font-medium align-top py-4 pl-4">
                      <button
                        onClick={() => setSelectedItemName(item.itemName)}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors text-left line-clamp-2"
                      >
                        {item.itemName}
                      </button>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "font-bold tabular-nums",
                          (item.centralStock || 0) > 0 ? "text-primary" : "text-destructive"
                        )}>
                          {item.centralStock}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase bg-background/50 backdrop-blur-sm">{item.unit}</Badge>
                    </TableCell>
                    <TableCell className="align-top py-4 text-sm text-muted-foreground font-medium">
                      {item.hsnSacCode || <span className="text-muted-foreground/30">—</span>}
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <ReadMoreText
                        text={item.description || "—"}
                        className="text-sm text-foreground/80 leading-relaxed max-w-[250px]"
                        truncateLength={60}
                      />
                    </TableCell>
                    <TableCell className="align-top py-4">
                      {((item as any).vendors && (item as any).vendors.length > 0) ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(item as any).vendors.slice(0, 2).map((vendor: any) => (
                            <div key={vendor._id} className="flex items-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] cursor-pointer hover:bg-primary/10 transition-colors font-semibold border-transparent hover:border-primary/20"
                                  >
                                    {vendor.companyName}
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" align="start">
                                  {/* Existing Vendor Popover Content */}
                                  <div className="space-y-3">
                                    <div>
                                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-primary" />
                                        {vendor.companyName}
                                      </h4>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex items-start gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">Email</p>
                                          <p className="font-medium">{vendor.email}</p>
                                        </div>
                                      </div>
                                      {vendor.phone && (
                                        <div className="flex items-start gap-2">
                                          <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-xs text-muted-foreground">Phone</p>
                                            <p className="font-medium">{vendor.phone}</p>
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex items-start gap-2">
                                        <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">GST Number</p>
                                          <p className="font-medium">{vendor.gstNumber}</p>
                                        </div>
                                      </div>
                                      {vendor.address && (
                                        <div className="flex items-start gap-2">
                                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-xs text-muted-foreground">Address</p>
                                            <p className="font-medium text-xs">{vendor.address}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          ))}
                          {(item as any).vendors.length > 2 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Badge variant="outline" className="text-[10px] bg-background cursor-pointer hover:bg-primary/5 transition-colors">
                                  +{(item as any).vendors.length - 2}
                                </Badge>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-0 rounded-lg shadow-lg border-border" align="start">
                                <div className="p-3 bg-muted/40 border-b border-border/50">
                                  <h4 className="font-semibold text-xs text-foreground">All Associated Vendors</h4>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                                  {(item as any).vendors.map((vendor: any, idx: number) => (
                                    <button
                                      key={idx}
                                      onClick={() => setSelectedVendorDetails(vendor)}
                                      className="w-full text-left p-2 hover:bg-muted/50 rounded-md transition-all duration-200 text-sm group/vendor border border-transparent hover:border-border/50 hover:shadow-sm"
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <Building2 className="h-3.5 w-3.5 text-primary group-hover/vendor:scale-110 transition-transform" />
                                        <span className="font-medium text-xs text-foreground group-hover/vendor:text-primary transition-colors">{vendor.companyName}</span>
                                      </div>
                                      {vendor.email && (
                                        <div className="flex items-center gap-2 text-muted-foreground ml-0.5">
                                          <Mail className="h-3 w-3" />
                                          <span className="text-[10px] truncate">{vendor.email}</span>
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      ) : (item as any).vendor ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge
                              variant="secondary"
                              className="text-[10px] cursor-pointer hover:bg-primary/10 transition-colors font-semibold border-transparent hover:border-primary/20"
                            >
                              {(item as any).vendor.companyName}
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4" align="start">
                            {/* Existing Single Vendor Popover Content - same structure */}
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-primary" />
                                  {(item as any).vendor.companyName}
                                </h4>
                              </div>
                              <div className="space-y-2 text-sm">
                                {/* Simplified vendor details for table view */}
                                <div className="grid gap-1">
                                  <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span>{(item as any).vendor.email}</span></div>
                                  {(item as any).vendor.phone && <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span> <span>{(item as any).vendor.phone}</span></div>}
                                  {(item as any).vendor.gstNumber && <div className="flex justify-between"><span className="text-muted-foreground">GST:</span> <span>{(item as any).vendor.gstNumber}</span></div>}
                                </div>
                                <div className="pt-2 border-t border-border/50">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-7 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5"
                                    onClick={() => setSelectedVendorDetails((item as any).vendor)}
                                  >
                                    View Full Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs italic">No Vendor</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex items-center gap-2">
                        {item.images && item.images.length > 0 ? (
                          <div className="relative group hover:scale-105 transition-transform duration-200">
                            <button
                              type="button"
                              onClick={() => openImageSlider(item.images || [], item.itemName, 0)}
                              className="block"
                            >
                              <LazyImage
                                src={item.images[0].imageUrl}
                                alt={`${item.itemName} 1`}
                                width={40}
                                height={40}
                                className="rounded-md border border-border/50 shadow-sm hover:border-primary/50 transition-colors h-10 w-10 object-cover"
                              />
                            </button>
                            {item.images.length > 1 && (
                              <div className="absolute -bottom-1 -right-1 bg-black/80 backdrop-blur-sm text-white rounded-full text-[8px] w-4 h-4 flex items-center justify-center font-bold ring-1 ring-white/20 shadow-sm">
                                +{item.images.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-muted/30 border border-transparent flex items-center justify-center text-muted-foreground/20">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground/70 text-xs align-top py-4 font-normal">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    {(canPerformCRUD || canAddImages) && (
                      <TableCell className="text-right align-top py-4 pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={loadingItemId === item._id}
                              className="h-8 w-8 text-muted-foreground/50 hover:text-primary hover:bg-primary/5 rounded-full"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {canPerformCRUD && (
                              <DropdownMenuItem onClick={() => setEditingItem(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Item
                              </DropdownMenuItem>
                            )}
                            {canAddImages && (
                              <DropdownMenuItem onClick={() => setAddingImageItem(item)}>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Manage Images
                              </DropdownMenuItem>
                            )}
                            {canPerformCRUD && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingItem(item)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Item
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pt-4 pb-10">
          {items?.map((item, index) => (
            <div
              key={item._id}
              className="animate-in fade-in slide-in-from-bottom-5"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <InventoryCard
                item={item}
                onEdit={handleEdit}
                onDelete={handleDeleteTrigger}
                onManageImages={handleManageImages}
                onImageClick={handleImageClick}
                onViewDetails={(item) => setSelectedItemName(item.itemName)}
                canPerformCRUD={canPerformCRUD}
                canAddImages={canAddImages}
              />
            </div>
          ))}
        </div>
      )}

      {/* Edit Item Dialog */}
      {canPerformCRUD && (
        <InventoryFormDialog
          open={editingItem !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingItem(null);
              onRefresh?.();
            }
          }}
          itemId={editingItem?._id}
          initialData={initialFormData}
          mode="edit"
        />
      )}

      {/* Add Images Dialog */}
      {canAddImages && (
        <InventoryFormDialog
          open={addingImageItem !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddingImageItem(null);
              onRefresh?.();
            }
          }}
          itemId={addingImageItem?._id || undefined}
          mode="add-image"
        />
      )}

      {/* Delete Confirmation Dialog */}
      {canPerformCRUD && (
        <AlertDialog
          open={deletingItem !== null}
          onOpenChange={(open) => !open && setDeletingItem(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{deletingItem?.itemName}</strong> and
                remove all associated data and images. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Item
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <ItemInfoDialog
        open={!!selectedItemName}
        onOpenChange={(open) => {
          if (!open) setSelectedItemName(null);
        }}
        itemName={selectedItemName}
      />

      <ImageSlider
        images={imageSliderImages}
        initialIndex={imageSliderInitialIndex}
        open={imageSliderOpen}
        onOpenChange={setImageSliderOpen}
        itemName={imageSliderItemName}
      />

      <VendorDetailsDialog
        open={!!selectedVendorDetails}
        onOpenChange={(open) => !open && setSelectedVendorDetails(null)}
        vendor={selectedVendorDetails}
      />
    </>
  );
}

