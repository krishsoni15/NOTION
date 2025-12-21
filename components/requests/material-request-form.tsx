"use client";

/**
 * Material Request Form Component
 * 
 * Dialog form for creating new material requests by site engineers.
 * Includes site selection, item autocomplete, date picker, photo upload, etc.
 */

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { CameraDialog } from "@/components/inventory/camera-dialog";
import { Camera, Upload, X, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface MaterialRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialRequestForm({
  open,
  onOpenChange,
}: MaterialRequestFormProps) {
  const createRequest = useMutation(api.requests.createMaterialRequest);
  const assignedSites = useQuery(api.requests.getUserAssignedSites);
  const inventoryItems = useQuery(
    api.requests.getInventoryItemsForAutocomplete,
    {}
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [quantityInput, setQuantityInput] = useState("");
  const [showQuantitySuggestions, setShowQuantitySuggestions] = useState(false);
  const [selectedItemFromInventory, setSelectedItemFromInventory] = useState<{ itemName: string; unit: string; centralStock?: number } | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    siteId: "" as Id<"sites"> | "",
    itemName: "",
    description: "",
    quantity: 0,
    unit: "",
    requiredBy: null as Date | null,
    isUrgent: false,
    notes: "",
  });

  // Filter inventory items based on search query
  const filteredInventoryItems = inventoryItems?.filter((item) =>
    item.itemName.toLowerCase().includes(itemSearchQuery.toLowerCase())
  ) || [];

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        siteId: "" as Id<"sites"> | "",
        itemName: "",
        description: "",
        quantity: 0,
        unit: "",
        requiredBy: null,
        isUrgent: false,
        notes: "",
      });
      setItemSearchQuery("");
      setQuantityInput("");
      setSelectedImages([]);
      setImagePreviews([]);
      setError("");
      setSelectedItemFromInventory(null);
    }
  }, [open]);

  // Common units for suggestions
  const COMMON_UNITS = [
    "bags", "kg", "g", "gm", "ton", "mm", "cm", "m", "km",
    "nos", "pieces", "pcs", "liters", "l", "ml", "sqft", "sqm",
    "cft", "cum", "boxes", "cartons", "bundles", "rolls", "sheets", "units",
  ];

  // Get related units based on selected item's unit
  const getRelatedUnits = (itemUnit: string): string[] => {
    if (!itemUnit) return [];
    
    // Clean the unit first - remove any numbers
    const cleanedUnit = itemUnit.replace(/\d+/g, '').trim();
    if (!cleanedUnit) return [];
    
    const unit = cleanedUnit.toLowerCase();
    
    // Weight units
    if (unit === "kg" || unit === "kilogram" || unit === "kilograms") {
      return ["kg", "gm", "g", "ton", "quintal"];
    }
    if (unit === "g" || unit === "gm" || unit === "gram" || unit === "grams") {
      return ["g", "gm", "kg"];
    }
    if (unit === "ton" || unit === "tonne") {
      return ["ton", "kg", "quintal"];
    }
    
    // Length units
    if (unit === "m" || unit === "meter" || unit === "metre" || unit === "meters") {
      return ["m", "cm", "mm", "km", "ft", "inch"];
    }
    if (unit === "cm" || unit === "centimeter" || unit === "centimetre") {
      return ["cm", "mm", "m", "inch"];
    }
    if (unit === "mm" || unit === "millimeter" || unit === "millimetre") {
      return ["mm", "cm", "m"];
    }
    if (unit === "ft" || unit === "feet" || unit === "foot") {
      return ["ft", "inch", "m", "cm"];
    }
    
    // Volume units
    if (unit === "l" || unit === "liter" || unit === "litre" || unit === "liters") {
      return ["l", "ml", "cft", "cum"];
    }
    if (unit === "ml" || unit === "milliliter" || unit === "millilitre") {
      return ["ml", "l"];
    }
    if (unit === "cft" || unit === "cubic feet") {
      return ["cft", "cum", "l"];
    }
    if (unit === "cum" || unit === "cubic meter" || unit === "cubic metre") {
      return ["cum", "cft", "l"];
    }
    
    // Area units
    if (unit === "sqft" || unit === "square feet" || unit === "sq ft") {
      return ["sqft", "sqm", "acre"];
    }
    if (unit === "sqm" || unit === "square meter" || unit === "square metre") {
      return ["sqm", "sqft", "acre"];
    }
    
    // Count units
    if (unit === "nos" || unit === "number" || unit === "numbers") {
      return ["nos", "pcs", "pieces", "units"];
    }
    if (unit === "pcs" || unit === "pieces" || unit === "piece") {
      return ["pcs", "pieces", "nos", "units"];
    }
    if (unit === "units" || unit === "unit") {
      return ["units", "nos", "pcs", "pieces"];
    }
    
    // Container units
    if (unit === "bags" || unit === "bag") {
      return ["bags", "kg", "ton"];
    }
    if (unit === "boxes" || unit === "box") {
      return ["boxes", "cartons", "nos", "pcs"];
    }
    if (unit === "cartons" || unit === "carton") {
      return ["cartons", "boxes", "nos"];
    }
    if (unit === "bundles" || unit === "bundle") {
      return ["bundles", "nos", "pcs"];
    }
    if (unit === "rolls" || unit === "roll") {
      return ["rolls", "nos", "m", "ft"];
    }
    if (unit === "sheets" || unit === "sheet") {
      return ["sheets", "nos", "sqft", "sqm"];
    }
    
    // If no match, return the unit itself and common alternatives
    return [unit, ...COMMON_UNITS.filter(u => u !== unit).slice(0, 5)];
  };

  // Generate quantity+unit suggestions
  const generateQuantitySuggestions = (input: string): string[] => {
    // Extract ONLY the first number from input - completely ignore any other numbers
    const trimmedInput = input.trim();
    
    // Match only the first number at the start - stop at first space or non-digit after number
    const firstNumberMatch = trimmedInput.match(/^(\d+(?:\.\d+)?)/);
    if (firstNumberMatch) {
      // Only use the first number (completely ignore stock numbers like 233)
      const number = firstNumberMatch[1];
      const numberValue = parseFloat(number);
      
      // Get everything after the first number
      const afterNumber = trimmedInput.substring(firstNumberMatch[0].length).trim();
      
      // Extract unit part - only take letters/text, completely ignore any numbers
      // Remove any numbers (like stock numbers) that might be in the text
      const unitPart = afterNumber.replace(/\d+/g, '').trim().toLowerCase();
      
      // Get selected item's unit - only if item was selected from inventory
      // Unit is already cleaned when item is selected, but clean again to be safe
      const selectedItemUnit = selectedItemFromInventory?.unit 
        ? selectedItemFromInventory.unit.replace(/\d+/g, '').trim().toLowerCase() 
        : "";
      const relatedUnits = selectedItemUnit ? getRelatedUnits(selectedItemUnit) : [];
      
      if (unitPart.length === 0) {
        // If just a number, suggest units based on selected item
        if (relatedUnits.length > 0) {
          // Show related units first, then some common ones
          const suggestions = [
            ...relatedUnits.slice(0, 6),
            ...COMMON_UNITS.filter(u => !relatedUnits.includes(u)).slice(0, 3)
          ];
          return suggestions.map(unit => `${number} ${unit}`);
        }
        
        // Fallback to smart units if no item selected
        const smartUnits = numberValue < 100 
          ? ["g", "gm", "ml", "mm", "cm", "nos", "pcs", "pieces", "units"]
          : numberValue < 1000
          ? ["kg", "l", "m", "bags", "boxes", "bundles", "rolls", "sheets"]
          : ["cartons", "boxes", "bags", "ton", "kg", "cft", "cum", "sqft", "sqm"];
        return smartUnits.map(unit => `${number} ${unit}`);
      } else {
        // Filter units matching the typed text, prioritizing related units
        const allUnits = relatedUnits.length > 0 
          ? [...relatedUnits, ...COMMON_UNITS.filter(u => !relatedUnits.includes(u))]
          : COMMON_UNITS;
        
        const exactMatches = allUnits.filter(unit =>
          unit.toLowerCase() === unitPart
        );
        const startsWithMatches = allUnits.filter(unit =>
          unit.toLowerCase().startsWith(unitPart) && unit.toLowerCase() !== unitPart
        );
        const containsMatches = allUnits.filter(unit =>
          unit.toLowerCase().includes(unitPart) && 
          !unit.toLowerCase().startsWith(unitPart) &&
          unit.toLowerCase() !== unitPart
        );
        
        // Prioritize related units in matches
        const prioritizeRelated = (matches: string[]) => {
          const related = matches.filter(u => relatedUnits.includes(u));
          const others = matches.filter(u => !relatedUnits.includes(u));
          return [...related, ...others];
        };
        
        const allMatches = prioritizeRelated([...exactMatches, ...startsWithMatches, ...containsMatches]);
        
        if (allMatches.length > 0) {
          return allMatches.map(unit => `${number} ${unit}`);
        }
      }
    }
    return [];
  };

  // Parse quantity input to extract quantity and unit
  const parseQuantityInput = (input: string): { quantity: number; unit: string } => {
    // Only parse the first number as quantity, ignore any stock numbers
    const trimmedInput = input.trim();
    
    // Match only the first number
    const firstNumberMatch = trimmedInput.match(/^(\d+(?:\.\d+)?)/);
    if (firstNumberMatch) {
      const quantity = parseFloat(firstNumberMatch[1]) || 0;
      
      // Get everything after the first number
      const afterNumber = trimmedInput.substring(firstNumberMatch[0].length).trim();
      
      // Extract unit - remove any numbers (like stock numbers) and take only text
      const unit = afterNumber.replace(/\d+/g, '').trim();
      
      return {
        quantity,
        unit,
      };
    }
    return { quantity: 0, unit: "" };
  };

  // Handle quantity input change
  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuantityInput(value);
    
    const parsed = parseQuantityInput(value);
    setFormData((prev) => ({
      ...prev,
      quantity: parsed.quantity,
      unit: parsed.unit,
    }));
    
    setShowQuantitySuggestions(value.length > 0);
  };

  // Handle quantity suggestion select
  const handleQuantitySelect = (suggestion: string) => {
    setQuantityInput(suggestion);
    const parsed = parseQuantityInput(suggestion);
    setFormData((prev) => ({
      ...prev,
      quantity: parsed.quantity,
      unit: parsed.unit,
    }));
    setShowQuantitySuggestions(false);
    quantityInputRef.current?.blur();
  };

  // Close quantity suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        quantityInputRef.current &&
        !quantityInputRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement)?.closest('[data-quantity-suggestions]')
      ) {
        setShowQuantitySuggestions(false);
      }
    };

    if (showQuantitySuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showQuantitySuggestions]);

  // Handle camera capture
  const handleCameraCapture = (file: File) => {
    setSelectedImages((prev) => [...prev, file]);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews((prev) => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  };

  // Handle file selection
  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length === 0) {
      toast.error("Please select image files only");
      return;
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

  // Remove image
  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload images to R2
  const uploadImages = async (): Promise<{
    imageUrl: string;
    imageKey: string;
  } | null> => {
    if (selectedImages.length === 0) {
      return null;
    }

    setIsUploading(true);
    try {
      // Upload first image only (single photo per request)
      const file = selectedImages[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemId", "request-photo"); // Placeholder for request photos

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Upload failed",
        }));
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
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.siteId) {
      setError("Please select a site location");
      return;
    }
    if (!formData.itemName.trim()) {
      setError("Please enter an item name");
      return;
    }
    // Description is optional, no validation needed
    const parsedQuantity = parseQuantityInput(quantityInput);
    if (parsedQuantity.quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }
    if (!parsedQuantity.unit.trim()) {
      setError("Please enter quantity with unit (e.g., 10 bags)");
      return;
    }
    if (!formData.requiredBy) {
      setError("Please select a required date");
      return;
    }

    setIsLoading(true);

    try {
      // Upload photo if available
      let photo = null;
      if (selectedImages.length > 0) {
        photo = await uploadImages();
      }

      // Parse quantity and unit from input
      const parsedQuantity = parseQuantityInput(quantityInput);
      
      // Create request
      await createRequest({
        siteId: formData.siteId as Id<"sites">,
        itemName: formData.itemName.trim(),
        description: formData.description.trim() || "",
        specsBrand: undefined,
        quantity: parsedQuantity.quantity,
        unit: parsedQuantity.unit.trim(),
        requiredBy: formData.requiredBy.getTime(),
        isUrgent: formData.isUrgent,
        photo: photo || undefined,
        notes: formData.notes.trim() || undefined,
      });

      toast.success("Material request created successfully");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating request:", err);
      setError(err.message || "Failed to create request");
      toast.error(err.message || "Failed to create request");
    } finally {
      setIsLoading(false);
    }
  };

  // Clean unit - remove any numbers from unit string (e.g., "22 kg" -> "kg")
  const cleanUnit = (unit: string): string => {
    if (!unit) return "";
    // Remove all numbers and extra spaces, keep only letters
    return unit.replace(/\d+/g, '').trim();
  };

  // Handle item selection from autocomplete
  const handleItemSelect = (item: { itemName: string; unit?: string; centralStock?: number }) => {
    // Clean the unit to remove any numbers (e.g., "22 kg" -> "kg")
    const cleanedUnit = cleanUnit(item.unit || "");
    
    // Mark that item was selected from inventory (with stock info)
    setSelectedItemFromInventory({
      itemName: item.itemName,
      unit: cleanedUnit,
      centralStock: item.centralStock || 0,
    });
    
    setFormData((prev) => ({
      ...prev,
      itemName: item.itemName,
      unit: cleanedUnit || prev.unit || "",
    }));
    setItemSearchQuery(item.itemName);
    setShowItemSuggestions(false);
    itemInputRef.current?.blur();
    
    // Do NOT auto-fill quantity - let user type manually
    // Only store the cleaned unit in formData for suggestions
    if (cleanedUnit) {
      setFormData((prev) => ({
        ...prev,
        unit: cleanedUnit,
      }));
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        itemInputRef.current &&
        !itemInputRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement)?.closest('[data-item-suggestions]')
      ) {
        setShowItemSuggestions(false);
      }
    };

    if (showItemSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showItemSuggestions]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <VisuallyHidden>
              <DialogTitle>New Material Request</DialogTitle>
            </VisuallyHidden>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Site Location */}
            <div className="space-y-2">
              <Label htmlFor="siteId">
                Site Location <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.siteId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, siteId: value as Id<"sites"> }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="siteId">
                  <SelectValue placeholder="Select site location" />
                </SelectTrigger>
                <SelectContent>
                  {assignedSites && assignedSites.length > 0 ? (
                    assignedSites
                      .filter((site): site is NonNullable<typeof site> => site !== null)
                      .map((site) => (
                        <SelectItem key={site._id} value={site._id}>
                          {site.name}
                          {site.code && ` (${site.code})`}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no-sites" disabled>
                      No sites assigned
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {assignedSites && assignedSites.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  You don't have any assigned sites. Contact your manager.
                </p>
              )}
            </div>

            {/* Item Name with Autocomplete */}
            <div className="space-y-2">
              <Label htmlFor="itemName">
                Select Item <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="itemName"
                  ref={itemInputRef}
                  value={itemSearchQuery}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      itemName: e.target.value,
                    }));
                    setShowItemSuggestions(true);
                    // If user is typing (not selecting from inventory), clear selected item
                    if (e.target.value !== selectedItemFromInventory?.itemName) {
                      setSelectedItemFromInventory(null);
                    }
                  }}
                  onFocus={() => setShowItemSuggestions(true)}
                  placeholder="Start typing..."
                  disabled={isLoading}
                  className="w-full"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                {showItemSuggestions &&
                  filteredInventoryItems.length > 0 &&
                  itemSearchQuery.length > 0 && (
                    <div
                      data-item-suggestions
                      className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto"
                    >
                      {filteredInventoryItems.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => handleItemSelect(item)}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          {item.itemName}
                          {item.unit && (
                            <span className="text-muted-foreground ml-2">
                              ({item.unit})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter item description"
                disabled={isLoading}
                rows={2}
                className="min-h-[60px]"
              />
            </div>

            {/* Quantity with Unit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="quantity">
                  Quantity <span className="text-destructive">*</span>
                </Label>
                {selectedItemFromInventory && selectedItemFromInventory.centralStock !== undefined && quantityInput.trim() && (
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const parsed = parseQuantityInput(quantityInput);
                      const requestedQty = parsed.quantity || 0;
                      const availableStock = selectedItemFromInventory.centralStock || 0;
                      
                      if (requestedQty > 0) {
                        if (requestedQty <= availableStock) {
                          return (
                            <span className="text-green-600 dark:text-green-400">
                              {requestedQty} out of {availableStock} available
                            </span>
                          );
                        } else {
                          const restNeeded = requestedQty - availableStock;
                          return (
                            <span className="text-orange-600 dark:text-orange-400">
                              {requestedQty} out of {availableStock} • Need to order {restNeeded} more
                            </span>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  id="quantity"
                  ref={quantityInputRef}
                  type="text"
                  value={quantityInput}
                  onChange={handleQuantityInputChange}
                  onFocus={() => {
                    setShowQuantitySuggestions(true);
                  }}
                  placeholder="e.g., 10 bags, 5 kg, 20 nos"
                  disabled={isLoading}
                  className="w-full"
                />
                {showQuantitySuggestions && (
                  <div
                    data-quantity-suggestions
                    className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto"
                  >
                    <div className="p-1">
                      {generateQuantitySuggestions(quantityInput).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleQuantitySelect(suggestion)}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Required By Date */}
            <div className="space-y-2">
              <Label>
                Required By <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={formData.requiredBy}
                onChange={(date) =>
                  setFormData((prev) => ({ ...prev, requiredBy: date }))
                }
                placeholder="DD/MM/YYYY"
                disabled={isLoading}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Any additional details..."
                disabled={isLoading}
                rows={2}
                className="min-h-[60px]"
              />
            </div>

            {/* Photo Upload & Urgent */}
            <div className="space-y-3">
              <Label>Photo (Optional)</Label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex gap-2 flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="flex-1 sm:flex-initial"
                    size="sm"
                  >
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Choose File</span>
                    <span className="sm:hidden">File</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCameraOpen(true)}
                    disabled={isLoading || isUploading}
                    className="flex-1 sm:flex-initial"
                    size="sm"
                  >
                    <Camera className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Camera</span>
                    <span className="sm:hidden">📷</span>
                  </Button>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    multiple={false}
                    onChange={(e) => handleImageSelect(e.target.files)}
                    className="hidden"
                  />
                </div>
                {/* Mark as Urgent - on right side same row */}
                <div className="flex items-center space-x-2 sm:ml-auto">
                  <Checkbox
                    id="isUrgent"
                    checked={formData.isUrgent}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        isUrgent: checked === true,
                      }))
                    }
                    disabled={isLoading}
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor="isUrgent"
                    className="text-sm font-semibold cursor-pointer"
                  >
                    Mark as Urgent
                  </Label>
                </div>
              </div>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 sm:h-40 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => removeImage(index)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || isUploading}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || isUploading}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isLoading || isUploading ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CameraDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCameraCapture}
        multiple={false}
      />
    </>
  );
}

