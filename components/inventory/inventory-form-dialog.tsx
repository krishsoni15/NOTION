  ;

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnitInput } from "./unit-input";
import { CameraDialog } from "./camera-dialog";
import { VendorSelector } from "./vendor-selector";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { Camera, Upload, X, Plus, Loader2 } from "lucide-react";
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
    categoryId?: Id<"inventoryCategories">;
    hsnSacCode?: string;
    unit: string;
    centralStock: number;
    vendorId?: Id<"vendors">;
    vendorIds?: Id<"vendors">[];
  } | null;
  mode?: "create" | "edit" | "add-image";
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
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const formInitializedRef = useRef(false);

  // Category inline-create state (now handled by CategoryCombobox)
  const canEdit = (userRole === ROLES.PURCHASE_OFFICER || userRole === ROLES.MANAGER) && !isAddImageMode;
  const canAddImages =
    (userRole === ROLES.PURCHASE_OFFICER && !isAddImageMode) ||
    (userRole === ROLES.SITE_ENGINEER && itemId) ||
    isAddImageMode;
  const canManageImages = canAddImages || (canEdit && itemId);

  const openFormImageSlider = (images: Array<{ imageUrl: string; imageKey: string }>, initialIndex: number) => {
    setFormImageSliderImages(images);
    setFormImageSliderInitialIndex(initialIndex);
    setFormImageSliderOpen(true);
  };

  const [formData, setFormData] = useState({
    itemName: "",
    description: "",
    categoryId: "" as Id<"inventoryCategories"> | "",
    hsnSacCode: "",
    unit: "",
    centralStock: "0",
    vendorIds: [] as Id<"vendors">[],
  });

  useEffect(() => {
    if (!open) {
      formInitializedRef.current = false;
    }
  }, [open, itemId]);

  useEffect(() => {
    if (open && !formInitializedRef.current) {
      if (initialData) {
        setFormData({
          itemName: initialData.itemName,
          description: initialData.description || "",
          categoryId: (initialData as any).categoryId || "",
          hsnSacCode: initialData.hsnSacCode || "",
          unit: initialData.unit,
          centralStock: initialData.centralStock.toString(),
          vendorIds: initialData.vendorIds || (initialData.vendorId ? [initialData.vendorId] : []),
        });
        formInitializedRef.current = true;
      } else if (currentItem) {
        const vendorIds = (currentItem as any).vendorIds ||
          (currentItem.vendorId ? [currentItem.vendorId] : []);
        setFormData({
          itemName: currentItem.itemName,
          description: currentItem.description || "",
          categoryId: (currentItem as any).categoryId || "",
          hsnSacCode: (currentItem as any).hsnSacCode || "",
          unit: currentItem.unit ?? "",
          centralStock: (currentItem.centralStock || 0).toString(),
          vendorIds,
        });
        formInitializedRef.current = true;
      } else if (!itemId && mode === "create") {
        formInitializedRef.current = true;
      }
    }
  }, [initialData, currentItem, open, itemId, mode]);

  useEffect(() => {
    if (currentItem && currentItem.images) {
      if (currentItem.images.length > 0) {
        setExistingImages(currentItem.images);
        setImagePreviews(currentItem.images.map((img: any) => img.imageUrl));
      } else {
        setExistingImages([]);
      }
    }
  }, [currentItem, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({ itemName: "", description: "", categoryId: "", hsnSacCode: "", unit: "", centralStock: "0", vendorIds: [] });
      setSelectedImages([]);
      setImagePreviews([]);
      setExistingImages([]);
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleCameraCapture = (file: File) => {
    setSelectedImages((prev) => [...prev, file]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) setImagePreviews((prev) => [...prev, result]);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length === 0) { toast.error("Please select image files only"); return; }
    if (validFiles.length !== newFiles.length) toast.warning(`${newFiles.length - validFiles.length} non-image files were skipped`);
    setSelectedImages((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeNewImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageKey: string, imageUrl: string) => {
    if (!itemId) return;
    try {
      const response = await fetch(`/api/delete/image?key=${encodeURIComponent(imageKey)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete image");
      setExistingImages((prev) => prev.filter((img) => img.imageKey !== imageKey));
      setImagePreviews((prev) => prev.filter((url) => url !== imageUrl));
      toast.success("Image removed successfully");
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const uploadImages = async (itemId: string) => {
    const uploadPromises = selectedImages.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemId", itemId);
      const response = await fetch("/api/upload/image", { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errorData.error || "Failed to upload image");
      }
      const data = await response.json();
      if (!data.imageUrl || !data.imageKey) throw new Error("Invalid response from upload API");
      return { imageUrl: data.imageUrl, imageKey: data.imageKey };
    });
    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!isAddImageMode && canEdit) {
      if (!formData.itemName.trim()) { setError("Item name is required"); setIsLoading(false); return; }
      if (!formData.description.trim()) { setError("Description is required"); setIsLoading(false); return; }
      const stockValue = parseFloat(formData.centralStock);
      if (isNaN(stockValue) || stockValue < 0) { setError("Central stock must be 0 or greater"); setIsLoading(false); return; }
      if (!formData.hsnSacCode.trim()) { setError("HSN / SAC Code is required"); setIsLoading(false); return; }
      if (!formData.unit.trim()) { setError("Unit is required"); setIsLoading(false); return; }
    }

    try {
      if (isAddImageMode && itemId) {
        if (selectedImages.length === 0) { setError("Please select at least one image"); setIsLoading(false); return; }
        setIsUploading(true);
        try {
          const imageData = await uploadImages(itemId);
          for (const img of imageData) {
            await addImage({ itemId, imageUrl: img.imageUrl, imageKey: img.imageKey });
          }
          toast.success(`${imageData.length} image(s) added successfully`);
          setSelectedImages([]);
          setImagePreviews([]);
          setExistingImages([]);
          handleOpenChange(false);
        } catch (uploadError) {
          const errorMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload images";
          setError(errorMessage);
          toast.error(errorMessage);
          setIsUploading(false);
        }
      } else if (itemId && canEdit) {
        await updateItem({
          itemId,
          itemName: formData.itemName,
          description: formData.description,
          categoryId: formData.categoryId ? formData.categoryId as Id<"inventoryCategories"> : undefined,
          hsnSacCode: formData.hsnSacCode,
          unit: formData.unit || undefined,
          centralStock: parseFloat(formData.centralStock),
          vendorIds: formData.vendorIds.length > 0 ? formData.vendorIds : undefined,
        });
        if (selectedImages.length > 0) {
          setIsUploading(true);
          try {
            const imageData = await uploadImages(itemId);
            for (const img of imageData) {
              await addImage({ itemId, imageUrl: img.imageUrl, imageKey: img.imageKey });
            }
          } catch {
            toast.warning("Item updated but some images failed to upload");
          }
        }
        toast.success("Inventory item updated successfully");
        handleOpenChange(false);
      } else if (canEdit) {
        const newItemId = await createItem({
          itemName: formData.itemName,
          description: formData.description,
          categoryId: formData.categoryId ? formData.categoryId as Id<"inventoryCategories"> : undefined,
          hsnSacCode: formData.hsnSacCode,
          unit: formData.unit || undefined,
          centralStock: parseFloat(formData.centralStock),
          vendorIds: formData.vendorIds.length > 0 ? formData.vendorIds : undefined,
        });
        if (selectedImages.length > 0) {
          setIsUploading(true);
          try {
            const imageData = await uploadImages(newItemId);
            for (const img of imageData) {
              await addImage({ itemId: newItemId, imageUrl: img.imageUrl, imageKey: img.imageKey });
            }
          } catch {
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
        <DialogHeader>
          <DialogTitle>
            {isAddImageMode ? "Manage Images" : itemId ? "Edit Inventory Item" : "Add New Inventory Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {!isAddImageMode && (
            <>
              {/* Item Name + HSN */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name *</Label>
                  <Input
                    id="itemName"
                    placeholder="Enter item name"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    required
                    disabled={isLoading || !canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hsnSacCode">HSN / SAC Code *</Label>
                  <Input
                    id="hsnSacCode"
                    placeholder="Enter HSN/SAC code"
                    value={formData.hsnSacCode}
                    onChange={(e) => setFormData({ ...formData, hsnSacCode: e.target.value })}
                    disabled={isLoading || !canEdit}
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <CategoryCombobox
                  value={formData.categoryId}
                  onChange={(v) => setFormData({ ...formData, categoryId: v as Id<"inventoryCategories"> })}
                  disabled={isLoading || !canEdit}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter item description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  disabled={isLoading || !canEdit}
                />
              </div>

              {/* Stock + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="centralStock">Central Stock *</Label>
                  <Input
                    id="centralStock"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={formData.centralStock}
                    onChange={(e) => setFormData({ ...formData, centralStock: e.target.value })}
                    disabled={isLoading || !canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <UnitInput
                    id="unit"
                    value={formData.unit}
                    onChange={(value) => setFormData({ ...formData, unit: value })}
                    disabled={isLoading || !canEdit}
                  />
                </div>
              </div>

              {/* Vendors */}
              <div className="space-y-2">
                <Label>Vendors <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <VendorSelector
                  selectedVendors={formData.vendorIds}
                  onSelectionChange={(vendorIds) => setFormData({ ...formData, vendorIds })}
                  disabled={isLoading || !canEdit}
                />
              </div>
            </>
          )}

          {/* Image Upload Section */}
          {(canAddImages || (canEdit && itemId)) && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Item Photo <span className="normal-case font-normal text-muted-foreground">(optional)</span>
              </Label>
              <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e.target.files)} multiple />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCameraOpen(true)} disabled={isLoading || isUploading} className="flex-1 h-9 text-xs gap-1.5">
                  <Camera className="h-3.5 w-3.5" />Camera
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => uploadInputRef.current?.click()} disabled={isLoading || isUploading} className="flex-1 h-9 text-xs gap-1.5">
                  <Upload className="h-3.5 w-3.5" />Upload
                </Button>
              </div>

              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {existingImages.map((image, index) => (
                    <div key={`existing-${image.imageKey}`} className="relative group aspect-square">
                      <button type="button" onClick={() => openFormImageSlider(existingImages, index)} className="block w-full h-full">
                        <img src={image.imageUrl} alt={`Existing ${index + 1}`} className="w-full h-full object-cover rounded-md border border-border" />
                      </button>
                      {canManageImages && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeExistingImage(image.imageKey, image.imageUrl); }}
                          className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {imagePreviews.slice(existingImages.length).map((preview, index) => (
                    <div key={`new-${index}`} className="relative group aspect-square">
                      <button type="button" onClick={() => openFormImageSlider(imagePreviews.map((url, i) => ({ imageUrl: url, imageKey: `preview-${i}` })), existingImages.length + index)} className="block w-full h-full">
                        <img src={preview} alt={`New ${index + 1}`} className="w-full h-full object-cover rounded-md border border-border" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeNewImage(existingImages.length + index); }}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading || isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading || isUploading ? (
                <>
                  <span className="mr-2">{isUploading ? "Uploading..." : isAddImageMode ? "Adding..." : itemId ? "Updating..." : "Creating..."}</span>
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                </>
              ) : (
                isAddImageMode ? "Update Images" : itemId ? "Update Item" : "Create Item"
              )}
            </Button>
          </DialogFooter>
        </form>

        <CameraDialog open={cameraOpen} onOpenChange={setCameraOpen} onCapture={handleCameraCapture} multiple={true} />
        <ImageSlider images={formImageSliderImages} initialIndex={formImageSliderInitialIndex} open={formImageSliderOpen} onOpenChange={setFormImageSliderOpen} itemName="Form Images" />
      </DialogContent>
    </Dialog>
  );
}
