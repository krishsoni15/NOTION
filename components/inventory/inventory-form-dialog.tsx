"use client";

/**
 * Inventory Form Dialog
 * 
 * Dialog for creating and editing inventory items with image upload.
 * Purchase Officer can create/edit items.
 * Site Engineer can add images to existing items.
 */

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
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
import { UnitInput } from "./unit-input";
import { CameraDialog } from "./camera-dialog";
import { VendorSelector } from "./vendor-selector";
import { Camera, Upload, X, Search, XIcon } from "lucide-react";
import { ImageSlider } from "@/components/ui/image-slider";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId?: Id<"inventory"> | null;
  initialData?: {
    itemName: string;
    description?: string;
    hsnSacCode?: string;
    unit: string;
    centralStock: number;
    vendorId?: Id<"vendors">;
    vendorIds?: Id<"vendors">[];
  } | null;
  mode?: "create" | "edit" | "add-image"; // add-image for Site Engineer
}

export function InventoryFormDialog({
  open,
  onOpenChange,
  itemId,
  initialData,
  mode = "create",
}: InventoryFormDialogProps) {
  const userRole = useUserRole();
  const router = useRouter();
  const createItem = useMutation(api.inventory.createInventoryItem);
  const updateItem = useMutation(api.inventory.updateInventoryItem);
  const addImage = useMutation(api.inventory.addImageToInventory);

  // Determine if we're in add-image mode (needed before queries)
  const isAddImageMode = mode === "add-image";

  const currentItem = useQuery(
    api.inventory.getInventoryItemById,
    itemId ? { itemId } : "skip"
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ imageUrl: string; imageKey: string; uploadedAt: number; uploadedBy: Id<"users"> }>>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [formImageSliderOpen, setFormImageSliderOpen] = useState(false);
  const [formImageSliderImages, setFormImageSliderImages] = useState<Array<{ imageUrl: string; imageKey: string }>>([]);
  const [formImageSliderInitialIndex, setFormImageSliderInitialIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const canEdit = userRole === ROLES.PURCHASE_OFFICER && !isAddImageMode; // Only Purchase Officers can edit item details
  // Purchase Officer can add images when creating or editing items
  // Site Engineer can add images to existing items only
  const canAddImages =
    (userRole === ROLES.PURCHASE_OFFICER && !isAddImageMode) ||
    (userRole === ROLES.SITE_ENGINEER && itemId) ||
    isAddImageMode;
  // Allow managing images (add/remove) when user can add images or is editing existing item
  const canManageImages = canAddImages || (canEdit && itemId);

  const openFormImageSlider = (images: Array<{ imageUrl: string; imageKey: string }>, initialIndex: number) => {
    setFormImageSliderImages(images);
    setFormImageSliderInitialIndex(initialIndex);
    setFormImageSliderOpen(true);
  };

  const [formData, setFormData] = useState({
    itemName: "",
    description: "",
    hsnSacCode: "",
    unit: "",
    centralStock: 0,
    vendorIds: [] as Id<"vendors">[],
  });

  // Load initial data
  useEffect(() => {
    // Set form data from initialData or currentItem
    if (initialData) {
      setFormData({
        itemName: initialData.itemName,
        description: initialData.description || "",
        hsnSacCode: initialData.hsnSacCode || "",
        unit: initialData.unit,
        centralStock: initialData.centralStock,
        vendorIds: initialData.vendorIds || (initialData.vendorId ? [initialData.vendorId] : []),
      });
    } else if (currentItem) {
      // Support both old vendorId and new vendorIds format
      const vendorIds = (currentItem as any).vendorIds ||
        (currentItem.vendorId ? [currentItem.vendorId] : []);
      setFormData({
        itemName: currentItem.itemName,
        description: currentItem.description || "",
        hsnSacCode: (currentItem as any).hsnSacCode || "",
        unit: currentItem.unit ?? "",
        centralStock: currentItem.centralStock || 0,
        vendorIds: vendorIds,
      });
    } else {
      setFormData({
        itemName: "",
        description: "",
        hsnSacCode: "",
        unit: "",
        centralStock: 0,
        vendorIds: [],
      });
    }

    // Always load images from currentItem if available (for both edit and add-image modes)
    if (currentItem && currentItem.images) {
      if (currentItem.images.length > 0) {
        setExistingImages(currentItem.images);
        // Create preview URLs from existing images
        const existingPreviews = currentItem.images.map((img: any) => img.imageUrl);
        setImagePreviews(existingPreviews);
      } else {
        setExistingImages([]);
      }
    } else {
      setExistingImages([]);
    }

    setSelectedImages([]);
    setError("");
  }, [initialData, currentItem, isAddImageMode, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        itemName: "",
        description: "",
        hsnSacCode: "",
        unit: "",
        centralStock: 0,
        vendorIds: [],
      });
      setSelectedImages([]);
      setImagePreviews([]);
      setExistingImages([]);
      setError("");
    }
    onOpenChange(newOpen);
  };


  const handleCameraCapture = (file: File) => {
    const newImages = [...selectedImages, file];
    setSelectedImages(newImages);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImagePreviews((prev) => [...prev, result]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length === 0) {
      toast.error("Please select image files only");
      return;
    }

    if (validFiles.length !== newFiles.length) {
      toast.warning(`${newFiles.length - validFiles.length} non-image files were skipped`);
    }

    setSelectedImages((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    handleImageSelect(files);
  };

  const removeNewImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageKey: string, imageUrl: string) => {
    if (!itemId) return;

    try {
      const response = await fetch(`/api/delete/image?key=${encodeURIComponent(imageKey)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      // Update local state
      setExistingImages((prev) => prev.filter((img) => img.imageKey !== imageKey));
      setImagePreviews((prev) => prev.filter((url) => url !== imageUrl));
      toast.success("Image removed successfully");
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
    }
  };

  const uploadImages = async (itemId: string) => {
    const uploadPromises = selectedImages.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemId", itemId);

        const response = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(errorData.error || "Failed to upload image");
        }

        const data = await response.json();
        if (!data.imageUrl || !data.imageKey) {
          throw new Error("Invalid response from upload API");
        }

        return { imageUrl: data.imageUrl, imageKey: data.imageKey };
      } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate form data for create/edit modes
    if (!isAddImageMode && canEdit) {
      if (!formData.itemName.trim()) {
        setError("Item name is required");
        setIsLoading(false);
        return;
      }
      if (formData.centralStock === undefined || formData.centralStock <= 0) {
        setError("Central stock is required and must be greater than 0");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isAddImageMode && itemId) {
        // Add images only
        if (selectedImages.length === 0) {
          setError("Please select at least one image");
          setIsLoading(false);
          return;
        }

        setIsUploading(true);
        try {
          const imageData = await uploadImages(itemId);

          // Add each image to the inventory item in Convex
          for (const img of imageData) {
            await addImage({
              itemId,
              imageUrl: img.imageUrl,
              imageKey: img.imageKey,
            });
          }

          toast.success(`${imageData.length} image(s) added successfully`);
          console.log('Images uploaded successfully:', imageData);

          // Force a re-render by updating local state
          setSelectedImages([]);
          setImagePreviews([]);
          setExistingImages([]);

          // Close dialog - the parent component will handle refresh via onOpenChange callback
          handleOpenChange(false);
        } catch (uploadError) {
          console.error("Error uploading images:", uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload images";
          setError(errorMessage);
          toast.error(errorMessage);
          setIsUploading(false);
        }
      } else if (itemId && canEdit) {
        // Update existing item
        await updateItem({
          itemId,
          itemName: formData.itemName,
          description: formData.description,
          hsnSacCode: formData.hsnSacCode,
          unit: formData.unit || undefined,
          centralStock: formData.centralStock || undefined,
          vendorIds: formData.vendorIds.length > 0 ? formData.vendorIds : undefined,
        });

        // Upload images if any (after item is updated)
        if (selectedImages.length > 0) {
          setIsUploading(true);
          try {
            const imageData = await uploadImages(itemId);
            // Add each image to the inventory item in Convex
            for (const img of imageData) {
              await addImage({
                itemId,
                imageUrl: img.imageUrl,
                imageKey: img.imageKey,
              });
            }
          } catch (uploadError) {
            console.error("Error uploading images:", uploadError);
            toast.warning("Item updated but some images failed to upload");
          }
        }

        toast.success("Inventory item updated successfully");
        handleOpenChange(false);
      } else if (canEdit) {
        // Create new item first
        const newItemId = await createItem({
          itemName: formData.itemName,
          description: formData.description,
          hsnSacCode: formData.hsnSacCode,
          unit: formData.unit || undefined,
          centralStock: formData.centralStock || undefined,
          vendorIds: formData.vendorIds.length > 0 ? formData.vendorIds : undefined,
        });

        // Upload images if any (after item is created)
        if (selectedImages.length > 0) {
          setIsUploading(true);
          try {
            const imageData = await uploadImages(newItemId);
            // Add each image to the inventory item in Convex
            for (const img of imageData) {
              await addImage({
                itemId: newItemId,
                imageUrl: img.imageUrl,
                imageKey: img.imageKey,
              });
            }
          } catch (uploadError) {
            console.error("Error uploading images:", uploadError);
            // Item is already created, but images failed - show warning
            toast.warning("Item created but some images failed to upload");
          }
        }

        toast.success("Inventory item created successfully");
        handleOpenChange(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">

          <DialogTitle>
            {isAddImageMode
              ? "Manage Images - Inventory Item"
              : itemId
                ? "Edit Inventory Item"
                : "Add New Inventory Item"}
          </DialogTitle>
          <DialogDescription>
            {isAddImageMode
              ? "Manage images for this inventory item - add new images or remove existing ones"
              : itemId
                ? "Update inventory item information. Required fields are marked with * (Item Name, Central Stock)."
                : "Create a new inventory item. Required fields are marked with * (Item Name, Central Stock)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {!isAddImageMode && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name *</Label>
                  <Input
                    id="itemName"
                    placeholder="Enter item name"
                    value={formData.itemName}
                    onChange={(e) =>
                      setFormData({ ...formData, itemName: e.target.value })
                    }
                    required
                    disabled={isLoading || !canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hsnSacCode">HSN / SAC Code</Label>
                  <Input
                    id="hsnSacCode"
                    placeholder="Enter HSN/SAC code"
                    value={formData.hsnSacCode}
                    onChange={(e) =>
                      setFormData({ ...formData, hsnSacCode: e.target.value })
                    }
                    disabled={isLoading || !canEdit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="relative">
                  <textarea
                    id="description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter item description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={isLoading || !canEdit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="centralStock">
                    Central Stock *
                  </Label>
                  <Input
                    id="centralStock"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="33"
                    value={formData.centralStock || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        centralStock: e.target.value ? parseFloat(e.target.value) : 0,
                      })
                    }
                    disabled={isLoading || !canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <UnitInput
                    id="unit"
                    value={formData.unit}
                    onChange={(value) =>
                      setFormData({ ...formData, unit: value })
                    }
                    disabled={isLoading || !canEdit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendors">
                  Vendors <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <VendorSelector
                  selectedVendors={formData.vendorIds}
                  onSelectionChange={(vendorIds) =>
                    setFormData({ ...formData, vendorIds })
                  }
                  disabled={isLoading || !canEdit}
                />
              </div>
            </>
          )}

          {/* Image Upload Section */}
          {(canAddImages || (canEdit && itemId)) && (
            <div className="space-y-2">
              <Label>
                {isAddImageMode ? "Manage Images" : itemId ? "Manage Images" : "Add Images to Inventory Item"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isAddImageMode
                  ? "Add new images or remove existing ones for this inventory item"
                  : itemId
                    ? "Add new images or remove existing ones for this inventory item"
                    : "Upload images for this inventory item"
                }
              </p>
              <div
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files)}
                  multiple
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCameraOpen(true)}
                    disabled={isLoading || isUploading}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {isDragOver ? 'Drop images here' : 'Or drag and drop images here'}
                </p>
              </div>

              {/* Image Previews */}
              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="space-y-3 mt-2">
                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Existing Images ({existingImages.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {existingImages.map((image, index) => (
                          <div key={`existing-${image.imageKey}`} className="relative group">
                            <button
                              type="button"
                              onClick={() => openFormImageSlider(existingImages, index)}
                              className="block w-full"
                            >
                              <img
                                src={image.imageUrl}
                                alt={`Existing ${index + 1}`}
                                className="w-full h-16 sm:h-18 object-cover rounded border border-green-300 hover:border-green-500 transition-colors"
                              />
                            </button>
                            <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                              ✓
                            </div>
                            {canManageImages && (
                              <div className="absolute top-1 right-1 flex gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement replace functionality
                                    // For now, just remove and let user add new image
                                    removeExistingImage(image.imageKey, image.imageUrl);
                                  }}
                                  className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 transition-colors"
                                  title="Replace image"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeExistingImage(image.imageKey, image.imageUrl);
                                  }}
                                  className="bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                                  title="Remove image"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Images to Upload */}
                  {imagePreviews.length > existingImages.length && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        New Images to Upload ({imagePreviews.length - existingImages.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {imagePreviews.slice(existingImages.length).map((preview, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <button
                              type="button"
                              onClick={() => openFormImageSlider(imagePreviews.map((url, i) => ({ imageUrl: url, imageKey: `preview-${i}` })), existingImages.length + index)}
                              className="block w-full"
                            >
                              <img
                                src={preview}
                                alt={`New ${index + 1}`}
                                className="w-full h-16 sm:h-18 object-cover rounded border border-blue-300 hover:border-blue-500 transition-colors"
                              />
                            </button>
                            <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                              New
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNewImage(existingImages.length + index);
                              }}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start gap-2">
              <span className="text-destructive font-semibold">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading || isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading || isUploading ? (
                <>
                  <span className="mr-2">
                    {isUploading ? "Uploading..." : isAddImageMode ? "Adding..." : itemId ? "Updating..." : "Creating..."}
                  </span>
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                </>
              ) : (
                isAddImageMode
                  ? "Update Images"
                  : itemId
                    ? "Update Item"
                    : "Create Item"
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Camera Dialog */}
        <CameraDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={handleCameraCapture}
          multiple={true}
        />

        {/* Form Image Slider */}
        <ImageSlider
          images={formImageSliderImages}
          initialIndex={formImageSliderInitialIndex}
          open={formImageSliderOpen}
          onOpenChange={setFormImageSliderOpen}
          itemName="Form Images"
        />
      </DialogContent>
    </Dialog>
  );
}

