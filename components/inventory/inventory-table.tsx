"use client";

/**
 * Inventory Table Component
 * 
 * Displays all inventory items in a table or card view with images and actions.
 * Purchase Officer: Full CRUD
 * Manager and Site Engineer: Read-only, but Site Engineer can add images
 */

import { useState } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { MoreHorizontal, Edit, Trash2, Image as ImageIcon, Plus, Package, Building2, Calendar, Box, Info, Mail, Phone, Hash, MapPin } from "lucide-react";
import { ImageViewer } from "@/components/ui/image-viewer";
import { LazyImage } from "@/components/ui/lazy-image";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { InventoryFormDialog } from "./inventory-form-dialog";
import { ItemInfoDialog } from "../requests/item-info-dialog";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type ViewMode = "table" | "card";

interface InventoryTableProps {
  items: typeof import("@/convex/_generated/api").api.inventory.getAllInventoryItems._returnType | undefined;
  viewMode?: ViewMode;
}

export function InventoryTable({ items, viewMode = "table" }: InventoryTableProps) {
  const userRole = useUserRole();
  const deleteItem = useMutation(api.inventory.deleteInventoryItem);
  const removeImage = useMutation(api.inventory.removeImageFromInventory);

  // Debug logging
  console.log('InventoryTable items:', items);
  console.log('First item images:', items?.[0]?.images);

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Doc<"inventory"> | null>(null);
  const [deletingItem, setDeletingItem] = useState<Doc<"inventory"> | null>(null);
  const [addingImageItem, setAddingImageItem] = useState<Doc<"inventory"> | null>(null);
  const [removingImageKey, setRemovingImageKey] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<Array<{imageUrl: string; imageKey: string}>>([]);
  const [imageViewerItemName, setImageViewerItemName] = useState("");
  const [imageViewerInitialIndex, setImageViewerInitialIndex] = useState(0);

  const canPerformCRUD = userRole === ROLES.PURCHASE_OFFICER; // Only Purchase Officers can edit/delete
  const canAddImages = userRole === ROLES.PURCHASE_OFFICER || userRole === ROLES.SITE_ENGINEER; // Purchase Officers and Site Engineers can add images

  const openImageViewer = (images: Array<{imageUrl: string; imageKey: string}>, itemName: string, initialIndex: number = 0) => {
    setImageViewerImages(images);
    setImageViewerItemName(itemName);
    setImageViewerInitialIndex(initialIndex);
    setImageViewerOpen(true);
  };

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

  const InventoryCard = ({ item }: { item: Doc<"inventory"> }) => {
    return (
      <Card className="hover:shadow-lg transition-all border-border/50">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <button
                  onClick={() => setSelectedItemName(item.itemName)}
                  className="truncate text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20"
                >
                  {item.itemName}
                </button>
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {item.unit}
                </Badge>
              </div>
            </div>
            {(canPerformCRUD || canAddImages) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canPerformCRUD && (
                    <>
                      <DropdownMenuItem onClick={() => setEditingItem(item)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Item
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {canAddImages && (
                    <DropdownMenuItem onClick={() => setAddingImageItem(item)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Images
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
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Box className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-xs">Central Stock</p>
              <p className="font-medium">{item.centralStock}</p>
            </div>
          </div>
          {((item as any).vendors && (item as any).vendors.length > 0) || (item as any).vendor ? (
            <div className="flex items-start gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">
                  {(item as any).vendors?.length > 1 ? "Vendors" : "Vendor"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {((item as any).vendors && (item as any).vendors.length > 0)
                    ? (item as any).vendors.map((vendor: any) => (
                        <div key={vendor._id} className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                              >
                                {vendor.companyName}
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start">
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
                      ))
                    : (item as any).vendor && (
                        <div className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                              >
                                {(item as any).vendor.companyName}
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    {(item as any).vendor.companyName}
                                  </h4>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-start gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Email</p>
                                      <p className="font-medium">{(item as any).vendor.email}</p>
                                    </div>
                                  </div>
                                  {(item as any).vendor.phone && (
                                    <div className="flex items-start gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="font-medium">{(item as any).vendor.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">GST Number</p>
                                      <p className="font-medium">{(item as any).vendor.gstNumber}</p>
                                    </div>
                                  </div>
                                  {(item as any).vendor.address && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Address</p>
                                        <p className="font-medium text-xs">{(item as any).vendor.address}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 hover:bg-primary/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Info className="h-3 w-3 text-primary" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    {(item as any).vendor.companyName}
                                  </h4>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-start gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Email</p>
                                      <p className="font-medium">{(item as any).vendor.email}</p>
                                    </div>
                                  </div>
                                  {((item as any).vendor as any).phone && (
                                    <div className="flex items-start gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="font-medium">{((item as any).vendor as any).phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  {((item as any).vendor as any).gstNumber && (
                                    <div className="flex items-start gap-2">
                                      <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">GST Number</p>
                                        <p className="font-medium">{((item as any).vendor as any).gstNumber}</p>
                                      </div>
                                    </div>
                                  )}
                                  {((item as any).vendor as any).address && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Address</p>
                                        <p className="font-medium text-xs">{((item as any).vendor as any).address}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                </div>
              </div>
            </div>
          ) : null}
          {/* Image Section - Always show for debugging */}
          <div className="flex items-start gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-xs mb-1.5">
                Images ({item.images?.length || 0})
              </p>
              <div className="flex items-center gap-2">
                {item.images && item.images.length > 0 ? (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Opening image viewer for:', item.itemName, item.images);
                        openImageViewer(item.images || [], item.itemName, 0);
                      }}
                      className="block"
                    >
                      <LazyImage
                        src={item.images[0].imageUrl}
                        alt={`${item.itemName} 1`}
                        width={48}
                        height={48}
                        className="rounded border hover:border-primary transition-colors"
                      />
                    </button>
                    {canPerformCRUD && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.images && item.images[0]) {
                            handleRemoveImage(item._id, item.images[0].imageKey);
                          }
                        }}
                        disabled={removingImageKey === (item.images && item.images[0]?.imageKey)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs w-4 h-4 flex items-center justify-center z-10"
                      >
                        ×
                      </button>
                    )}
                    {item.images.length > 1 && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center font-medium">
                        +{item.images.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No images uploaded
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setLoadingItemId(deletingItem._id);
    try {
      // Delete all images from Cloudinary first
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
      // Delete from Cloudinary
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
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Central Stock</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Created</TableHead>
                  {(canPerformCRUD || canAddImages) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => setSelectedItemName(item.itemName)}
                        className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20"
                      >
                        {item.itemName}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.unit}</Badge>
                    </TableCell>
                    <TableCell>{item.centralStock}</TableCell>
                    <TableCell>
                      {((item as any).vendors && (item as any).vendors.length > 0) ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(item as any).vendors.slice(0, 2).map((vendor: any) => (
                            <div key={vendor._id} className="flex items-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                                  >
                                    {vendor.companyName}
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" align="start">
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
                            <Badge variant="outline" className="text-xs">
                              +{(item as any).vendors.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (item as any).vendor ? (
                        <div className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                              >
                                {(item as any).vendor.companyName}
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    {(item as any).vendor.companyName}
                                  </h4>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-start gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Email</p>
                                      <p className="font-medium">{(item as any).vendor.email}</p>
                                    </div>
                                  </div>
                                  {(item as any).vendor.phone && (
                                    <div className="flex items-start gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="font-medium">{(item as any).vendor.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">GST Number</p>
                                      <p className="font-medium">{(item as any).vendor.gstNumber}</p>
                                    </div>
                                  </div>
                                  {(item as any).vendor.address && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Address</p>
                                        <p className="font-medium text-xs">{(item as any).vendor.address}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 hover:bg-primary/10"
                              >
                                <Info className="h-3 w-3 text-primary" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    {(item as any).vendor.companyName}
                                  </h4>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-start gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Email</p>
                                      <p className="font-medium">{(item as any).vendor.email}</p>
                                    </div>
                                  </div>
                                  {((item as any).vendor as any).phone && (
                                    <div className="flex items-start gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="font-medium">{((item as any).vendor as any).phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  {((item as any).vendor as any).gstNumber && (
                                    <div className="flex items-start gap-2">
                                      <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">GST Number</p>
                                        <p className="font-medium">{((item as any).vendor as any).gstNumber}</p>
                                      </div>
                                    </div>
                                  )}
                                  {((item as any).vendor as any).address && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Address</p>
                                        <p className="font-medium text-xs">{((item as any).vendor as any).address}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CompactImageGallery
                          images={item.images ? item.images.map(img => ({ imageUrl: img.imageUrl, imageKey: img.imageKey })) : []}
                          maxDisplay={1}
                          size="md"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    {(canPerformCRUD || canAddImages) && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={loadingItemId === item._id}
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {canPerformCRUD && (
                              <>
                                <DropdownMenuItem onClick={() => setEditingItem(item)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Item
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {canAddImages && (
                              <DropdownMenuItem onClick={() => setAddingImageItem(item)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Images
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <InventoryCard key={item._id} item={item} />
          ))}
        </div>
      )}

      {/* Edit Item Dialog */}
      {canPerformCRUD && (
        <InventoryFormDialog
          open={editingItem !== null}
          onOpenChange={(open) => !open && setEditingItem(null)}
          itemId={editingItem?._id}
          initialData={editingItem
            ? {
                itemName: editingItem.itemName,
                unit: editingItem.unit ?? "",
                centralStock: editingItem.centralStock ?? 0,
                vendorIds: (editingItem as any).vendorIds || 
                          (editingItem.vendorId ? [editingItem.vendorId] : []),
              }
            : null}
          mode="edit"
        />
      )}

      {/* Add Images Dialog */}
      {canAddImages && (
        <InventoryFormDialog
          open={addingImageItem !== null}
          onOpenChange={(open) => !open && setAddingImageItem(null)}
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

      <ImageViewer
        images={imageViewerImages}
        initialIndex={imageViewerInitialIndex}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        itemName={imageViewerItemName}
      />
    </>
  );
}

