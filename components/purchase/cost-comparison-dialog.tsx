"use client";

/**
 * Cost Comparison Dialog Component
 * 
 * Dialog for creating/editing cost comparisons with multiple vendor quotes.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Save, Send, AlertCircle, Package, CheckCircle, Building, Info, ExternalLink } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { VendorCreationForm } from "./vendor-creation-form";
import { LazyImage } from "@/components/ui/lazy-image";
import { ImageSlider } from "@/components/ui/image-slider";
import type { Id } from "@/convex/_generated/dataModel";
import { Edit, Check, X } from "lucide-react";

interface CostComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: Id<"requests">;
}

interface VendorQuote {
  vendorId: Id<"vendors">;
  unitPrice: number;
}

// Common unit suggestions for autocomplete
const UNIT_SUGGESTIONS = [
  "kg", "kgs", "kilogram", "kilograms",
  "g", "gm", "gram", "grams",
  "lb", "lbs", "pound", "pounds",
  "ton", "tons", "tonne", "tonnes",
  "m", "meter", "meters", "metre", "metres",
  "cm", "centimeter", "centimeters",
  "mm", "millimeter", "millimeters",
  "ft", "feet", "foot",
  "inch", "inches", "in",
  "l", "liter", "liters", "litre", "litres",
  "ml", "milliliter", "milliliters",
  "gal", "gallon", "gallons",
  "pcs", "pieces", "piece", "pc",
  "box", "boxes",
  "pack", "packs", "packet", "packets",
  "dozen", "dozens",
  "set", "sets",
  "roll", "rolls",
  "sheet", "sheets",
  "bag", "bags",
  "bottle", "bottles",
  "can", "cans",
  "tube", "tubes",
  "unit", "units",
  "each"
];

export function CostComparisonDialog({
  open,
  onOpenChange,
  requestId,
}: CostComparisonDialogProps) {
  const [vendorQuotes, setVendorQuotes] = useState<VendorQuote[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<Id<"vendors"> | "">("");
  const [unitPrice, setUnitPrice] = useState("");
  const [isDirectDelivery, setIsDirectDelivery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [inventoryInfoOpen, setInventoryInfoOpen] = useState(false);
  const [imageSliderOpen, setImageSliderOpen] = useState(false);
  const [imageSliderImages, setImageSliderImages] = useState<Array<{imageUrl: string; imageKey: string}>>([]);
  const [imageSliderItemName, setImageSliderItemName] = useState("");
  const [imageSliderInitialIndex, setImageSliderInitialIndex] = useState(0);
  const [showDirectDeliveryConfirm, setShowDirectDeliveryConfirm] = useState(false);
  const [isCreatingDirectPO, setIsCreatingDirectPO] = useState(false);

  // Item details edit state
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);

  // Unit autocomplete state
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(-1);

  // Item name autocomplete state
  const [showItemNameSuggestions, setShowItemNameSuggestions] = useState(false);
  const [selectedItemNameIndex, setSelectedItemNameIndex] = useState(-1);

  // Manager review state
  const [selectedFinalVendor, setSelectedFinalVendor] = useState<Id<"vendors"> | "">("");
  const [managerNotes, setManagerNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  
  const userRole = useUserRole();
  const isManager = userRole === ROLES.MANAGER;
  const reviewCC = useMutation(api.costComparisons.reviewCostComparison);

  const request = useQuery(
    api.requests.getRequestById,
    requestId ? { requestId } : "skip"
  );
  const vendors = useQuery(api.vendors.getAllVendors);
  const inventoryItems = useQuery(api.inventory.getAllInventoryItems);

  // Check if item exists in inventory
  const itemInInventory = inventoryItems?.find(
    (item) => item.itemName.toLowerCase() === request?.itemName.toLowerCase()
  );

  // Get smart vendor suggestions based on item in inventory
  const suggestedVendors = vendors?.filter(vendor =>
    itemInInventory?.vendorIds?.includes(vendor._id) || false
  ) || [];

  const otherVendors = vendors?.filter(vendor =>
    !itemInInventory?.vendorIds?.includes(vendor._id) &&
    !vendorQuotes.some(quote => quote.vendorId === vendor._id)
  ) || [];
  const existingCC = useQuery(
    api.costComparisons.getCostComparisonByRequestId,
    requestId ? { requestId } : "skip"
  );
  const upsertCC = useMutation(api.costComparisons.upsertCostComparison);
  const submitCC = useMutation(api.costComparisons.submitCostComparison);
  const resubmitCC = useMutation(api.costComparisons.resubmitCostComparison);
  const updateRequestDetails = useMutation(api.requests.updateRequestDetails);
  const updatePurchaseRequestStatus = useMutation(api.requests.updatePurchaseRequestStatus);

  // Load existing cost comparison
  useEffect(() => {
    if (existingCC && open) {
      setVendorQuotes(
        existingCC.vendorQuotes.map((q) => ({
          vendorId: q.vendorId,
          unitPrice: q.unitPrice,
        }))
      );
      setIsDirectDelivery(existingCC.isDirectDelivery);
      // Reset manager notes when opening
      if (isManager) {
        setManagerNotes("");
      }
    } else if (open && !existingCC) {
      // Reset when opening new
      setVendorQuotes([]);
      setIsDirectDelivery(false);
      if (isManager) {
        setManagerNotes("");
      }
    }
  }, [existingCC, open, isManager]);

  // Initialize edit fields when request loads
  useEffect(() => {
    if (request && open) {
      setEditQuantity(request.quantity.toString());
      setEditUnit(request.unit || "");
      setEditDescription(request.description || "");
      setEditItemName(request.itemName);
    }
  }, [request, open]);

  // Get vendor name by ID
  const getVendorName = (vendorId: Id<"vendors">) => {
    return vendors?.find((v) => v._id === vendorId)?.companyName || "Unknown";
  };

  // Add vendor quote
  const handleAddVendor = () => {
    if (!selectedVendorId || !unitPrice) {
      toast.error("Please select a vendor and enter unit price");
      return;
    }

    const price = parseFloat(unitPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid unit price");
      return;
    }

    if (vendorQuotes.some((q) => q.vendorId === selectedVendorId)) {
      toast.error("This vendor is already added");
      return;
    }

    setVendorQuotes([
      ...vendorQuotes,
      {
        vendorId: selectedVendorId as Id<"vendors">,
        unitPrice: price,
      },
    ]);

    setSelectedVendorId("");
    setUnitPrice("");
    setVendorDialogOpen(false);
  };

  // Remove vendor quote
  const handleRemoveVendor = (vendorId: Id<"vendors">) => {
    setVendorQuotes(vendorQuotes.filter((q) => q.vendorId !== vendorId));
  };

  // Save cost comparison
  const handleSave = async () => {
    if (vendorQuotes.length === 0) {
      toast.error("Please add at least one vendor quote");
      return;
    }

    setIsSaving(true);
    try {
      await upsertCC({
        requestId,
        vendorQuotes,
        isDirectDelivery,
      });
      toast.success("Cost comparison saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit for approval
  const handleSubmit = async () => {
    if (vendorQuotes.length === 0) {
      toast.error("Please add at least one vendor quote");
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingCC?.status === "cc_rejected") {
        await resubmitCC({
          requestId,
          vendorQuotes,
          isDirectDelivery,
        });
        toast.success("Cost comparison resubmitted");
      } else {
        await handleSave();
        await submitCC({ requestId });
        toast.success("Cost comparison submitted");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total
  const calculateTotal = (unitPrice: number) => {
    if (!request) return 0;
    return unitPrice * request.quantity;
  };

  // Item edit handlers
  const handleStartEditItem = () => {
    setIsEditingItem(true);
    setEditQuantity(request?.quantity.toString() || "");
    setEditUnit(request?.unit || "");
    setEditDescription(request?.description || "");
  };

  const handleCancelEditItem = () => {
    setIsEditingItem(false);
    setEditQuantity(request?.quantity.toString() || "");
    setEditUnit(request?.unit || "");
    setEditDescription(request?.description || "");
    setEditItemName(request?.itemName || "");
  };

  const handleSaveItemDetails = async () => {
    if (!request) return;

    const quantity = parseFloat(editQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!editItemName.trim()) {
      toast.error("Please enter an item name");
      return;
    }

    setIsUpdatingItem(true);
    try {
      await updateRequestDetails({
        requestId,
        quantity,
        unit: editUnit.trim() || undefined,
        description: editDescription.trim() || undefined,
        itemName: editItemName.trim(),
      });
      toast.success("Item details updated successfully");
      setIsEditingItem(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update item details");
    } finally {
      setIsUpdatingItem(false);
    }
  };

  // Unit autocomplete handlers
  const getFilteredUnitSuggestions = (input: string) => {
    if (!input.trim()) return UNIT_SUGGESTIONS.slice(0, 8); // Show first 8 when empty
    return UNIT_SUGGESTIONS.filter(unit =>
      unit.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions
  };

  const handleUnitInputChange = (value: string) => {
    setEditUnit(value);
    setShowUnitSuggestions(true);
    setSelectedUnitIndex(-1); // Reset selection when typing
  };

  const handleUnitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const suggestions = getFilteredUnitSuggestions(editUnit);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedUnitIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedUnitIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedUnitIndex >= 0) {
      e.preventDefault();
      setEditUnit(suggestions[selectedUnitIndex]);
      setShowUnitSuggestions(false);
      setSelectedUnitIndex(-1);
    } else if (e.key === 'Escape') {
      setShowUnitSuggestions(false);
      setSelectedUnitIndex(-1);
    }
  };

  const handleUnitSuggestionClick = (suggestion: string) => {
    setEditUnit(suggestion);
    setShowUnitSuggestions(false);
    setSelectedUnitIndex(-1);
  };

  const handleUnitFocus = () => {
    setShowUnitSuggestions(true);
  };

  const handleUnitBlur = () => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => setShowUnitSuggestions(false), 150);
  };

  // Item name autocomplete handlers
  const getFilteredItemNameSuggestions = (input: string) => {
    if (!inventoryItems) return [];
    if (!input.trim()) return inventoryItems.slice(0, 8); // Show first 8 when empty
    return inventoryItems.filter(item =>
      item.itemName.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions
  };

  const handleItemNameInputChange = (value: string) => {
    setEditItemName(value);
    setShowItemNameSuggestions(true);
    setSelectedItemNameIndex(-1); // Reset selection when typing
  };

  const handleItemNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const suggestions = getFilteredItemNameSuggestions(editItemName);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedItemNameIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedItemNameIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedItemNameIndex >= 0) {
      e.preventDefault();
      setEditItemName(suggestions[selectedItemNameIndex].itemName);
      setShowItemNameSuggestions(false);
      setSelectedItemNameIndex(-1);
    } else if (e.key === 'Escape') {
      setShowItemNameSuggestions(false);
      setSelectedItemNameIndex(-1);
    }
  };

  const handleItemNameSuggestionClick = (suggestion: string) => {
    setEditItemName(suggestion);
    setShowItemNameSuggestions(false);
    setSelectedItemNameIndex(-1);
  };

  const handleItemNameFocus = () => {
    setShowItemNameSuggestions(true);
  };

  const handleItemNameBlur = () => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => setShowItemNameSuggestions(false), 150);
  };

  const canEdit = existingCC?.status === "draft" || existingCC?.status === "cc_rejected" || !existingCC;
  const isSubmitted = existingCC?.status === "cc_pending";
  const isManagerReview = isManager && isSubmitted;

  const handleDirectDelivery = async () => {
    if (!request) return;

    setIsCreatingDirectPO(true);
    try {
      // Update request status to delivery_stage for direct PO
      await updatePurchaseRequestStatus({
        requestId: requestId,
        status: "delivery_stage",
      });

      toast.success("Direct Purchase Order created successfully! Item moved to delivery stage.");
      setShowDirectDeliveryConfirm(false);
      onOpenChange(false); // Close the dialog
    } catch (error: any) {
      toast.error(error.message || "Failed to create Direct PO");
    } finally {
      setIsCreatingDirectPO(false);
    }
  };

  const openImageSlider = (images: Array<{imageUrl: string; imageKey: string}>, itemName: string, initialIndex: number = 0) => {
    setImageSliderImages(images);
    setImageSliderItemName(itemName);
    setImageSliderInitialIndex(initialIndex);
    setImageSliderOpen(true);
  };
  
  // Load selected vendor if CC is approved (for manager view)
  useEffect(() => {
    if (existingCC?.selectedVendorId && open && isManager) {
      setSelectedFinalVendor(existingCC.selectedVendorId);
    } else if (open && isManager && !existingCC?.selectedVendorId) {
      setSelectedFinalVendor("");
    }
  }, [existingCC, open, isManager]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">Cost Comparison - {request?.requestNumber}</DialogTitle>
          <DialogDescription className="text-xs">
            {request?.itemName} • {request?.quantity} {request?.unit}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Item Information Card */}
          {request && (
            <div className="p-3 bg-muted/30 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Item Details</h4>
                {canEdit && !isManager && !isEditingItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditItem}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                {isEditingItem && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveItemDetails}
                      disabled={isUpdatingItem}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditItem}
                      disabled={isUpdatingItem}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                {/* Item Name Row - Full Width */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Item:</span>
                    {!isEditingItem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInventoryInfoOpen(true)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        title="View inventory information"
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingItem ? (
                    <div className="relative mt-1">
                      <Input
                        type="text"
                        value={editItemName}
                        onChange={(e) => handleItemNameInputChange(e.target.value)}
                        onKeyDown={handleItemNameKeyDown}
                        onFocus={handleItemNameFocus}
                        onBlur={handleItemNameBlur}
                        placeholder="Enter item name..."
                        className="text-sm"
                        disabled={isUpdatingItem}
                      />
                      {showItemNameSuggestions && getFilteredItemNameSuggestions(editItemName).length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {getFilteredItemNameSuggestions(editItemName).map((item, index) => (
                            <button
                              key={item._id}
                              type="button"
                              onClick={() => handleItemNameSuggestionClick(item.itemName)}
                              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors ${
                                index === selectedItemNameIndex ? 'bg-muted font-medium' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{item.itemName}</span>
                                <span className="text-muted-foreground ml-2">
                                  ({item.centralStock || 0} {item.unit || 'units'})
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium mt-1">{request.itemName}</p>
                  )}
                </div>

                {/* Quantity and Unit Row - 50/50 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    {isEditingItem ? (
                      <Input
                        type="number"
                        min="1"
                        step="any"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="h-7 text-xs mt-1"
                        disabled={isUpdatingItem}
                      />
                    ) : (
                      <p className="font-medium mt-1">{request.quantity}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit:</span>
                    {isEditingItem ? (
                      <div className="relative mt-1">
                        <Input
                          type="text"
                          placeholder="unit"
                          value={editUnit}
                          onChange={(e) => handleUnitInputChange(e.target.value)}
                          onKeyDown={handleUnitKeyDown}
                          onFocus={handleUnitFocus}
                          onBlur={handleUnitBlur}
                          className="h-7 text-xs"
                          disabled={isUpdatingItem}
                        />
                        {showUnitSuggestions && getFilteredUnitSuggestions(editUnit).length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {getFilteredUnitSuggestions(editUnit).map((suggestion, index) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleUnitSuggestionClick(suggestion)}
                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors ${
                                  index === selectedUnitIndex ? 'bg-muted font-medium' : ''
                                }`}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="font-medium mt-1">{request.unit || itemInInventory?.unit || 'units'}</p>
                    )}
                  </div>
                </div>
                {/* Description Row - Full Width */}
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  {isEditingItem ? (
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Enter item description..."
                      className="mt-1 text-xs min-h-[60px]"
                      disabled={isUpdatingItem}
                    />
                  ) : (
                    <p className="text-sm mt-1">{request.description || "No description provided"}</p>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Inventory Alert - Comprehensive single display */}
          {itemInInventory && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="font-medium text-sm text-blue-700 dark:text-blue-300">
                        ✓ Item Available in Inventory
                      </div>
                      {(itemInInventory.centralStock || 0) >= (request?.quantity || 0) && canEdit && !isSubmitted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDirectDeliveryConfirm(true)}
                          className="text-xs h-7"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          Direct PO
                        </Button>
                      )}
                    </div>

                    <div className="text-xs text-blue-600 dark:text-blue-400 space-y-2">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="font-medium">Current Stock:</span>
                          <p className="text-sm font-semibold">{itemInInventory.centralStock || 0} {itemInInventory.unit || 'units'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Required:</span>
                          <p className="text-sm font-semibold">{request?.quantity || 0} {request?.unit || itemInInventory.unit || 'units'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Available After:</span>
                          <p className={`text-sm font-bold ${
                            ((itemInInventory.centralStock || 0) - (request?.quantity || 0)) >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {Math.max(0, (itemInInventory.centralStock || 0) - (request?.quantity || 0))} {itemInInventory.unit || 'units'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-4 text-xs">
                          {itemInInventory.vendorIds && itemInInventory.vendorIds.length > 0 && (
                            <span>
                              <span className="font-medium">Vendors:</span> {itemInInventory.vendorIds.length}
                            </span>
                          )}
                          {itemInInventory.images && itemInInventory.images.length > 0 && (
                            <span>
                              <span className="font-medium">Images:</span> {itemInInventory.images.length}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded ${
                          (itemInInventory.centralStock || 0) >= (request?.quantity || 0)
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {(itemInInventory.centralStock || 0) >= (request?.quantity || 0)
                            ? 'Sufficient Stock'
                            : 'Insufficient Stock'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Notes */}
          {existingCC?.status === "cc_rejected" && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-destructive">Rejected: </span>
                  <span className="text-muted-foreground">{existingCC.managerNotes || "No reason provided."}</span>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Quotes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {isManagerReview ? "Select Final Vendor" : "Vendor Quotes"}
              </Label>
              {canEdit && !isManagerReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVendorDialogOpen(true)}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Vendor Quote
                </Button>
              )}
            </div>
            {vendorQuotes.length > 0 ? (
              isManagerReview ? (
                // Manager view: Radio buttons to select final vendor
                <RadioGroup
                  value={selectedFinalVendor}
                  onValueChange={(value) => setSelectedFinalVendor(value as Id<"vendors">)}
                  className="space-y-2"
                >
                  {vendorQuotes.map((quote) => (
                    <div
                      key={quote.vendorId}
                      className={`p-3 border rounded-lg ${
                        selectedFinalVendor === quote.vendorId
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem
                          value={quote.vendorId}
                          id={`vendor-${quote.vendorId}`}
                          className="mt-1"
                        />
                        <label
                          htmlFor={`vendor-${quote.vendorId}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div>
                            <p className="font-medium text-sm">{getVendorName(quote.vendorId)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ₹{quote.unitPrice.toFixed(2)}/unit • ₹{calculateTotal(quote.unitPrice).toFixed(2)} total
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                // Purchase Officer view: List with remove buttons
                <div className="border rounded-lg divide-y">
                  {vendorQuotes.map((quote) => (
                    <div key={quote.vendorId} className="p-2 flex items-center justify-between hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{getVendorName(quote.vendorId)}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{quote.unitPrice.toFixed(2)}/unit • ₹{calculateTotal(quote.unitPrice).toFixed(2)} total
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVendor(quote.vendorId)}
                          className="h-7 w-7 p-0 shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">
                No vendors added
              </p>
            )}

            {/* Enhanced Vendor Selection Dialog with Tabs */}
            <Dialog open={vendorDialogOpen && canEdit} onOpenChange={(open) => {
              if (canEdit) {
                setVendorDialogOpen(open);
                // Reset form when closing
                if (!open) {
                  setSelectedVendorId("");
                  setUnitPrice("");
                }
              }
            }}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Add Vendor Quote</DialogTitle>
                  <DialogDescription>
                    Select an existing vendor or create a new one for this item quote.
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="existing" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Select Vendor
                    </TabsTrigger>
                    <TabsTrigger value="create" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Vendor
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="existing" className="space-y-4 mt-4">
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {/* Smart Vendor Suggestions */}
                      {suggestedVendors.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <Label className="text-sm font-medium text-green-700 dark:text-green-400">
                              Suggested Vendors (supplied this item before)
                            </Label>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {suggestedVendors.map((vendor) => (
                              <button
                                key={vendor._id}
                                onClick={() => setSelectedVendorId(vendor._id)}
                                className={`p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors ${
                                  selectedVendorId === vendor._id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''
                                }`}
                              >
                                <div className="font-medium text-sm">{vendor.companyName}</div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                  <span>{vendor.email}</span>
                                  {vendor.phone && <span>• {vendor.phone}</span>}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Vendors */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          {suggestedVendors.length > 0 ? 'Other Available Vendors' : 'Available Vendors'}
                        </Label>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                          {otherVendors.map((vendor) => (
                            <button
                              key={vendor._id}
                              onClick={() => setSelectedVendorId(vendor._id)}
                              className={`p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors ${
                                selectedVendorId === vendor._id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''
                              }`}
                            >
                              <div className="font-medium text-sm">{vendor.companyName}</div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                <span>{vendor.email}</span>
                                {vendor.phone && <span>• {vendor.phone}</span>}
                              </div>
                            </button>
                          ))}
                          {otherVendors.length === 0 && suggestedVendors.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <div className="text-sm">No vendors available</div>
                              <div className="text-xs mt-1">Create a new vendor to add quotes</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price Input for selected vendor */}
                    {selectedVendorId && (
                      <div className="space-y-3 border-t pt-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Unit Price (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(e.target.value)}
                            placeholder="0.00"
                            className="text-sm"
                          />
                          {request && unitPrice && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>Total: ₹{(parseFloat(unitPrice) * request.quantity).toFixed(2)}</span>
                              <span>•</span>
                              <span>Unit: {request.unit || itemInInventory?.unit || 'units'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="create" className="mt-4">
                    <VendorCreationForm
                      onVendorCreated={(vendorId) => {
                        setSelectedVendorId(vendorId);
                        toast.success("Vendor created! Now add the price.");
                        // Switch back to existing tab
                        const tabTrigger = document.querySelector('[value="existing"]') as HTMLElement;
                        if (tabTrigger) tabTrigger.click();
                      }}
                      onCancel={() => {
                        // Switch back to existing tab
                        const tabTrigger = document.querySelector('[value="existing"]') as HTMLElement;
                        if (tabTrigger) tabTrigger.click();
                      }}
                      itemName={request?.itemName}
                    />
                  </TabsContent>
                </Tabs>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setVendorDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddVendor}
                    disabled={!selectedVendorId || !unitPrice}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Quote
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Inventory Information Dialog */}
            <Dialog open={inventoryInfoOpen} onOpenChange={setInventoryInfoOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Inventory Information
                  </DialogTitle>
                  <DialogDescription>
                    Details for "{request?.itemName}"
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {itemInInventory ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Item exists in inventory</span>
                      </div>

                      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Central Stock:</span>
                            <p className="font-medium">{itemInInventory.centralStock || 0} {itemInInventory.unit || 'units'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Unit:</span>
                            <p className="font-medium">{itemInInventory.unit || 'Not specified'}</p>
                          </div>
                        </div>

                        {itemInInventory.vendorIds && itemInInventory.vendorIds.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-sm">Associated Vendors:</span>
                            <div className="mt-1 space-y-1">
                              {itemInInventory.vendorIds.map((vendorId) => {
                                const vendor = vendors?.find(v => v._id === vendorId);
                                return vendor ? (
                                  <div key={vendorId} className="flex items-center gap-2 text-sm">
                                    <Building className="h-3 w-3 text-muted-foreground" />
                                    <span>{vendor.companyName}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {itemInInventory.images && itemInInventory.images.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-sm">Images:</span>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {itemInInventory.images.slice(0, 4).map((image, index) => (
                                <div key={image.imageKey} className="relative group">
                                  <button
                                    type="button"
                                    onClick={() => openImageSlider(itemInInventory.images || [], request?.itemName || 'Item', index)}
                                    className="block"
                                  >
                                    <LazyImage
                                      src={image.imageUrl}
                                      alt={`Image ${index + 1}`}
                                      width={60}
                                      height={45}
                                      className="rounded border hover:border-primary transition-colors object-cover"
                                    />
                                  </button>
                                  {index === 3 && itemInInventory.images && itemInInventory.images.length > 4 && (
                                    <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                                      <span className="text-white text-xs font-medium">
                                        +{itemInInventory.images.length - 4}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {itemInInventory.images.length} image{itemInInventory.images.length !== 1 ? 's' : ''} • Click to view
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="text-sm">
                          <p className="font-medium text-blue-700 dark:text-blue-300">Stock Status</p>
                          <p className="text-blue-600 dark:text-blue-400">
                            {(itemInInventory.centralStock || 0) >= (request?.quantity || 0)
                              ? 'Sufficient stock available'
                              : 'Insufficient stock - may need to reorder'
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {(itemInInventory.centralStock || 0)} / {request?.quantity || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Available / Required</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Item not found in inventory</span>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                          This item is not currently in your inventory system.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You may want to add this item to inventory or check if it exists under a different name.
                        </p>
                      </div>

                      <Button
                        onClick={() => {
                          // Navigate to inventory page
                          window.location.href = '/dashboard/inventory';
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Check Inventory
                      </Button>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setInventoryInfoOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Manager Review Actions */}
          {isManagerReview && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label className="text-xs font-medium">Manager Notes / Rejection Reason</Label>
                <Textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Add instructions or reason for rejection..."
                  className="mt-1 text-sm min-h-[80px]"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    setIsReviewing(true);
                    try {
                      await reviewCC({
                        requestId,
                        action: "reject",
                        notes: managerNotes.trim() || undefined,
                      });
                      toast.success("Cost comparison rejected");
                      onOpenChange(false);
                    } catch (error: any) {
                      toast.error(error.message || "Failed to reject");
                    } finally {
                      setIsReviewing(false);
                    }
                  }}
                  disabled={isReviewing}
                  size="sm"
                  className="flex-1"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Reject CC
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedFinalVendor) {
                      toast.error("Please select a final vendor");
                      return;
                    }
                    setIsReviewing(true);
                    try {
                      await reviewCC({
                        requestId,
                        action: "approve",
                        selectedVendorId: selectedFinalVendor as Id<"vendors">,
                        notes: managerNotes.trim() || undefined,
                      });
                      toast.success("Cost comparison approved");
                      onOpenChange(false);
                    } catch (error: any) {
                      toast.error(error.message || "Failed to approve");
                    } finally {
                      setIsReviewing(false);
                    }
                  }}
                  disabled={isReviewing || !selectedFinalVendor}
                  size="sm"
                  className="flex-1"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Approve & Select Vendor
                </Button>
              </div>
            </div>
          )}

          {/* Purchase Officer Actions */}
          {canEdit && !isSubmitted && !isManager && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setVendorDialogOpen(true)}
                className="flex-1"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Vendor
              </Button>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isSubmitting}
                size="sm"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || isSubmitting || vendorQuotes.length === 0}
                size="sm"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {existingCC?.status === "cc_rejected" ? "Resubmit" : "Submit"}
              </Button>
            </div>
          )}

          {isSubmitted && !isManagerReview && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Submitted for manager approval
            </p>
          )}
        </div>
      </DialogContent>

      {/* Image Slider */}
      <ImageSlider
        images={imageSliderImages}
        initialIndex={imageSliderInitialIndex}
        open={imageSliderOpen}
        onOpenChange={setImageSliderOpen}
        itemName={imageSliderItemName}
      />
    </Dialog>

    {/* Direct Delivery Confirmation Dialog */}
    <AlertDialog open={showDirectDeliveryConfirm} onOpenChange={setShowDirectDeliveryConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Confirm Direct Purchase Order
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to create a Direct Purchase Order for this item?</p>
            <div className="bg-muted/50 p-3 rounded-lg space-y-1">
              <p className="font-medium">{request?.itemName}</p>
              <p className="text-sm">Quantity: {request?.quantity} {request?.unit}</p>
              <p className="text-sm text-green-600">Available in inventory: {itemInInventory?.centralStock || 0} {itemInInventory?.unit || 'units'}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              This will skip the regular approval workflow and move the item directly to delivery stage.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCreatingDirectPO}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDirectDelivery}
            disabled={isCreatingDirectPO}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreatingDirectPO ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Create Direct PO
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

